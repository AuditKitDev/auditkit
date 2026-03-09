import { createHash } from 'crypto';
import { eq, and, desc, asc, lt, gte, sql } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { auditEvents } from '../db/schema.js';

/**
 * Canonicalize metadata by sorting keys deterministically.
 */
function canonicalizeMetadata(metadata: Record<string, unknown>): string {
  const sorted = Object.keys(metadata)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = metadata[key];
        return acc;
      },
      {} as Record<string, unknown>
    );
  return JSON.stringify(sorted);
}

/**
 * Compute SHA-256 hash of an audit event chained to the previous hash.
 */
export function computeRowHash(
  event: {
    id: number | string;
    tenantId: string;
    action: string;
    actorId: string;
    targetType: string | null;
    targetId: string | null;
    occurredAt: Date | string;
    sourceIp: string | null;
    metadata: Record<string, unknown>;
  },
  prevHash: string | null
): string {
  const occurredAtStr =
    event.occurredAt instanceof Date ? event.occurredAt.toISOString() : event.occurredAt;

  const canonical = [
    String(event.id),
    event.tenantId,
    event.action,
    event.actorId,
    event.targetType ?? '',
    event.targetId ?? '',
    occurredAtStr,
    event.sourceIp ?? '',
    canonicalizeMetadata(event.metadata),
    prevHash ?? 'GENESIS',
  ].join('\x00');

  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Derive a numeric advisory lock key from a tenant UUID.
 * Uses the first 4 bytes of the SHA-256 hash as an unsigned 32-bit integer,
 * which fits safely in both a JS number and a pg_advisory_xact_lock bigint parameter.
 */
export function tenantLockKey(tenantId: string): number {
  const hash = createHash('sha256').update(tenantId).digest();
  return hash.readUInt32BE(0);
}

/**
 * Get the last hash in the chain for a tenant.
 * NOTE: This function performs an unlocked read. For safe concurrent writes,
 * use insertEventAtomically which acquires an advisory lock.
 */
export async function getLastHash(db: Database, tenantId: string): Promise<string | null> {
  const result = await db
    .select({ rowHash: auditEvents.rowHash })
    .from(auditEvents)
    .where(eq(auditEvents.tenantId, tenantId))
    .orderBy(desc(auditEvents.id))
    .limit(1);

  return result[0]?.rowHash ?? null;
}

/**
 * Insert an audit event atomically with hash chain integrity.
 *
 * Acquires a per-tenant advisory lock, reads the previous hash, inserts the
 * event, computes the real row hash (which depends on the auto-generated id),
 * and updates the row — all within a single serialised transaction.
 *
 * Because the advisory lock is transaction-scoped (pg_advisory_xact_lock),
 * it is automatically released on commit/rollback and concurrent transactions
 * for the same tenant are serialised, preventing chain forks.
 *
 * The intermediate 'computing' value for rowHash is never visible to other
 * transactions because it only exists inside the uncommitted transaction.
 */
export async function insertEventAtomically(
  db: Database,
  values: typeof auditEvents.$inferInsert,
  hashInput: {
    tenantId: string;
    action: string;
    actorId: string;
    targetType: string | null;
    targetId: string | null;
    occurredAt: Date;
    sourceIp: string | null;
    metadata: Record<string, unknown>;
  }
): Promise<{
  id: number;
  eventId: string;
  ingestedAt: Date;
  rowHash: string;
  prevHash: string | null;
}> {
  const lockKey = tenantLockKey(hashInput.tenantId);

  return await db.transaction(async (tx) => {
    // 1. Acquire per-tenant advisory lock (released automatically on commit)
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);

    // 2. Read previous hash within the locked transaction
    const prevResult = await tx
      .select({ rowHash: auditEvents.rowHash })
      .from(auditEvents)
      .where(eq(auditEvents.tenantId, hashInput.tenantId))
      .orderBy(desc(auditEvents.id))
      .limit(1);
    const prevHash = prevResult[0]?.rowHash ?? null;

    // 3. Insert the event with a temporary rowHash (invisible outside this tx)
    const inserted = await tx
      .insert(auditEvents)
      .values({
        ...values,
        prevHash,
        rowHash: 'computing', // never committed — updated below
      })
      .returning({
        id: auditEvents.id,
        eventId: auditEvents.eventId,
        ingestedAt: auditEvents.ingestedAt,
      });

    const event = inserted[0];

    // 4. Compute the real hash now that we have the auto-generated id
    const rowHash = computeRowHash(
      {
        id: event.id,
        ...hashInput,
      },
      prevHash
    );

    // 5. Update the row with the real hash
    await tx
      .update(auditEvents)
      .set({ rowHash })
      .where(eq(auditEvents.id, event.id));

    return {
      id: event.id,
      eventId: event.eventId,
      ingestedAt: event.ingestedAt,
      rowHash,
      prevHash,
    };
  });
}

