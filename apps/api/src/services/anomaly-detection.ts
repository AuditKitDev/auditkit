import { eq, and, gte, sql, count } from 'drizzle-orm';
import {
  auditEvents,
  anomalyAlerts,
  anomalyBaselines,
  anomalyDetectionSettings,
} from '../db/schema.js';
import type { Database } from '../db/index.js';
import { logger } from './logger.js';

// ============================================
// Types
// ============================================

interface EventForAnalysis {
  eventId: string;
  action: string;
  actorId: string;
  tenantId: string;
  sourceIp: string | null;
  ipCountry: string | null;
  severity: string;
  isFailure: boolean;
  metadata: Record<string, unknown>;
  occurredAt: Date;
}

interface DetectionSettings {
  impossibleTravel: { enabled: boolean; windowMinutes: number };
  unusualVolume: { enabled: boolean; multiplier: number };
  privilegeEscalation: { enabled: boolean; actions: string[] };
  bulkDataExport: { enabled: boolean; maxActionsPerMinute: number };
  offHoursActivity: { enabled: boolean; startHour: number; endHour: number; timezone: string };
  newIpCountry: { enabled: boolean };
  failedActionSpike: { enabled: boolean; threshold: number; windowMinutes: number };
}

const DEFAULT_SETTINGS: DetectionSettings = {
  impossibleTravel: { enabled: true, windowMinutes: 60 },
  unusualVolume: { enabled: true, multiplier: 3 },
  privilegeEscalation: {
    enabled: true,
    actions: ['role.updated', 'permission.granted', 'admin.promoted', 'user.role_changed'],
  },
  bulkDataExport: { enabled: true, maxActionsPerMinute: 10 },
  offHoursActivity: { enabled: false, startHour: 9, endHour: 17, timezone: 'UTC' },
  newIpCountry: { enabled: true },
  failedActionSpike: { enabled: true, threshold: 10, windowMinutes: 5 },
};

// ============================================
// Settings helpers
// ============================================

async function getSettings(db: Database, projectId: string): Promise<DetectionSettings> {
  const result = await db
    .select({ settings: anomalyDetectionSettings.settings })
    .from(anomalyDetectionSettings)
    .where(eq(anomalyDetectionSettings.projectId, projectId))
    .limit(1);

  if (result.length === 0) return { ...DEFAULT_SETTINGS };

  const stored = result[0].settings as Partial<DetectionSettings>;
  return {
    impossibleTravel: { ...DEFAULT_SETTINGS.impossibleTravel, ...stored.impossibleTravel },
    unusualVolume: { ...DEFAULT_SETTINGS.unusualVolume, ...stored.unusualVolume },
    privilegeEscalation: { ...DEFAULT_SETTINGS.privilegeEscalation, ...stored.privilegeEscalation },
    bulkDataExport: { ...DEFAULT_SETTINGS.bulkDataExport, ...stored.bulkDataExport },
    offHoursActivity: { ...DEFAULT_SETTINGS.offHoursActivity, ...stored.offHoursActivity },
    newIpCountry: { ...DEFAULT_SETTINGS.newIpCountry, ...stored.newIpCountry },
    failedActionSpike: { ...DEFAULT_SETTINGS.failedActionSpike, ...stored.failedActionSpike },
  };
}

// ============================================
// Detection rules
// ============================================

/**
 * 1. Impossible travel: Same user from different countries within configured window.
 */
async function checkImpossibleTravel(
  db: Database,
  event: EventForAnalysis,
  settings: DetectionSettings
): Promise<string | null> {
  if (!settings.impossibleTravel.enabled) return null;
  if (!event.ipCountry || !event.actorId) return null;

  const windowMs = settings.impossibleTravel.windowMinutes * 60 * 1000;
  const windowStart = new Date(event.occurredAt.getTime() - windowMs);

  const recentCountries = await db
    .selectDistinct({ country: auditEvents.ipCountry })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.actorId, event.actorId),
        eq(auditEvents.tenantId, event.tenantId),
        gte(auditEvents.occurredAt, windowStart)
      )
    );

  const countries = recentCountries.map((r) => r.country).filter(Boolean) as string[];

  if (countries.length > 0 && !countries.includes(event.ipCountry)) {
    return 'impossible_travel';
  }

  return null;
}

/**
 * 2. Unusual volume: Event count exceeds N x baseline for the time window.
 */
async function checkUnusualVolume(
  db: Database,
  event: EventForAnalysis,
  projectId: string,
  settings: DetectionSettings
): Promise<string | null> {
  if (!settings.unusualVolume.enabled) return null;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [currentCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.projectId, projectId),
        gte(auditEvents.occurredAt, oneHourAgo)
      )
    );

  // Get baseline
  const baselineResult = await db
    .select({
      baselineValue: anomalyBaselines.baselineValue,
      stdDev: anomalyBaselines.stdDev,
    })
    .from(anomalyBaselines)
    .where(
      and(
        eq(anomalyBaselines.projectId, projectId),
        eq(anomalyBaselines.metric, 'hourly_event_count')
      )
    )
    .limit(1);

  if (baselineResult.length === 0) return null;

  const baseline = Number(baselineResult[0].baselineValue);
  if (baseline === 0) return null;

  const current = Number(currentCount.count);
  if (current > baseline * settings.unusualVolume.multiplier) {
    return 'unusual_volume';
  }

  return null;
}

