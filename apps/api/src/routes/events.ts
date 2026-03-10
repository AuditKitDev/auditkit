import { createHmac } from 'crypto';
import { Hono } from 'hono';
import { eq, and, desc, gte, lt, ilike, sql, or } from 'drizzle-orm';
import { requireScope, type AuthContext } from '../middleware/auth.js';
import { auditEvents, tenants } from '../db/schema.js';
import { computeRowHash, insertEventAtomically, tenantLockKey } from '../services/hash-chain.js';
import { detectAnomalies } from '../services/anomaly.js';
import { validateEventInput } from '@auditkit/shared';
import type { Database } from '../db/index.js';
import { eventBus } from '../services/event-bus.js';
import { enrichEventWithRegion } from '../services/data-residency.js';
import { loadRedactionRules, redactEvent } from '../services/pii-redaction.js';
import { signEvent } from '../services/event-signing.js';
import { batchEventsIntoMerkleTree } from '../services/merkle.js';
import { parseNaturalLanguageQuery } from '../services/nlp-search.js';
import { logger } from '../services/logger.js';
import {
  enqueueWebhookDelivery,
  enqueueSIEMStream,
  enqueueNotification,
  enqueueAnomalyDetection,
} from '../services/event-queue.js';

// Track event count per project for Merkle tree batching
const eventCounters = new Map<string, number>();
const MERKLE_BATCH_SIZE = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CURSOR_SECRET = process.env.CURSOR_SECRET || 'auditkit-cursor-default-key';

function signCursor(id: number): string {
  const payload = String(id);
  const sig = createHmac('sha256', CURSOR_SECRET).update(payload).digest('hex').slice(0, 16);
  return Buffer.from(`${payload}:${sig}`).toString('base64');
}

function verifyCursor(cursor: string): number | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString();
    const [payload, sig] = decoded.split(':');
    const expected = createHmac('sha256', CURSOR_SECRET).update(payload).digest('hex').slice(0, 16);
    if (sig !== expected) return null;
    return Number(payload);
  } catch { return null; }
}