/**
 * Verify the hash chain integrity for a tenant within a date range.
 */
export async function verifyChain(
  db: Database,
  tenantId: string,
  from?: Date,
  to?: Date
): Promise<{
  valid: boolean;
  eventsChecked: number;
  firstEvent: string | null;
  lastEvent: string | null;
  chainRootHash: string | null;
  brokenLinks: Array<{
    eventId: string;
    occurredAt: string;
    expected: string;
    actual: string;
  }>;
}> {
  const conditions = [eq(auditEvents.tenantId, tenantId)];
  if (from) conditions.push(gte(auditEvents.occurredAt, from));
  if (to) conditions.push(lt(auditEvents.occurredAt, to));

  const events = await db
    .select({
      id: auditEvents.id,
      eventId: auditEvents.eventId,
      tenantId: auditEvents.tenantId,
      action: auditEvents.action,
      actorId: auditEvents.actorId,
      targetType: auditEvents.targetType,
      targetId: auditEvents.targetId,
      occurredAt: auditEvents.occurredAt,
      sourceIp: auditEvents.sourceIp,
      metadata: auditEvents.metadata,
      prevHash: auditEvents.prevHash,
      rowHash: auditEvents.rowHash,
    })
    .from(auditEvents)
    .where(and(...conditions))
    .orderBy(asc(auditEvents.id));

  if (events.length === 0) {
    return {
      valid: true,
      eventsChecked: 0,
      firstEvent: null,
      lastEvent: null,
      chainRootHash: null,
      brokenLinks: [],
    };
  }

  const brokenLinks: Array<{
    eventId: string;
    occurredAt: string;
    expected: string;
    actual: string;
  }> = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Verify the hash chain link
    if (i > 0 && event.prevHash !== events[i - 1].rowHash) {
      brokenLinks.push({
        eventId: event.eventId,
        occurredAt: event.occurredAt.toISOString(),
        expected: events[i - 1].rowHash,
        actual: event.prevHash ?? 'null',
      });
    }

    // Verify the hash itself
    const computed = computeRowHash(
      {
        id: event.id,
        tenantId: event.tenantId,
        action: event.action,
        actorId: event.actorId,
        targetType: event.targetType,
        targetId: event.targetId,
        occurredAt: event.occurredAt,
        sourceIp: event.sourceIp,
        metadata: event.metadata ?? {},
      },
      event.prevHash
    );

    if (computed !== event.rowHash) {
      brokenLinks.push({
        eventId: event.eventId,
        occurredAt: event.occurredAt.toISOString(),
        expected: computed,
        actual: event.rowHash,
      });
    }
  }

  return {
    valid: brokenLinks.length === 0,
    eventsChecked: events.length,
    firstEvent: events[0].occurredAt.toISOString(),
    lastEvent: events[events.length - 1].occurredAt.toISOString(),
    chainRootHash: events[events.length - 1].rowHash,
    brokenLinks,
  };
}
