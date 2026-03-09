import { Hono } from 'hono';
import { createHash, randomBytes } from 'crypto';
import { eq, and, sql, count, desc, lt } from 'drizzle-orm';
import type { SessionUser, SessionProject } from '../middleware/session-auth.js';
import {
  projects,
  apiKeys,
  auditEvents,
  tenants,
  retentionPolicies,
  notificationRules,
  siemConnectors,
  anomalyAlerts,
  anomalyDetectionSettings,
  redactionRules,
  signingKeys,
  complianceReports,
} from '../db/schema.js';
import type { Database } from '../db/index.js';

import { getResidencyConfig, upsertResidencyConfig } from '../services/data-residency.js';
import { DEFAULT_SETTINGS } from '../services/anomaly-detection.js';
import { BUILT_IN_PATTERNS } from '../services/pii-redaction.js';
import { generateSigningKeypair, rotateSigningKey, getActiveSigningKey } from '../services/event-signing.js';
import { generateComplianceReport } from '../services/compliance-reports.js';
import { encryptSiemConfig, redactSiemConfig } from '../services/siem-encryption.js';
import { logger } from '../services/logger.js';

function getValidProjectId(projectId: string | undefined, userProjects: { id: string }[]): string | null {
  const id = projectId || userProjects[0]?.id;
  if (!id) return null;
  if (!userProjects.some(p => p.id === id)) return null;
  return id;
}

