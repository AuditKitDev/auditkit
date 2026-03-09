import { eq, and, lt } from 'drizzle-orm';
import { retentionPolicies, auditEvents } from '../db/schema.js';
import type { Database } from '../db/index.js';
import { logger } from '../services/logger.js';

/**
 * Run retention cleanup: delete expired audit events based on retention policies.
 */
export async function runRetentionCleanup(db: Database): Promise<void> {
  try {
    logger.info('Starting retention cleanup');

    const policies = await db.select().from(retentionPolicies);

    for (const policy of policies) {
      try {
        // Skip policies with legal hold
        if (policy.legalHold) {
          logger.info({ policyId: policy.id }, 'Skipping retention policy (legal hold active)');
          continue;
        }

        const retentionDays = Number(policy.retentionDays);
        if (isNaN(retentionDays) || retentionDays <= 0) {
          logger.info({ policyId: policy.id, retentionDays: policy.retentionDays }, 'Skipping retention policy (invalid retention_days)');
          continue;
        }

        const cutoffDate = new Date(
          Date.now() - retentionDays * 24 * 60 * 60 * 1000
        );

        // Build conditions
        const conditions = [
          eq(auditEvents.projectId, policy.projectId),
          lt(auditEvents.occurredAt, cutoffDate),
        ];

        // If tenantId is set on the policy, also filter by tenantId
        if (policy.tenantId) {
          conditions.push(eq(auditEvents.tenantId, policy.tenantId));
        }

        const result = await db
          .delete(auditEvents)
          .where(and(...conditions))
          .returning({ id: auditEvents.id });

        const deletedCount = result.length;

        if (deletedCount > 0) {
          logger.info(
            { deletedCount, projectId: policy.projectId, tenantId: policy.tenantId ?? undefined, retentionDays },
            'Deleted expired audit events'
          );
        }
      } catch (err) {
        logger.error({ err, policyId: policy.id }, 'Error processing retention policy');
      }
    }

    logger.info('Retention cleanup complete');
  } catch (err) {
    logger.error({ err }, 'Error in runRetentionCleanup');
  }
}

/**
 * Start the retention cleanup cron on a 1-hour interval.
 */
export function startRetentionCron(db: Database): void {
  logger.info('Retention cron starting (every 1 hour)');
  const interval = setInterval(() => {
    runRetentionCleanup(db).catch((err) => {
      logger.error({ err }, 'Retention cron error');
    });
  }, 60 * 60 * 1000); // 1 hour
  interval.unref();
}