/**
 * 3. Privilege escalation: Actions like role.updated, permission.granted, admin.promoted.
 */
function checkPrivilegeEscalation(
  event: EventForAnalysis,
  settings: DetectionSettings
): string | null {
  if (!settings.privilegeEscalation.enabled) return null;

  if (settings.privilegeEscalation.actions.includes(event.action)) {
    return 'privilege_escalation';
  }

  return null;
}

/**
 * 4. Bulk data export: High frequency of export/download actions in short window.
 */
async function checkBulkDataExport(
  db: Database,
  event: EventForAnalysis,
  settings: DetectionSettings
): Promise<string | null> {
  if (!settings.bulkDataExport.enabled) return null;

  const exportActions = ['data.exported', 'data.downloaded', 'export.created', 'file.downloaded', 'report.exported'];
  if (!exportActions.some((a) => event.action.includes(a) || event.action.includes('export') || event.action.includes('download'))) {
    return null;
  }

  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.actorId, event.actorId),
        eq(auditEvents.tenantId, event.tenantId),
        gte(auditEvents.occurredAt, oneMinuteAgo),
        sql`(${auditEvents.action} ILIKE '%export%' OR ${auditEvents.action} ILIKE '%download%')`
      )
    );

  if (Number(result.count) >= settings.bulkDataExport.maxActionsPerMinute) {
    return 'bulk_data_export';
  }

  return null;
}

/**
 * 5. Off-hours activity: Actions outside configured business hours.
 */
function checkOffHoursActivity(
  event: EventForAnalysis,
  settings: DetectionSettings
): string | null {
  if (!settings.offHoursActivity.enabled) return null;

  const hour = event.occurredAt.getUTCHours();
  const { startHour, endHour } = settings.offHoursActivity;

  if (startHour < endHour) {
    // Normal range: e.g. 9-17
    if (hour < startHour || hour >= endHour) {
      return 'off_hours_activity';
    }
  } else {
    // Wrapped range: e.g. 22-6 (night shift)
    if (hour >= endHour && hour < startHour) {
      return 'off_hours_activity';
    }
  }

  return null;
}

/**
 * 6. New IP/country: First-time access from unknown IP or country for a user.
 */
async function checkNewIpCountry(
  db: Database,
  event: EventForAnalysis,
  settings: DetectionSettings
): Promise<string | null> {
  if (!settings.newIpCountry.enabled) return null;
  if (!event.actorId) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const reasons: string[] = [];

  // Check new country
  if (event.ipCountry) {
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
      reasons.push('new_country');
    }
  }

  // Check new IP
  if (event.sourceIp) {
    const knownIps = await db
      .selectDistinct({ ip: auditEvents.sourceIp })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.tenantId, event.tenantId),
          eq(auditEvents.actorId, event.actorId),
          gte(auditEvents.occurredAt, thirtyDaysAgo)
        )
      );

    const ips = knownIps.map((r) => r.ip).filter(Boolean);
    if (ips.length > 0 && !ips.includes(event.sourceIp)) {
      reasons.push('new_ip');
    }
  }

  return reasons.length > 0 ? 'new_ip_country' : null;
}

/**
 * 7. Failed action spike: Surge in error-severity events.
 */
async function checkFailedActionSpike(
  db: Database,
  event: EventForAnalysis,
  projectId: string,
  settings: DetectionSettings
): Promise<string | null> {
  if (!settings.failedActionSpike.enabled) return null;
  if (!event.isFailure && event.severity !== 'error') return null;

  const windowMs = settings.failedActionSpike.windowMinutes * 60 * 1000;
  const windowStart = new Date(Date.now() - windowMs);

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.projectId, projectId),
        gte(auditEvents.occurredAt, windowStart),
        sql`(${auditEvents.isFailure} = true OR ${auditEvents.severity} = 'error')`
      )
    );

  if (Number(result.count) >= settings.failedActionSpike.threshold) {
    return 'failed_action_spike';
  }

  return null;
}

// ============================================
// Main entry points
// ============================================

/**
 * Run all anomaly detection rules against an incoming event.
 * Creates anomaly alerts in the database when rules fire.
 * Fire-and-forget: errors are caught and logged, never thrown.
 */
