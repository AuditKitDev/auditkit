import { eq, and, gte, sql } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { auditEvents } from '../db/schema.js';

export interface AnomalyResult {
  isAnomalous: boolean;
  reasons: string[];
}

interface EventContext {
  action: string;
  actorId: string;
  tenantId: string;
  sourceIp: string | null;
  ipCountry: string | null;
  severity: string;
  metadata: Record<string, unknown>;
  occurredAt: Date;
}

/**
 * Run heuristic anomaly detection rules on an incoming event.
 */
export async function detectAnomalies(
  db: Database,
  event: EventContext
): Promise<AnomalyResult> {
  const reasons: string[] = [];

  await Promise.all([
    checkNewIpCountry(db, event, reasons),
    checkRapidFire(db, event, reasons),
    checkFailedAuthBurst(db, event, reasons),
    checkBulkExport(event, reasons),
    checkPermissionEscalation(event, reasons),
  ]);

  return {
    isAnomalous: reasons.length > 0,
    reasons,
  };
}

/**
 * Actor logs in from a country they've never used before.
 */
async function checkNewIpCountry(
  db: Database,
  event: EventContext,
  reasons: string[]
): Promise<void> {
  if (!event.ipCountry || !event.actorId) return;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const knownCountries = await db
    .selectDistinct({ country: auditEvents.ipCountry })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.tenantId, event.tenantId),
        eq(auditEvents.actorId, event.actorId),
        gte(auditEvents.occurredAt, thirtyDaysAgo)
      )
    );

  const countries = knownCountries.map((r) => r.country).filter(Boolean);

  if (countries.length > 0 && !countries.includes(event.ipCountry)) {
    reasons.push('new_ip_country');
  }
}

/**
 * Same actor performs >50 actions in 1 minute.
 */
async function checkRapidFire(
  db: Database,
  event: EventContext,
  reasons: string[]
): Promise<void> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.tenantId, event.tenantId),
        eq(auditEvents.actorId, event.actorId),
        gte(auditEvents.occurredAt, oneMinuteAgo)
      )
    );

  if (result[0] && Number(result[0].count) > 50) {
    reasons.push('rapid_fire_actions');
  }
}

/**
 * >5 failed auth attempts in 5 minutes.
 */
async function checkFailedAuthBurst(
  db: Database,
  event: EventContext,
  reasons: string[]
): Promise<void> {
  if (event.action !== 'user.signed_in') return;

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.tenantId, event.tenantId),
        eq(auditEvents.actorId, event.actorId),
        eq(auditEvents.action, 'user.signed_in'),
        eq(auditEvents.isFailure, true),
        gte(auditEvents.occurredAt, fiveMinutesAgo)
      )
    );

  if (result[0] && Number(result[0].count) >= 5) {
    reasons.push('failed_auth_burst');
  }
}

/**
 * data.exported with >1000 records.
 */
function checkBulkExport(event: EventContext, reasons: string[]): void {
  if (event.action !== 'data.exported') return;

  const recordCount = event.metadata?.record_count ?? event.metadata?.recordCount;
  if (typeof recordCount === 'number' && recordCount > 1000) {
    reasons.push('bulk_data_export');
  }
}

/**
 * Permission escalation to admin/owner.
 */
function checkPermissionEscalation(event: EventContext, reasons: string[]): void {
  if (event.action !== 'permission.granted' && event.action !== 'user.role_changed') return;

  const newRole = event.metadata?.new_role ?? event.metadata?.newRole ?? event.metadata?.role;
  if (typeof newRole === 'string' && ['admin', 'owner', 'superadmin'].includes(newRole.toLowerCase())) {
    reasons.push('permission_escalation');
  }
}