export function createDashboardRouter(db: Database) {
  const router = new Hono<{
    Variables: { user: SessionUser; projects: SessionProject[] };
  }>();

  // GET /dashboard/projects — list user's projects
  router.get('/projects', async (c) => {
    const user = c.get('user');

    const result = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        region: projects.region,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(eq(projects.userId, user.id))
      .orderBy(desc(projects.createdAt));

    return c.json({
      data: result.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        region: p.region,
        created_at: p.createdAt.toISOString(),
      })),
    });
  });

  // GET /dashboard/stats — event count, tenant count for first project
  router.get('/stats', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ event_count: 0, tenant_count: 0 });
    }

    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const [eventResult] = await db
      .select({ count: count() })
      .from(auditEvents)
      .where(eq(auditEvents.projectId, projectId));

    const [tenantResult] = await db
      .select({ count: count() })
      .from(tenants)
      .where(eq(tenants.projectId, projectId));

    return c.json({
      event_count: eventResult.count,
      tenant_count: tenantResult.count,
    });
  });

  // GET /dashboard/api-keys — list API keys (masked)
  router.get('/api-keys', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ data: [] });
    }

    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        environment: apiKeys.environment,
        scopes: apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.projectId, projectId))
      .orderBy(desc(apiKeys.createdAt));

    return c.json({
      data: keys.map((k) => ({
        id: k.id,
        name: k.name,
        key_prefix: k.keyPrefix,
        masked_key: `${k.keyPrefix}${'*'.repeat(40)}`,
        environment: k.environment,
        scopes: k.scopes,
        last_used_at: k.lastUsedAt?.toISOString() ?? null,
        expires_at: k.expiresAt?.toISOString() ?? null,
        created_at: k.createdAt.toISOString(),
      })),
    });
  });

  // POST /dashboard/api-keys — create new API key
  router.post('/api-keys', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ code: 'NO_PROJECT', message: 'No project found' }, 400);
    }

    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    const name = body.name || 'Untitled Key';
    const environment = body.environment || 'production';

    const prefix = environment === 'production' ? 'ak_live_' : 'ak_test_';
    const rawKey = `${prefix}${randomBytes(24).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12);

    const [created] = await db
      .insert(apiKeys)
      .values({
        projectId,
        name,
        keyHash,
        keyPrefix,
        environment,
        scopes: body.scopes || ['write', 'read'],
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        environment: apiKeys.environment,
        createdAt: apiKeys.createdAt,
      });

    return c.json(
      {
        id: created.id,
        name: created.name,
        key: rawKey, // Raw key shown only once
        key_prefix: created.keyPrefix,
        environment: created.environment,
        created_at: created.createdAt.toISOString(),
      },
      201
    );
  });

  // DELETE /dashboard/api-keys/:id — revoke key
  router.delete('/api-keys/:id', async (c) => {
    const userProjects = c.get('projects');
    const keyId = c.req.param('id');
    const projectIds = userProjects.map((p) => p.id);

    // Verify the key belongs to one of the user's projects
    const existing = await db
      .select({ id: apiKeys.id, projectId: apiKeys.projectId })
      .from(apiKeys)
      .where(eq(apiKeys.id, keyId))
      .limit(1);

    if (existing.length === 0 || !projectIds.includes(existing[0].projectId)) {
      return c.json({ code: 'NOT_FOUND', message: 'API key not found' }, 404);
    }

    await db.delete(apiKeys).where(eq(apiKeys.id, keyId));

    return c.json({ ok: true });
  });

  // GET /dashboard/team — list workspace members
  router.get('/team', async (c) => {
    const user = c.get('user');

    // AuditKit currently has a single-user ownership model for projects.
    // Expose the signed-in user as the workspace owner so the dashboard can
    // render a stable members list without surfacing a 404.
    return c.json({
      data: [
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: 'owner',
          joinedAt: new Date().toISOString(),
        },
      ],
    });
  });

  // GET /dashboard/retention — get retention policy
  router.get('/retention', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ retention_days: 30, legal_hold: false });
    }

    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const result = await db
      .select()
      .from(retentionPolicies)
      .where(eq(retentionPolicies.projectId, projectId))
      .limit(1);

    if (result.length === 0) {
      return c.json({ retention_days: 30, legal_hold: false });
    }

    const policy = result[0];
    return c.json({
      id: policy.id,
      retention_days: Number(policy.retentionDays),
      legal_hold: policy.legalHold,
      legal_hold_until: policy.legalHoldUntil?.toISOString() ?? null,
    });
  });

  // PUT /dashboard/retention — update retention days
  router.put('/retention', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ code: 'NO_PROJECT', message: 'No project found' }, 400);
    }

    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    const retentionDays = body.retention_days;

    if (!retentionDays || typeof retentionDays !== 'number' || retentionDays < 1) {
      return c.json({ code: 'INVALID', message: 'retention_days must be a positive number' }, 400);
    }

    // Upsert retention policy
    const existing = await db
      .select({ id: retentionPolicies.id })
      .from(retentionPolicies)
      .where(eq(retentionPolicies.projectId, projectId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(retentionPolicies)
        .set({ retentionDays: String(retentionDays) })
        .where(eq(retentionPolicies.id, existing[0].id));
    } else {
      await db.insert(retentionPolicies).values({
        projectId,
        retentionDays: String(retentionDays),
      });
    }

    return c.json({ ok: true, retention_days: retentionDays });
  });

  // GET /dashboard/analytics — time-series data for the past 7 days
  router.get('/analytics', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({
        events_per_day: [],
        events_by_severity: { info: 0, warning: 0, critical: 0, error: 0 },
        events_by_action: [],
        anomaly_count: 0,
        top_actors: [],
      });
    }

    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const eventsPerDay = await db
      .select({
        date: sql<string>`DATE(${auditEvents.occurredAt})`.as('date'),
        count: count().as('count'),
      })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.projectId, projectId),
          sql`${auditEvents.occurredAt} >= ${sevenDaysAgo.toISOString()}`
        )
      )
      .groupBy(sql`DATE(${auditEvents.occurredAt})`)
      .orderBy(sql`DATE(${auditEvents.occurredAt})`);

    const severityRows = await db
      .select({
        severity: auditEvents.severity,
        count: count().as('count'),
      })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.projectId, projectId),
          sql`${auditEvents.occurredAt} >= ${sevenDaysAgo.toISOString()}`
        )
      )
      .groupBy(auditEvents.severity);

    const eventsBySeverity: Record<string, number> = { info: 0, warning: 0, critical: 0, error: 0 };
    for (const row of severityRows) {
      eventsBySeverity[row.severity] = row.count;
    }

    const eventsByAction = await db
      .select({
        action: auditEvents.action,
        count: count().as('count'),
      })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.projectId, projectId),
          sql`${auditEvents.occurredAt} >= ${sevenDaysAgo.toISOString()}`
        )
      )
      .groupBy(auditEvents.action)
      .orderBy(desc(count()))
      .limit(5);

    const [anomalyResult] = await db
      .select({ count: count() })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.projectId, projectId),
          eq(auditEvents.isAnomalous, true),
          sql`${auditEvents.occurredAt} >= ${sevenDaysAgo.toISOString()}`
        )
      );

    const topActors = await db
      .select({
        actorId: auditEvents.actorId,
        actorName: auditEvents.actorName,
        count: count().as('count'),
      })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.projectId, projectId),
          sql`${auditEvents.occurredAt} >= ${sevenDaysAgo.toISOString()}`
        )
      )
      .groupBy(auditEvents.actorId, auditEvents.actorName)
      .orderBy(desc(count()))
      .limit(5);

    return c.json({
      events_per_day: eventsPerDay.map((r) => ({ date: r.date, count: r.count })),
      events_by_severity: eventsBySeverity,
      events_by_action: eventsByAction.map((r) => ({ action: r.action, count: r.count })),
      anomaly_count: anomalyResult.count,
      top_actors: topActors.map((r) => ({
        actor_id: r.actorId,
        actor_name: r.actorName ?? r.actorId,
        count: r.count,
      })),
    });
  });

  // GET /dashboard/export — export events as CSV or JSON
  router.get('/export', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ data: [] });
    }

    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    const format = c.req.query('format') || 'json';
    const limit = Math.min(Number(c.req.query('limit')) || 1000, 10000);

    const events = await db
      .select({
        eventId: auditEvents.eventId,
        action: auditEvents.action,
        category: auditEvents.category,
        severity: auditEvents.severity,
        actorId: auditEvents.actorId,
        actorName: auditEvents.actorName,
        actorEmail: auditEvents.actorEmail,
        targetType: auditEvents.targetType,
        targetId: auditEvents.targetId,
        targetName: auditEvents.targetName,
        sourceIp: auditEvents.sourceIp,
        occurredAt: auditEvents.occurredAt,
        isFailure: auditEvents.isFailure,
        isAnomalous: auditEvents.isAnomalous,
      })
      .from(auditEvents)
      .where(eq(auditEvents.projectId, projectId))
      .orderBy(desc(auditEvents.occurredAt))
      .limit(limit);

    if (format === 'csv') {
      const headers = [
        'event_id',
        'action',
        'category',
        'severity',
        'actor_id',
        'actor_name',
        'actor_email',
        'target_type',
        'target_id',
        'target_name',
        'source_ip',
        'occurred_at',
        'is_failure',
        'is_anomalous',
      ];

      const rows = events.map((e) =>
        [
          e.eventId,
          e.action,
          e.category ?? '',
          e.severity,
          e.actorId,
          e.actorName ?? '',
          e.actorEmail ?? '',
          e.targetType ?? '',
          e.targetId ?? '',
          e.targetName ?? '',
          e.sourceIp ?? '',
          e.occurredAt.toISOString(),
          e.isFailure ? 'true' : 'false',
          e.isAnomalous ? 'true' : 'false',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      );

      const csv = [headers.join(','), ...rows].join('\n');

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="auditkit-events.csv"',
        },
      });
    }

    return c.json({
      data: events.map((e) => ({
        event_id: e.eventId,
        action: e.action,
        category: e.category,
        severity: e.severity,
        actor_id: e.actorId,
        actor_name: e.actorName,
        actor_email: e.actorEmail,
        target_type: e.targetType,
        target_id: e.targetId,
        target_name: e.targetName,
        source_ip: e.sourceIp,
        occurred_at: e.occurredAt.toISOString(),
        is_failure: e.isFailure,
        is_anomalous: e.isAnomalous,
      })),
    });
  });

  // ==========================================
  // Notification Rules CRUD
  // ==========================================

  // GET /dashboard/notifications — list rules for project
  router.get('/notifications', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ data: [] });
    }

    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const rules = await db
      .select()
      .from(notificationRules)
      .where(eq(notificationRules.projectId, projectId))
      .orderBy(desc(notificationRules.createdAt));

    return c.json({
      data: rules.map((r) => ({
        id: r.id,
        name: r.name,
        conditions: r.conditions,
        channel_type: r.channelType,
        channel_config: r.channelConfig,
        is_active: r.isActive,
        created_at: r.createdAt.toISOString(),
      })),
    });
  });

  // POST /dashboard/notifications — create rule
  router.post('/notifications', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ code: 'NO_PROJECT', message: 'No project found' }, 400);
    }

    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    if (!body.name || !body.channel_type || !body.channel_config) {
      return c.json({ code: 'INVALID', message: 'name, channel_type, and channel_config are required' }, 400);
    }

    const [created] = await db
      .insert(notificationRules)
      .values({
        projectId,
        name: body.name,
        conditions: body.conditions ?? [],
        channelType: body.channel_type,
        channelConfig: body.channel_config,
        isActive: body.is_active ?? true,
      })
      .returning();

    return c.json(
      {
        id: created.id,
        name: created.name,
        conditions: created.conditions,
        channel_type: created.channelType,
        channel_config: created.channelConfig,
        is_active: created.isActive,
        created_at: created.createdAt.toISOString(),
      },
      201
    );
  });

  // PATCH /dashboard/notifications/:id — toggle active/inactive
  router.patch('/notifications/:id', async (c) => {
    const userProjects = c.get('projects');
    const ruleId = c.req.param('id');
    const projectIds = userProjects.map((p) => p.id);

    const existing = await db
      .select({ id: notificationRules.id, projectId: notificationRules.projectId })
      .from(notificationRules)
      .where(eq(notificationRules.id, ruleId))
      .limit(1);

    if (existing.length === 0 || !projectIds.includes(existing[0].projectId)) {
      return c.json({ code: 'NOT_FOUND', message: 'Notification rule not found' }, 404);
    }

    const body = await c.req.json();
    const updates: Record<string, unknown> = {};
    if (typeof body.is_active === 'boolean') updates.isActive = body.is_active;
    if (body.name) updates.name = body.name;
    if (body.conditions) updates.conditions = body.conditions;
    if (body.channel_type) updates.channelType = body.channel_type;
    if (body.channel_config) updates.channelConfig = body.channel_config;

    await db
      .update(notificationRules)
      .set(updates)
      .where(eq(notificationRules.id, ruleId));

    return c.json({ ok: true });
  });

  // DELETE /dashboard/notifications/:id — delete rule
  router.delete('/notifications/:id', async (c) => {
    const userProjects = c.get('projects');
    const ruleId = c.req.param('id');
    const projectIds = userProjects.map((p) => p.id);

    const existing = await db
      .select({ id: notificationRules.id, projectId: notificationRules.projectId })
      .from(notificationRules)
      .where(eq(notificationRules.id, ruleId))
      .limit(1);

    if (existing.length === 0 || !projectIds.includes(existing[0].projectId)) {
      return c.json({ code: 'NOT_FOUND', message: 'Notification rule not found' }, 404);
    }

    await db.delete(notificationRules).where(eq(notificationRules.id, ruleId));

    return c.json({ ok: true });
  });

  // ==========================================
  // SIEM Connectors CRUD
  // ==========================================

  // GET /dashboard/siem — list connectors
  router.get('/siem', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ data: [] });
    }

    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const connectors = await db
      .select()
      .from(siemConnectors)
      .where(eq(siemConnectors.projectId, projectId))
      .orderBy(desc(siemConnectors.createdAt));

    return c.json({
      data: connectors.map((c) => ({
        id: c.id,
        type: c.type,
        name: c.name,
        config: redactSiemConfig((c.config ?? {}) as Record<string, unknown>),
        is_active: c.isActive,
        last_sync_at: c.lastSyncAt?.toISOString() ?? null,
        created_at: c.createdAt.toISOString(),
      })),
    });
  });

  // POST /dashboard/siem — create connector
  router.post('/siem', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ code: 'NO_PROJECT', message: 'No project found' }, 400);
    }

    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    if (!body.type || !body.name || !body.config) {
      return c.json({ code: 'INVALID', message: 'type, name, and config are required' }, 400);
    }

    const [created] = await db
      .insert(siemConnectors)
      .values({
        projectId,
        type: body.type,
        name: body.name,
        config: encryptSiemConfig(body.config),
        isActive: body.is_active ?? true,
      })
      .returning();

    return c.json(
      {
        id: created.id,
        type: created.type,
        name: created.name,
        config: redactSiemConfig((created.config ?? {}) as Record<string, unknown>),
        is_active: created.isActive,
        last_sync_at: null,
        created_at: created.createdAt.toISOString(),
      },
      201
    );
  });

  // PATCH /dashboard/siem/:id — update connector
  router.patch('/siem/:id', async (c) => {
    const userProjects = c.get('projects');
    const connectorId = c.req.param('id');
    const projectIds = userProjects.map((p) => p.id);

    const existing = await db
      .select({ id: siemConnectors.id, projectId: siemConnectors.projectId })
      .from(siemConnectors)
      .where(eq(siemConnectors.id, connectorId))
      .limit(1);

    if (existing.length === 0 || !projectIds.includes(existing[0].projectId)) {
      return c.json({ code: 'NOT_FOUND', message: 'SIEM connector not found' }, 404);
    }

    const body = await c.req.json();
    const updates: Record<string, unknown> = {};
    if (typeof body.is_active === 'boolean') updates.isActive = body.is_active;
    if (body.name) updates.name = body.name;
    if (body.type) updates.type = body.type;
    if (body.config) updates.config = encryptSiemConfig(body.config);

    await db
      .update(siemConnectors)
      .set(updates)
      .where(eq(siemConnectors.id, connectorId));

    return c.json({ ok: true });
  });

  // DELETE /dashboard/siem/:id — delete connector
  router.delete('/siem/:id', async (c) => {
    const userProjects = c.get('projects');
    const connectorId = c.req.param('id');
    const projectIds = userProjects.map((p) => p.id);

    const existing = await db
      .select({ id: siemConnectors.id, projectId: siemConnectors.projectId })
      .from(siemConnectors)
      .where(eq(siemConnectors.id, connectorId))
      .limit(1);

    if (existing.length === 0 || !projectIds.includes(existing[0].projectId)) {
      return c.json({ code: 'NOT_FOUND', message: 'SIEM connector not found' }, 404);
    }

    await db.delete(siemConnectors).where(eq(siemConnectors.id, connectorId));

    return c.json({ ok: true });
  });

  // POST /dashboard/retention/run — manually trigger retention cleanup
  router.post('/retention/run', async (c) => {
    const userProjects = c.get('projects');
    const projectIds = userProjects.map((p) => p.id);

    if (projectIds.length === 0) {
      return c.json({ ok: true, message: 'No projects to clean up' });
    }

    try {
      // Only run retention for the authenticated user's projects
      const policies = await db.select().from(retentionPolicies);
      const userPolicies = policies.filter((p) => projectIds.includes(p.projectId));

      for (const policy of userPolicies) {
        if (policy.legalHold) continue;

        const retentionDays = Number(policy.retentionDays);
        if (isNaN(retentionDays) || retentionDays <= 0) continue;

        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

        const conditions = [
          eq(auditEvents.projectId, policy.projectId),
          lt(auditEvents.occurredAt, cutoffDate),
        ];

        if (policy.tenantId) {
          conditions.push(eq(auditEvents.tenantId, policy.tenantId));
        }

        await db
          .delete(auditEvents)
          .where(and(...conditions));
      }

      return c.json({ ok: true, message: 'Retention cleanup triggered' });
    } catch (err) {
      logger.error({ err }, 'Retention cleanup error');
      return c.json(
        { code: 'CLEANUP_ERROR', message: 'Retention cleanup failed' },
        500
      );
    }
  });

  // ==========================================
  // Data Residency
  // ==========================================

  // GET /dashboard/data-residency — get current config
  router.get('/data-residency', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ region: 'us', storage_endpoint: null, enabled: false });
    }

    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    const config = await getResidencyConfig(db, projectId);

    if (!config) {
      return c.json({ region: 'us', storage_endpoint: null, enabled: false });
    }

    return c.json({
      id: config.id,
      region: config.region,
      storage_endpoint: config.storageEndpoint,
      enabled: config.enabled,
      created_at: config.createdAt.toISOString(),
    });
  });

  // PUT /dashboard/data-residency — update config
  router.put('/data-residency', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ code: 'NO_PROJECT', message: 'No project found' }, 400);
    }

    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    if (!body.region) {
      return c.json({ code: 'INVALID', message: 'region is required (us, eu, apac, custom)' }, 400);
    }

    try {
      const config = await upsertResidencyConfig(
        db,
        projectId,
        body.region,
        body.storage_endpoint ?? null
      );

      return c.json({
        id: config.id,
        region: config.region,
        storage_endpoint: config.storageEndpoint,
        enabled: config.enabled,
        created_at: config.createdAt.toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update data residency config';
      return c.json({ code: 'INVALID', message }, 400);
    }
  });

  // ==========================================
  // Anomaly Detection
  // ==========================================

  // GET /dashboard/anomalies — list alerts with pagination
  router.get('/anomalies', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ data: [], pagination: { has_more: false, cursor: null } });
    }

    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    const status = c.req.query('status'); // open | acknowledged | resolved
    const limit = Math.min(Number(c.req.query('limit')) || 50, 200);
    const cursor = c.req.query('cursor');

    const conditions = [eq(anomalyAlerts.projectId, projectId)];

    if (status) {
      conditions.push(eq(anomalyAlerts.status, status));
    }

    if (cursor) {
      try {
        const cursorDate = new Date(Buffer.from(cursor, 'base64').toString());
        conditions.push(sql`${anomalyAlerts.createdAt} < ${cursorDate.toISOString()}`);
      } catch {
        // Invalid cursor, ignore
      }
    }

    const alerts = await db
      .select()
      .from(anomalyAlerts)
      .where(and(...conditions))
      .orderBy(desc(anomalyAlerts.createdAt))
      .limit(limit + 1);

    const hasMore = alerts.length > limit;
    if (hasMore) alerts.pop();

    const lastAlert = alerts[alerts.length - 1];
    const nextCursor = lastAlert
      ? Buffer.from(lastAlert.createdAt.toISOString()).toString('base64')
      : null;

    return c.json({
      data: alerts.map((a) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        description: a.description,
        event_ids: a.eventIds,
        metadata: a.metadata,
        status: a.status,
        created_at: a.createdAt.toISOString(),
      })),
      pagination: {
        has_more: hasMore,
        cursor: hasMore ? nextCursor : null,
      },
    });
  });

  // PUT /dashboard/anomalies/:id/status — update alert status
  router.put('/anomalies/:id/status', async (c) => {
    const userProjects = c.get('projects');
    const alertId = c.req.param('id');
    const projectIds = userProjects.map((p) => p.id);

    const existing = await db
      .select({ id: anomalyAlerts.id, projectId: anomalyAlerts.projectId })
      .from(anomalyAlerts)
      .where(eq(anomalyAlerts.id, alertId))
      .limit(1);

    if (existing.length === 0 || !projectIds.includes(existing[0].projectId)) {
      return c.json({ code: 'NOT_FOUND', message: 'Anomaly alert not found' }, 404);
    }

    const body = await c.req.json();
    const validStatuses = ['open', 'acknowledged', 'resolved'];
    if (!body.status || !validStatuses.includes(body.status)) {
      return c.json({
        code: 'INVALID',
        message: `status must be one of: ${validStatuses.join(', ')}`,
      }, 400);
    }

    await db
      .update(anomalyAlerts)
      .set({ status: body.status })
      .where(eq(anomalyAlerts.id, alertId));

    return c.json({ ok: true, status: body.status });
  });

  // GET /dashboard/anomaly-settings — get detection settings
  router.get('/anomaly-settings', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ settings: DEFAULT_SETTINGS });
    }

    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const result = await db
      .select({ settings: anomalyDetectionSettings.settings })
      .from(anomalyDetectionSettings)
      .where(eq(anomalyDetectionSettings.projectId, projectId))
      .limit(1);

    if (result.length === 0) {
      return c.json({ settings: DEFAULT_SETTINGS });
    }

    // Merge stored settings with defaults for any missing keys
    const stored = result[0].settings as Record<string, unknown>;
    const merged = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(stored)) {
      if (key in merged) {
        (merged as Record<string, unknown>)[key] = {
          ...(merged as Record<string, unknown>)[key] as Record<string, unknown>,
          ...stored[key] as Record<string, unknown>,
        };
      }
    }

    return c.json({ settings: merged });
  });

  // PUT /dashboard/anomaly-settings — configure rules
  router.put('/anomaly-settings', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ code: 'NO_PROJECT', message: 'No project found' }, 400);
    }

    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    if (!body.settings || typeof body.settings !== 'object') {
      return c.json({ code: 'INVALID', message: 'settings object is required' }, 400);
    }

    const existing = await db
      .select({ id: anomalyDetectionSettings.id })
      .from(anomalyDetectionSettings)
      .where(eq(anomalyDetectionSettings.projectId, projectId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(anomalyDetectionSettings)
        .set({
          settings: body.settings,
          updatedAt: new Date(),
        })
        .where(eq(anomalyDetectionSettings.id, existing[0].id));
    } else {
      await db.insert(anomalyDetectionSettings).values({
        projectId,
        settings: body.settings,
      });
    }

    return c.json({ ok: true, settings: body.settings });
  });

  // ==========================================
  // PII Redaction Rules CRUD
  // ==========================================

  // GET /dashboard/redaction-rules — list rules for project
  router.get('/redaction-rules', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ data: [], built_in_patterns: BUILT_IN_PATTERNS });
    }

    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const rules = await db
      .select()
      .from(redactionRules)
      .where(eq(redactionRules.projectId, projectId))
      .orderBy(desc(redactionRules.createdAt));

    return c.json({
      data: rules.map((r) => ({
        id: r.id,
        field_path: r.fieldPath,
        pattern: r.pattern,
        replacement: r.replacement,
        enabled: r.enabled,
        created_at: r.createdAt.toISOString(),
      })),
      built_in_patterns: BUILT_IN_PATTERNS,
    });
  });

  // POST /dashboard/redaction-rules — create rule
  router.post('/redaction-rules', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ code: 'NO_PROJECT', message: 'No project found' }, 400);
    }

    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    if (!body.field_path || !body.pattern) {
      return c.json(
        { code: 'INVALID', message: 'field_path and pattern are required' },
        400
      );
    }

    // Validate regex
    try {
      new RegExp(body.pattern);
    } catch {
      return c.json({ code: 'INVALID', message: 'Invalid regex pattern' }, 400);
    }

    const [created] = await db
      .insert(redactionRules)
      .values({
        projectId,
        fieldPath: body.field_path,
        pattern: body.pattern,
        replacement: body.replacement ?? '[REDACTED]',
        enabled: body.enabled ?? true,
      })
      .returning();

    return c.json(
      {
        id: created.id,
        field_path: created.fieldPath,
        pattern: created.pattern,
        replacement: created.replacement,
        enabled: created.enabled,
        created_at: created.createdAt.toISOString(),
      },
      201
    );
  });

  // PUT /dashboard/redaction-rules/:id — update rule
  router.put('/redaction-rules/:id', async (c) => {
    const userProjects = c.get('projects');
    const ruleId = c.req.param('id');
    const projectIds = userProjects.map((p) => p.id);

    const existing = await db
      .select({ id: redactionRules.id, projectId: redactionRules.projectId })
      .from(redactionRules)
      .where(eq(redactionRules.id, ruleId))
      .limit(1);

    if (existing.length === 0 || !projectIds.includes(existing[0].projectId)) {
      return c.json({ code: 'NOT_FOUND', message: 'Redaction rule not found' }, 404);
    }

    const body = await c.req.json();
    const updates: Record<string, unknown> = {};
    if (body.field_path !== undefined) updates.fieldPath = body.field_path;
    if (body.pattern !== undefined) {
      try {
        new RegExp(body.pattern);
      } catch {
        return c.json({ code: 'INVALID', message: 'Invalid regex pattern' }, 400);
      }
      updates.pattern = body.pattern;
    }
    if (body.replacement !== undefined) updates.replacement = body.replacement;
    if (typeof body.enabled === 'boolean') updates.enabled = body.enabled;

    await db
      .update(redactionRules)
      .set(updates)
      .where(eq(redactionRules.id, ruleId));

    return c.json({ ok: true });
  });

  // DELETE /dashboard/redaction-rules/:id — delete rule
  router.delete('/redaction-rules/:id', async (c) => {
    const userProjects = c.get('projects');
    const ruleId = c.req.param('id');
    const projectIds = userProjects.map((p) => p.id);

    const existing = await db
      .select({ id: redactionRules.id, projectId: redactionRules.projectId })
      .from(redactionRules)
      .where(eq(redactionRules.id, ruleId))
      .limit(1);

    if (existing.length === 0 || !projectIds.includes(existing[0].projectId)) {
      return c.json({ code: 'NOT_FOUND', message: 'Redaction rule not found' }, 404);
    }

    await db.delete(redactionRules).where(eq(redactionRules.id, ruleId));

    return c.json({ ok: true });
  });

  // ==========================================
  // Signing Keys Management
  // ==========================================

  // GET /dashboard/signing-keys — list signing keys for project
  router.get('/signing-keys', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ data: [] });
    }

    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const keys = await db
      .select({
        id: signingKeys.id,
        publicKey: signingKeys.publicKey,
        algorithm: signingKeys.algorithm,
        createdAt: signingKeys.createdAt,
        revokedAt: signingKeys.revokedAt,
      })
      .from(signingKeys)
      .where(eq(signingKeys.projectId, projectId))
      .orderBy(desc(signingKeys.createdAt));

    return c.json({
      data: keys.map((k) => ({
        id: k.id,
        public_key: k.publicKey,
        algorithm: k.algorithm,
        is_active: k.revokedAt === null,
        created_at: k.createdAt.toISOString(),
        revoked_at: k.revokedAt?.toISOString() ?? null,
      })),
    });
  });

  // POST /dashboard/signing-keys — generate initial keypair
  router.post('/signing-keys', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ code: 'NO_PROJECT', message: 'No project found' }, 400);
    }

    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    // Check if there's already an active key
    const existing = await getActiveSigningKey(db, projectId);
    if (existing) {
      return c.json(
        { code: 'KEY_EXISTS', message: 'Active signing key already exists. Use rotate endpoint.' },
        409
      );
    }

    const result = await generateSigningKeypair(db, projectId);

    return c.json(
      {
        id: result.id,
        public_key: result.publicKey,
        algorithm: 'Ed25519',
        message: 'Signing key generated. Events will now be signed automatically.',
      },
      201
    );
  });

  // POST /dashboard/signing-keys/rotate — rotate signing key
  router.post('/signing-keys/rotate', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ code: 'NO_PROJECT', message: 'No project found' }, 400);
    }

    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const result = await rotateSigningKey(db, projectId);

    return c.json({
      id: result.id,
      public_key: result.publicKey,
      algorithm: 'Ed25519',
      message: 'Signing key rotated. Old key retained for historical verification.',
    });
  });

  // ==========================================
  // Compliance Reports
  // ==========================================

  // GET /dashboard/compliance-reports — list reports
  router.get('/compliance-reports', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ data: [] });
    }

    const projectId = getValidProjectId(c.req.query('project_id'), userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);

    const reports = await db
      .select({
        id: complianceReports.id,
        framework: complianceReports.framework,
        status: complianceReports.status,
        createdAt: complianceReports.createdAt,
      })
      .from(complianceReports)
      .where(eq(complianceReports.projectId, projectId))
      .orderBy(desc(complianceReports.createdAt));

    return c.json({
      data: reports.map((r) => ({
        id: r.id,
        framework: r.framework,
        status: r.status,
        created_at: r.createdAt.toISOString(),
      })),
    });
  });

  // POST /dashboard/compliance-reports — generate a report
  router.post('/compliance-reports', async (c) => {
    const userProjects = c.get('projects');
    if (userProjects.length === 0) {
      return c.json({ code: 'NO_PROJECT', message: 'No project found' }, 400);
    }

    const body = await c.req.json();
    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) return c.json({ code: 'FORBIDDEN', message: 'Invalid project access' }, 403);
    const framework = body.framework;

    const validFrameworks = ['soc2', 'hipaa', 'iso27001', 'gdpr'];
    if (!framework || !validFrameworks.includes(framework)) {
      return c.json(
        {
          code: 'INVALID',
          message: `framework must be one of: ${validFrameworks.join(', ')}`,
        },
        400
      );
    }

    try {
      const reportId = await generateComplianceReport(
        db,
        projectId,
        framework as 'soc2' | 'hipaa' | 'iso27001' | 'gdpr'
      );

      return c.json({ id: reportId, framework, status: 'completed' }, 201);
    } catch (err) {
      logger.error({ err }, 'Compliance report generation error');
      return c.json(
        { code: 'GENERATION_ERROR', message: 'Failed to generate compliance report' },
        500
      );
    }
  });

  // GET /dashboard/compliance-reports/:id — get report details
  router.get('/compliance-reports/:id', async (c) => {
    const userProjects = c.get('projects');
    const reportId = c.req.param('id');
    const projectIds = userProjects.map((p) => p.id);

    const result = await db
      .select()
      .from(complianceReports)
      .where(eq(complianceReports.id, reportId))
      .limit(1);

    if (result.length === 0 || !projectIds.includes(result[0].projectId)) {
      return c.json({ code: 'NOT_FOUND', message: 'Compliance report not found' }, 404);
    }

    const report = result[0];

    return c.json({
      id: report.id,
      framework: report.framework,
      status: report.status,
      report_data: report.reportData,
      created_at: report.createdAt.toISOString(),
    });
  });

  return router;
}