export function analyzeEvent(
  db: Database,
  projectId: string,
  event: EventForAnalysis
): Promise<void> {
  return (async () => {
    try {
      const settings = await getSettings(db, projectId);

      const results = await Promise.all([
        checkImpossibleTravel(db, event, settings),
        checkUnusualVolume(db, event, projectId, settings),
        Promise.resolve(checkPrivilegeEscalation(event, settings)),
        checkBulkDataExport(db, event, settings),
        Promise.resolve(checkOffHoursActivity(event, settings)),
        checkNewIpCountry(db, event, settings),
        checkFailedActionSpike(db, event, projectId, settings),
      ]);

      const triggered = results.filter(Boolean) as string[];

      for (const alertType of triggered) {
        const severityMap: Record<string, string> = {
          impossible_travel: 'high',
          unusual_volume: 'medium',
          privilege_escalation: 'high',
          bulk_data_export: 'medium',
          off_hours_activity: 'low',
          new_ip_country: 'low',
          failed_action_spike: 'medium',
        };

        const descriptionMap: Record<string, string> = {
          impossible_travel: `User ${event.actorId} accessed from ${event.ipCountry} — possible impossible travel detected`,
          unusual_volume: `Event volume for project exceeds baseline threshold`,
          privilege_escalation: `Privilege escalation action detected: ${event.action} by ${event.actorId}`,
          bulk_data_export: `High frequency of export/download actions detected for ${event.actorId}`,
          off_hours_activity: `Activity detected outside configured business hours by ${event.actorId}`,
          new_ip_country: `First-time access from new IP or country for user ${event.actorId}`,
          failed_action_spike: `Surge in failed actions detected for project`,
        };

        await db
          .insert(anomalyAlerts)
          .values({
            projectId,
            type: alertType,
            severity: severityMap[alertType] ?? 'medium',
            description: descriptionMap[alertType] ?? `Anomaly detected: ${alertType}`,
            eventIds: [event.eventId],
            metadata: {
              action: event.action,
              actorId: event.actorId,
              sourceIp: event.sourceIp,
              ipCountry: event.ipCountry,
              occurredAt: event.occurredAt.toISOString(),
            },
            status: 'open',
          })
          .catch((err) => {
            logger.error({ err, alertType }, 'Failed to create anomaly alert');
          });
      }
    } catch (err) {
      logger.error({ err }, 'Error analyzing event for anomalies');
    }
  })();
}

/**
 * Recalculate baselines for a project. Intended to run hourly.
 * Computes average and standard deviation for key metrics over the past 7 days.
 */
export async function updateBaselines(db: Database, projectId: string): Promise<void> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Hourly event count baseline
    const hourlyData = await db
      .select({
        hour: sql<string>`date_trunc('hour', ${auditEvents.occurredAt})`.as('hour'),
        count: count().as('count'),
      })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.projectId, projectId),
          gte(auditEvents.occurredAt, sevenDaysAgo)
        )
      )
      .groupBy(sql`date_trunc('hour', ${auditEvents.occurredAt})`);

    if (hourlyData.length > 0) {
      const counts = hourlyData.map((r) => r.count);
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      const variance = counts.reduce((sum, val) => sum + (val - avg) ** 2, 0) / counts.length;
      const stdDev = Math.sqrt(variance);

      await upsertBaseline(db, projectId, 'hourly_event_count', avg, stdDev);
    }

    // Hourly failure count baseline
    const failureData = await db
      .select({
        hour: sql<string>`date_trunc('hour', ${auditEvents.occurredAt})`.as('hour'),
        count: count().as('count'),
      })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.projectId, projectId),
          gte(auditEvents.occurredAt, sevenDaysAgo),
          sql`(${auditEvents.isFailure} = true OR ${auditEvents.severity} = 'error')`
        )
      )
      .groupBy(sql`date_trunc('hour', ${auditEvents.occurredAt})`);

    if (failureData.length > 0) {
      const counts = failureData.map((r) => r.count);
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      const variance = counts.reduce((sum, val) => sum + (val - avg) ** 2, 0) / counts.length;
      const stdDev = Math.sqrt(variance);

      await upsertBaseline(db, projectId, 'hourly_failure_count', avg, stdDev);
    }

    logger.info({ projectId }, 'Anomaly detection baselines updated');
  } catch (err) {
    logger.error({ err }, 'Error updating anomaly baselines');
  }
}

async function upsertBaseline(
  db: Database,
  projectId: string,
  metric: string,
  baselineValue: number,
  stdDev: number
): Promise<void> {
  const existing = await db
    .select({ id: anomalyBaselines.id })
    .from(anomalyBaselines)
    .where(
      and(
        eq(anomalyBaselines.projectId, projectId),
        eq(anomalyBaselines.metric, metric)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(anomalyBaselines)
      .set({
        baselineValue: String(baselineValue),
        stdDev: String(stdDev),
        lastUpdated: new Date(),
      })
      .where(eq(anomalyBaselines.id, existing[0].id));
  } else {
    await db.insert(anomalyBaselines).values({
      projectId,
      metric,
      baselineValue: String(baselineValue),
      stdDev: String(stdDev),
    });
  }
}

/**
 * Export DEFAULT_SETTINGS for use in routes (get/put settings).
 */
export { DEFAULT_SETTINGS };
export type { DetectionSettings };