export function createEventsRouter(db: Database) {
  const router = new Hono<{ Variables: { auth: AuthContext } }>();

  // ==========================================
  // POST /v1/events — Log a single event
  // ==========================================
  router.post('/', requireScope('write'), async (c) => {
    const auth = c.get('auth');
    const body = await c.req.json();

    // Validate event input
    const validationErrors = validateEventInput(body);
    if (validationErrors.length > 0) {
      return c.json({ code: 'INVALID_INPUT', message: validationErrors[0].message, errors: validationErrors }, 400);
    }

    // Resolve tenant
    let tenantId: string;
    if (body.tenant_id) {
      // Look up or auto-create tenant
      const existing = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(
          and(eq(tenants.projectId, auth.projectId), eq(tenants.externalId, body.tenant_id))
        )
        .limit(1);

      if (existing.length > 0) {
        tenantId = existing[0].id;
      } else {
        const created = await db
          .insert(tenants)
          .values({
            projectId: auth.projectId,
            externalId: body.tenant_id,
            name: body.tenant_id,
          })
          .returning({ id: tenants.id });
        tenantId = created[0].id;
      }
    } else {
      return c.json({ code: 'MISSING_TENANT', message: 'tenant_id is required' }, 400);
    }

    // Check idempotency
    if (body.idempotency_key) {
      const existing = await db
        .select({ eventId: auditEvents.eventId, rowHash: auditEvents.rowHash })
        .from(auditEvents)
        .where(and(eq(auditEvents.idempotencyKey, body.idempotency_key), eq(auditEvents.projectId, auth.projectId)))
        .limit(1);

      if (existing.length > 0) {
        return c.json({
          id: existing[0].eventId,
          event_id: existing[0].eventId,
          action: body.action,
          row_hash: existing[0].rowHash,
          ingested_at: new Date().toISOString(),
          deduplicated: true,
        });
      }
    }

    const occurredAt = body.occurred_at ? new Date(body.occurred_at) : new Date();

    // Apply PII redaction before storage
    const redactionRulesList = await loadRedactionRules(db, auth.projectId);
    const redacted = redactionRulesList.length > 0 ? redactEvent(body, redactionRulesList) : body;

    // Enrich event with data residency region
    const residency = await enrichEventWithRegion(
      db,
      auth.projectId,
      (redacted.metadata as Record<string, unknown>) ?? {}
    );

    const sourceIp = (redacted.context as Record<string, unknown>)?.ip as string ?? c.req.header('x-forwarded-for')?.split(',')[0] ?? null;

    // Atomically insert the event with hash chain integrity (advisory lock + transaction)
    const { id: eventDbId, eventId: eventUuid, ingestedAt, rowHash } = await insertEventAtomically(
      db,
      {
        projectId: auth.projectId,
        tenantId,
        environment: auth.environment,
        action: redacted.action as string,
        category: (redacted.category as string) ?? null,
        description: (redacted.description as string) ?? null,
        severity: (redacted.severity as string) ?? 'info',
        actorId: (redacted.actor as Record<string, unknown>)?.id as string,
        actorType: ((redacted.actor as Record<string, unknown>)?.type as string) ?? 'user',
        actorName: ((redacted.actor as Record<string, unknown>)?.name as string) ?? null,
        actorEmail: ((redacted.actor as Record<string, unknown>)?.email as string) ?? null,
        actorMetadata: ((redacted.actor as Record<string, unknown>)?.metadata as Record<string, unknown>) ?? {},
        targetType: ((redacted.target as Record<string, unknown>)?.type as string) ?? null,
        targetId: ((redacted.target as Record<string, unknown>)?.id as string) ?? null,
        targetName: ((redacted.target as Record<string, unknown>)?.name as string) ?? null,
        targetMetadata: ((redacted.target as Record<string, unknown>)?.metadata as Record<string, unknown>) ?? {},
        sourceIp,
        ipCountry: null, // TODO: Requires a configured GeoIP database and lookup wiring.
        ipCity: null,
        userAgent: (redacted.context as Record<string, unknown>)?.user_agent as string ?? c.req.header('user-agent') ?? null,
        requestId: (redacted.context as Record<string, unknown>)?.request_id as string ?? null,
        sessionId: (redacted.context as Record<string, unknown>)?.session_id as string ?? null,
        isFailure: (redacted.is_failure as boolean) ?? false,
        isAnonymous: (redacted.is_anonymous as boolean) ?? false,
        errorMessage: (redacted.error_message as string) ?? null,
        metadata: residency.metadata,
        region: residency.region,
        tags: (redacted.tags as string[]) ?? [],
        occurredAt,
        idempotencyKey: body.idempotency_key ?? null,
        prevHash: null, // will be set by insertEventAtomically
        rowHash: '', // will be set by insertEventAtomically
        isAnomalous: false,
        anomalyReasons: [],
      },
      {
        tenantId,
        action: body.action,
        actorId: body.actor?.id,
        targetType: body.target?.type ?? null,
        targetId: body.target?.id ?? null,
        occurredAt,
        sourceIp: body.context?.ip ?? null,
        metadata: body.metadata ?? {},
      }
    );

    const event = { id: eventDbId, eventId: eventUuid, ingestedAt };

    // Run anomaly detection
    const anomaly = await detectAnomalies(db, {
      action: body.action,
      actorId: body.actor?.id,
      tenantId,
      sourceIp: body.context?.ip ?? null,
      ipCountry: null,
      severity: body.severity ?? 'info',
      metadata: body.metadata ?? {},
      occurredAt,
    });

    // Sign the event with project's signing key
    const signingResult = await signEvent(db, auth.projectId, rowHash);

    // Update anomaly flags and signature (rowHash is already correct from the atomic insert)
    const updateFields: Record<string, unknown> = {
      isAnomalous: anomaly.isAnomalous,
      anomalyReasons: anomaly.reasons,
    };
    if (signingResult) {
      updateFields.signature = signingResult.signature;
      updateFields.signingKeyId = signingResult.signingKeyId;
    }

    await db
      .update(auditEvents)
      .set(updateFields)
      .where(eq(auditEvents.id, event.id));

    // Check if we should trigger Merkle tree batching
    const currentCount = (eventCounters.get(auth.projectId) ?? 0) + 1;
    eventCounters.set(auth.projectId, currentCount);
    if (currentCount >= MERKLE_BATCH_SIZE) {
      eventCounters.set(auth.projectId, 0);
      batchEventsIntoMerkleTree(db, auth.projectId).catch((err) =>
        logger.error({ err }, 'Merkle auto-batch error')
      );
    }

    // Enqueue webhook delivery via BullMQ
    enqueueWebhookDelivery(auth.projectId, {
      id: event.eventId,
      event_id: event.eventId,
      action: body.action,
      tenant_id: tenantId,
      row_hash: rowHash,
      ingested_at: event.ingestedAt.toISOString(),
      actor: body.actor ?? null,
      target: body.target ?? null,
      metadata: body.metadata ?? {},
      severity: body.severity ?? 'info',
      occurred_at: occurredAt.toISOString(),
    }).catch(err => logger.error({ err }, 'Webhook enqueue error'));

    // Enqueue notification rule evaluation via BullMQ
    enqueueNotification(auth.projectId, body).catch(err => logger.error({ err }, 'Notification enqueue error'));

    // Enqueue SIEM streaming via BullMQ
    enqueueSIEMStream(auth.projectId, body).catch(err => logger.error({ err }, 'SIEM enqueue error'));

    // Enqueue advanced anomaly detection via BullMQ
    enqueueAnomalyDetection(auth.projectId, {
      eventId: event.eventId,
      action: body.action,
      actorId: body.actor?.id,
      tenantId,
      sourceIp: body.context?.ip ?? null,
      ipCountry: null,
      severity: body.severity ?? 'info',
      isFailure: body.is_failure ?? false,
      metadata: body.metadata ?? {},
      occurredAt: occurredAt.toISOString(),
    }).catch(err => logger.error({ err }, 'Anomaly enqueue error'));

    // Publish to event bus for SSE subscribers (stays in-memory for real-time browser connections)
    eventBus.publish(auth.projectId, {
      id: event.eventId,
      event_id: event.eventId,
      action: body.action,
      severity: body.severity ?? 'info',
      tenant_id: tenantId,
      actor: {
        id: body.actor?.id,
        type: body.actor?.type ?? 'user',
        name: body.actor?.name ?? null,
        email: body.actor?.email ?? null,
      },
      target: body.target?.type
        ? {
            type: body.target.type,
            id: body.target.id ?? null,
            name: body.target.name ?? null,
          }
        : null,
      occurred_at: occurredAt.toISOString(),
      ingested_at: event.ingestedAt.toISOString(),
      metadata: body.metadata ?? {},
      row_hash: rowHash,
      is_anomalous: anomaly.isAnomalous,
      category: body.category ?? null,
      description: body.description ?? null,
    });

    return c.json(
      {
        id: event.eventId,
        event_id: event.eventId,
        action: body.action,
        row_hash: rowHash,
        ingested_at: event.ingestedAt.toISOString(),
      },
      201
    );
  });

  // ==========================================
  // POST /v1/events/bulk — Log multiple events
  // ==========================================
  router.post('/bulk', requireScope('write'), async (c) => {
    const auth = c.get('auth');
    const body = await c.req.json();

    if (!body.events || !Array.isArray(body.events)) {
      return c.json({ code: 'INVALID_BODY', message: 'events array is required' }, 400);
    }

    if (body.events.length > 100) {
      return c.json({ code: 'TOO_MANY_EVENTS', message: 'Maximum 100 events per batch' }, 400);
    }

    for (const [index, eventBody] of body.events.entries()) {
      const validationErrors = validateEventInput(eventBody);
      if (validationErrors.length > 0) {
        return c.json(
          {
            code: 'INVALID_INPUT',
            message: `Event at index ${index} is invalid: ${validationErrors[0].message}`,
            event_index: index,
            errors: validationErrors,
          },
          400
        );
      }
    }

    // Resolve all tenants up-front (outside the main transaction to avoid
    // holding the advisory lock longer than necessary)
    const tenantCache = new Map<string, string>();
    for (const eventBody of body.events) {
      const externalId = eventBody.tenant_id;
      if (tenantCache.has(externalId)) continue;

      const existing = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(
          and(
            eq(tenants.projectId, auth.projectId),
            eq(tenants.externalId, externalId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        tenantCache.set(externalId, existing[0].id);
      } else {
        const created = await db
          .insert(tenants)
          .values({
            projectId: auth.projectId,
            externalId,
            name: externalId,
          })
          .returning({ id: tenants.id });
        tenantCache.set(externalId, created[0].id);
      }
    }

    // Collect unique tenant IDs for advisory lock acquisition
    const uniqueTenantIds: string[] = [...new Set((body.events as Array<Record<string, unknown>>).map((e) => tenantCache.get(e.tenant_id as string)!))];

    // Process all events inside a single transaction with advisory locks
    const results = await db.transaction(async (tx) => {
      // Set serializable isolation to prevent phantom reads in hash chain
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

      // Acquire advisory locks for all tenants involved in the batch.
      // Sorting lock keys prevents deadlocks when concurrent batches
      // overlap on multiple tenants.
      const lockKeys = uniqueTenantIds
        .map((tid) => tenantLockKey(tid))
        .sort((a, b) => a - b);

      for (const lockKey of lockKeys) {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);
      }

      // Track the latest hash per tenant within this transaction
      const lastHashCache = new Map<string, string | null>();

      const batchResults: Array<{
        id: string;
        event_id: string;
        action: string;
        row_hash: string;
        ingested_at: string;
        // internal fields for post-tx side effects
        _eventId: string;
        _tenantId: string;
        _occurredAt: string;
        _actor: Record<string, unknown> | null;
        _target: Record<string, unknown> | null;
        _metadata: Record<string, unknown>;
        _severity: string;
      }> = [];

      for (const eventBody of body.events) {
        const tenantId = tenantCache.get(eventBody.tenant_id)!;
        const occurredAt = eventBody.occurred_at ? new Date(eventBody.occurred_at) : new Date();

        // Get previous hash: use in-tx cache if available, otherwise query
        let prevHash: string | null;
        if (lastHashCache.has(tenantId)) {
          prevHash = lastHashCache.get(tenantId)!;
        } else {
          const prevResult = await tx
            .select({ rowHash: auditEvents.rowHash })
            .from(auditEvents)
            .where(eq(auditEvents.tenantId, tenantId))
            .orderBy(desc(auditEvents.id))
            .limit(1);
          prevHash = prevResult[0]?.rowHash ?? null;
        }

        // Insert with temporary rowHash (invisible outside this tx)
        const inserted = await tx
          .insert(auditEvents)
          .values({
            projectId: auth.projectId,
            tenantId,
            environment: auth.environment,
            action: eventBody.action,
            category: eventBody.category ?? null,
            description: eventBody.description ?? null,
            severity: eventBody.severity ?? 'info',
            actorId: eventBody.actor?.id,
            actorType: eventBody.actor?.type ?? 'user',
            actorName: eventBody.actor?.name ?? null,
            actorEmail: eventBody.actor?.email ?? null,
            actorMetadata: eventBody.actor?.metadata ?? {},
            targetType: eventBody.target?.type ?? null,
            targetId: eventBody.target?.id ?? null,
            targetName: eventBody.target?.name ?? null,
            targetMetadata: eventBody.target?.metadata ?? {},
            sourceIp: eventBody.context?.ip ?? null,
            userAgent: eventBody.context?.user_agent ?? null,
            requestId: eventBody.context?.request_id ?? null,
            isFailure: eventBody.is_failure ?? false,
            isAnonymous: eventBody.is_anonymous ?? false,
            errorMessage: eventBody.error_message ?? null,
            metadata: eventBody.metadata ?? {},
            tags: eventBody.tags ?? [],
            occurredAt,
            idempotencyKey: eventBody.idempotency_key ?? null,
            prevHash,
            rowHash: 'computing', // never committed — updated below
            isAnomalous: false,
            anomalyReasons: [],
          })
          .returning({
            id: auditEvents.id,
            eventId: auditEvents.eventId,
            ingestedAt: auditEvents.ingestedAt,
          });

        const event = inserted[0];

        // Compute real hash with the auto-generated id
        const rowHash = computeRowHash(
          {
            id: event.id,
            tenantId,
            action: eventBody.action,
            actorId: eventBody.actor?.id,
            targetType: eventBody.target?.type ?? null,
            targetId: eventBody.target?.id ?? null,
            occurredAt,
            sourceIp: eventBody.context?.ip ?? null,
            metadata: eventBody.metadata ?? {},
          },
          prevHash
        );

        // Update the row with the real hash
        await tx
          .update(auditEvents)
          .set({ rowHash })
          .where(eq(auditEvents.id, event.id));

        // Update in-tx cache so the next event in the same tenant chains correctly
        lastHashCache.set(tenantId, rowHash);

        batchResults.push({
          id: event.eventId,
          event_id: event.eventId,
          action: eventBody.action,
          row_hash: rowHash,
          ingested_at: event.ingestedAt.toISOString(),
          _eventId: event.eventId,
          _tenantId: tenantId,
          _occurredAt: occurredAt.toISOString(),
          _actor: eventBody.actor ?? null,
          _target: eventBody.target ?? null,
          _metadata: eventBody.metadata ?? {},
          _severity: eventBody.severity ?? 'info',
        });
      }

      return batchResults;
    });

    // Enqueue side effects via BullMQ AFTER the transaction has committed
    for (const r of results) {
      enqueueWebhookDelivery(auth.projectId, {
        id: r._eventId,
        event_id: r._eventId,
        action: r.action,
        tenant_id: r._tenantId,
        row_hash: r.row_hash,
        ingested_at: r.ingested_at,
        actor: r._actor,
        target: r._target,
        metadata: r._metadata,
        severity: r._severity,
        occurred_at: r._occurredAt,
      }).catch(err => logger.error({ err }, 'Webhook enqueue error'));

      // SSE event bus stays in-memory for real-time browser connections
      eventBus.publish(auth.projectId, {
        id: r._eventId,
        event_id: r._eventId,
        action: r.action,
        severity: r._severity,
        tenant_id: r._tenantId,
        actor: {
          id: (r._actor as Record<string, unknown>)?.id as string,
          type: ((r._actor as Record<string, unknown>)?.type as string) ?? 'user',
          name: ((r._actor as Record<string, unknown>)?.name as string) ?? null,
          email: ((r._actor as Record<string, unknown>)?.email as string) ?? null,
        },
        target: (r._target as Record<string, unknown>)?.type
          ? {
              type: (r._target as Record<string, unknown>).type as string,
              id: ((r._target as Record<string, unknown>).id as string) ?? null,
              name: ((r._target as Record<string, unknown>).name as string) ?? null,
            }
          : null,
        occurred_at: r._occurredAt,
        ingested_at: r.ingested_at,
        metadata: r._metadata,
        row_hash: r.row_hash,
      });
    }

    // Strip internal fields from response
    const cleanResults = results.map(({ _eventId, _tenantId, _occurredAt, _actor, _target, _metadata, _severity, ...rest }) => rest);

    return c.json({ events: cleanResults, count: cleanResults.length }, 201);
  });

  // ==========================================
  // GET /v1/events — Search/list events
  // ==========================================
  router.get('/', async (c) => {
    const auth = c.get('auth');
    const query = c.req.query();

    const conditions = [eq(auditEvents.projectId, auth.projectId)];

    // Viewer tokens are always scoped to their tenant
    if (auth.type === 'viewer_token' && auth.tenantId) {
      // If the request specifies a different tenant, deny access
      if (query.tenant_id && query.tenant_id !== auth.tenantId) {
        return c.json({ code: 'FORBIDDEN', message: 'Viewer token is scoped to a different tenant' }, 403);
      }
      conditions.push(eq(auditEvents.tenantId, auth.tenantId));
    } else if (query.tenant_id) {
      // Look up internal tenant ID from external ID
      const tenant = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(
          and(eq(tenants.projectId, auth.projectId), eq(tenants.externalId, query.tenant_id))
        )
        .limit(1);

      if (tenant.length > 0) {
        conditions.push(eq(auditEvents.tenantId, tenant[0].id));
      } else {
        return c.json({ data: [], pagination: { has_more: false, cursor: null } });
      }
    }

    if (query.action) {
      if (query.action.includes('*')) {
        // Glob matching: document.* → document.%
        const pattern = query.action.replace(/\*/g, '%');
        conditions.push(ilike(auditEvents.action, pattern));
      } else {
        conditions.push(eq(auditEvents.action, query.action));
      }
    }

    if (query.actor_id) {
      conditions.push(eq(auditEvents.actorId, query.actor_id));
    }

    if (query.target_type) {
      conditions.push(eq(auditEvents.targetType, query.target_type));
    }

    if (query.target_id) {
      conditions.push(eq(auditEvents.targetId, query.target_id));
    }

    if (query.severity) {
      const severities = query.severity.split(',');
      if (severities.length > 10) {
        return c.json({ code: 'INVALID_FIELD', message: 'Maximum 10 severity values allowed' }, 400);
      }
      conditions.push(
        or(...severities.map((s) => eq(auditEvents.severity, s)))!
      );
    }

    if (query.is_anomalous === 'true') {
      conditions.push(eq(auditEvents.isAnomalous, true));
    }

    if (query.from) {
      const fromDate = new Date(query.from);
      if (isNaN(fromDate.getTime())) {
        return c.json({ code: 'INVALID_DATE', message: 'Invalid "from" date format' }, 400);
      }
      conditions.push(gte(auditEvents.occurredAt, fromDate));
    }

    if (query.to) {
      const toDate = new Date(query.to);
      if (isNaN(toDate.getTime())) {
        return c.json({ code: 'INVALID_DATE', message: 'Invalid "to" date format' }, 400);
      }
      conditions.push(lt(auditEvents.occurredAt, toDate));
    }

    if (query.cursor) {
      const cursorId = verifyCursor(query.cursor);
      if (cursorId === null) {
        return c.json({ code: 'INVALID_CURSOR', message: 'Invalid or tampered pagination cursor' }, 400);
      }
      conditions.push(lt(auditEvents.id, cursorId));
    }

    const limit = Math.min(Number(query.limit) || 50, 1000);

    // Full-text search
    if (query.query) {
      conditions.push(
        sql`to_tsvector('english',
          coalesce(${auditEvents.action}, '') || ' ' ||
          coalesce(${auditEvents.actorName}, '') || ' ' ||
          coalesce(${auditEvents.actorEmail}, '') || ' ' ||
          coalesce(${auditEvents.targetName}, '') || ' ' ||
          coalesce(${auditEvents.description}, ''))
        @@ plainto_tsquery('english', ${query.query})`
      );
    }

    // Advanced query language: q=actor:john@co.com action:delete severity:error
    if (query.q) {
      const qConditions = parseQueryLanguage(query.q);
      for (const qc of qConditions) {
        switch (qc.field) {
          case 'actor':
            conditions.push(
              or(
                eq(auditEvents.actorEmail, qc.value),
                eq(auditEvents.actorId, qc.value),
                eq(auditEvents.actorName, qc.value)
              )!
            );
            break;
          case 'action':
            if (qc.value.includes('*')) {
              const pattern = qc.value.replace(/\*/g, '%');
              conditions.push(ilike(auditEvents.action, pattern));
            } else {
              conditions.push(eq(auditEvents.action, qc.value));
            }
            break;
          case 'target':
            conditions.push(eq(auditEvents.targetType, qc.value));
            break;
          case 'severity':
            conditions.push(eq(auditEvents.severity, qc.value));
            break;
          case 'tenant': {
            const tenantResult = await db
              .select({ id: tenants.id })
              .from(tenants)
              .where(
                and(
                  eq(tenants.projectId, auth.projectId),
                  eq(tenants.externalId, qc.value)
                )
              )
              .limit(1);
            if (tenantResult.length > 0) {
              conditions.push(eq(auditEvents.tenantId, tenantResult[0].id));
            } else {
              // Tenant not found — return empty results
              return c.json({ data: [], pagination: { has_more: false, cursor: null } });
            }
            break;
          }
          case 'after': {
            const afterDate = new Date(qc.value);
            if (!isNaN(afterDate.getTime())) {
              conditions.push(gte(auditEvents.occurredAt, afterDate));
            }
            break;
          }
          case 'before': {
            const beforeDate = new Date(qc.value);
            if (!isNaN(beforeDate.getTime())) {
              conditions.push(lt(auditEvents.occurredAt, beforeDate));
            }
            break;
          }
        }
      }
    }

    const events = await db
      .select()
      .from(auditEvents)
      .where(and(...conditions))
      .orderBy(desc(auditEvents.id))
      .limit(limit + 1);

    const hasMore = events.length > limit;
    if (hasMore) events.pop();

    const cursor = events.length > 0
      ? signCursor(events[events.length - 1].id)
      : null;

    return c.json({
      data: events.map(serializeEvent),
      pagination: {
        has_more: hasMore,
        cursor: hasMore ? cursor : null,
      },
    });
  });

  // ==========================================
  // GET /v1/events/nlp-search — Natural language search
  // ==========================================
  router.get('/nlp-search', async (c) => {
    const auth = c.get('auth');
    const q = c.req.query('q');

    if (!q) {
      return c.json({ code: 'MISSING_QUERY', message: 'q query parameter is required' }, 400);
    }

    // Parse natural language into structured filters
    const filters = parseNaturalLanguageQuery(q);

    const conditions = [eq(auditEvents.projectId, auth.projectId)];

    // Viewer tokens are always scoped to their tenant
    if (auth.type === 'viewer_token' && auth.tenantId) {
      conditions.push(eq(auditEvents.tenantId, auth.tenantId));
    } else if (filters.tenant_id) {
      const tenant = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(
          and(eq(tenants.projectId, auth.projectId), eq(tenants.externalId, filters.tenant_id))
        )
        .limit(1);

      if (tenant.length > 0) {
        conditions.push(eq(auditEvents.tenantId, tenant[0].id));
      } else {
        return c.json({
          data: [],
          filters,
          query: q,
          pagination: { has_more: false, cursor: null },
        });
      }
    }

    if (filters.action) {
      if (filters.action.includes('*')) {
        const pattern = filters.action.replace(/\*/g, '%');
        conditions.push(ilike(auditEvents.action, pattern));
      } else {
        conditions.push(eq(auditEvents.action, filters.action));
      }
    }

    if (filters.severity) {
      conditions.push(eq(auditEvents.severity, filters.severity));
    }

    if (filters.target_type) {
      conditions.push(eq(auditEvents.targetType, filters.target_type));
    }

    if (filters.actor_name) {
      conditions.push(
        or(
          ilike(auditEvents.actorName, `%${filters.actor_name}%`),
          ilike(auditEvents.actorEmail, `%${filters.actor_name}%`),
          ilike(auditEvents.actorId, `%${filters.actor_name}%`)
        )!
      );
    }

    if (filters.from) {
      const fromDate = new Date(filters.from);
      if (isNaN(fromDate.getTime())) {
        return c.json({ code: 'INVALID_DATE', message: 'Invalid "from" date format' }, 400);
      }
      conditions.push(gte(auditEvents.occurredAt, fromDate));
    }

    if (filters.to) {
      const toDate = new Date(filters.to);
      if (isNaN(toDate.getTime())) {
        return c.json({ code: 'INVALID_DATE', message: 'Invalid "to" date format' }, 400);
      }
      conditions.push(lt(auditEvents.occurredAt, toDate));
    }

    if (filters.is_anomalous === 'true') {
      conditions.push(eq(auditEvents.isAnomalous, true));
    }

    if (filters.query) {
      conditions.push(
        sql`to_tsvector('english',
          coalesce(${auditEvents.action}, '') || ' ' ||
          coalesce(${auditEvents.actorName}, '') || ' ' ||
          coalesce(${auditEvents.actorEmail}, '') || ' ' ||
          coalesce(${auditEvents.targetName}, '') || ' ' ||
          coalesce(${auditEvents.description}, ''))
        @@ plainto_tsquery('english', ${filters.query})`
      );
    }

    const limit = Math.min(Number(c.req.query('limit')) || 50, 1000);

    const events = await db
      .select()
      .from(auditEvents)
      .where(and(...conditions))
      .orderBy(desc(auditEvents.id))
      .limit(limit + 1);

    const hasMore = events.length > limit;
    if (hasMore) events.pop();

    const cursor = events.length > 0
      ? signCursor(events[events.length - 1].id)
      : null;

    return c.json({
      data: events.map(serializeEvent),
      filters,
      query: q,
      pagination: {
        has_more: hasMore,
        cursor: hasMore ? cursor : null,
      },
    });
  });

  // ==========================================
  // GET /v1/events/:event_id — Get single event
  // ==========================================
  router.get('/:event_id', async (c) => {
    const auth = c.get('auth');
    const eventId = c.req.param('event_id');

    // Avoid database UUID cast errors for malformed IDs and preserve the API's
    // not-found contract for arbitrary client-supplied identifiers.
    if (!UUID_PATTERN.test(eventId)) {
      return c.json({ code: 'NOT_FOUND', message: 'Event not found' }, 404);
    }

    const conditions = [
      eq(auditEvents.projectId, auth.projectId),
      eq(auditEvents.eventId, eventId),
    ];

    if (auth.type === 'viewer_token' && auth.tenantId) {
      conditions.push(eq(auditEvents.tenantId, auth.tenantId));
    }

    const result = await db
      .select()
      .from(auditEvents)
      .where(and(...conditions))
      .limit(1);

    if (result.length === 0) {
      return c.json({ code: 'NOT_FOUND', message: 'Event not found' }, 404);
    }

    return c.json(serializeEvent(result[0]));
  });

  return router;
}

// --- Serialization helper ---
function serializeEvent(event: typeof auditEvents.$inferSelect) {
  return {
    id: event.eventId,
    event_id: event.eventId,
    project_id: event.projectId,
    tenant_id: event.tenantId,
    environment: event.environment,
    action: event.action,
    category: event.category,
    description: event.description,
    severity: event.severity,
    actor: {
      id: event.actorId,
      type: event.actorType,
      name: event.actorName,
      email: event.actorEmail,
      metadata: event.actorMetadata,
    },
    target: event.targetType
      ? {
          type: event.targetType,
          id: event.targetId,
          name: event.targetName,
          metadata: event.targetMetadata,
        }
      : null,
    context: {
      ip: event.sourceIp,
      country: event.ipCountry,
      city: event.ipCity,
      user_agent: event.userAgent,
      request_id: event.requestId,
      session_id: event.sessionId,
    },
    is_failure: event.isFailure,
    is_anonymous: event.isAnonymous,
    error_message: event.errorMessage,
    metadata: event.metadata,
    tags: event.tags,
    occurred_at: event.occurredAt.toISOString(),
    ingested_at: event.ingestedAt.toISOString(),
    row_hash: event.rowHash,
    prev_hash: event.prevHash,
    is_anomalous: event.isAnomalous,
    anomaly_reasons: event.anomalyReasons,
  };
}

// --- Query language parser ---
interface QueryFilter {
  field: 'actor' | 'action' | 'target' | 'severity' | 'tenant' | 'after' | 'before';
  value: string;
}

const VALID_FIELDS = new Set(['actor', 'action', 'target', 'severity', 'tenant', 'after', 'before']);

function parseQueryLanguage(q: string): QueryFilter[] {
  const filters: QueryFilter[] = [];
  const tokens = q.trim().split(/\s+/);

  for (const token of tokens) {
    const colonIndex = token.indexOf(':');
    if (colonIndex === -1) continue;

    const field = token.slice(0, colonIndex);
    const value = token.slice(colonIndex + 1);

    if (!field || !value) continue;
    if (!VALID_FIELDS.has(field)) continue;

    filters.push({ field: field as QueryFilter['field'], value });
  }

  return filters;
}
