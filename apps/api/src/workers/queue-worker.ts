import { Worker, type Job } from 'bullmq';
import { getRedis } from '../services/redis.js';
import { deliverWebhooks } from './webhook-worker.js';
import { streamToSIEM } from '../services/siem.js';
import { evaluateNotificationRules } from '../services/notifications.js';
import { analyzeEvent } from '../services/anomaly-detection.js';
import type { AuditEventJobData } from '../services/event-queue.js';
import type { Database } from '../db/index.js';
import { logger } from '../services/logger.js';

let _worker: Worker | null = null;

/**
 * Custom backoff strategy: 1s, 5s, 30s
 */
function customBackoff(attemptsMade: number): number {
  const delays = [1_000, 5_000, 30_000];
  return delays[Math.min(attemptsMade - 1, delays.length - 1)];
}

export function startQueueWorker(db: Database): Worker {
  if (_worker) return _worker;

  _worker = new Worker<AuditEventJobData>(
    'audit-events',
    async (job: Job<AuditEventJobData>) => {
      const { data } = job;

      switch (data.type) {
        case 'webhook':
          await deliverWebhooks(db, data.projectId, data.eventPayload);
          break;

        case 'siem':
          await streamToSIEM(db, data.projectId, data.eventBody);
          break;

        case 'notification':
          await evaluateNotificationRules(db, data.projectId, data.eventBody);
          break;

        case 'anomaly':
          await analyzeEvent(db, data.projectId, {
            ...data.event,
            occurredAt: new Date(data.event.occurredAt),
          });
          break;

        default:
          logger.warn({ type: (data as Record<string, unknown>).type }, 'Unknown queue job type');
      }
    },
    {
      connection: getRedis() as never,
      concurrency: 10,
      settings: {
        backoffStrategy: customBackoff,
      },
    }
  );

  _worker.on('completed', (_job) => {
    // Successful processing — no action needed
  });

  _worker.on('failed', (job, err) => {
    if (job) {
      logger.error({ jobId: job.id, jobName: job.name, attempts: job.attemptsMade, err: err.message }, 'Queue job failed');

      // After all retries exhausted, move to DLQ by logging
      if (job.attemptsMade >= (job.opts?.attempts ?? 3)) {
        logger.error({ jobId: job.id, data: JSON.stringify(job.data).slice(0, 500) }, 'Job moved to dead letter (all retries exhausted)');
      }
    }
  });

  let lastErrorLog = 0;
  _worker.on('error', (err) => {
    // Throttle Redis connection errors to once per 60 seconds
    const now = Date.now();
    if (now - lastErrorLog > 60_000) {
      lastErrorLog = now;
      logger.error({ err: err.message }, 'Queue worker error');
    }
  });

  logger.info('BullMQ worker started for audit-events queue');
  return _worker;
}

export async function stopQueueWorker(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('BullMQ worker stopped');
  }
}
