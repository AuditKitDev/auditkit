import { Queue } from 'bullmq';
import { getRedis } from './redis.js';

let _queue: Queue | null = null;

export function getEventQueue(): Queue {
  if (!_queue) {
    _queue = new Queue('audit-events', {
      connection: getRedis() as never,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'custom',
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: false, // Keep failed jobs for DLQ inspection
      },
    });
  }
  return _queue;
}

export async function closeEventQueue(): Promise<void> {
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
}

// --- Job types ---

export interface WebhookJobData {
  type: 'webhook';
  projectId: string;
  eventPayload: Record<string, unknown>;
}

export interface SIEMJobData {
  type: 'siem';
  projectId: string;
  eventBody: Record<string, unknown>;
}

export interface NotificationJobData {
  type: 'notification';
  projectId: string;
  eventBody: Record<string, unknown>;
}

export interface AnomalyJobData {
  type: 'anomaly';
  projectId: string;
  event: {
    eventId: string;
    action: string;
    actorId: string;
    tenantId: string;
    sourceIp: string | null;
    ipCountry: string | null;
    severity: string;
    isFailure: boolean;
    metadata: Record<string, unknown>;
    occurredAt: string; // ISO string, serialized for queue
  };
}

export type AuditEventJobData = WebhookJobData | SIEMJobData | NotificationJobData | AnomalyJobData;

// --- Enqueue functions ---

export async function enqueueWebhookDelivery(
  projectId: string,
  eventPayload: Record<string, unknown>
): Promise<void> {
  const data: WebhookJobData = { type: 'webhook', projectId, eventPayload };
  await getEventQueue().add('webhook', data, {
    backoff: { type: 'exponential', delay: 1000 },
  });
}

export async function enqueueSIEMStream(
  projectId: string,
  eventBody: Record<string, unknown>
): Promise<void> {
  const data: SIEMJobData = { type: 'siem', projectId, eventBody };
  await getEventQueue().add('siem', data, {
    backoff: { type: 'exponential', delay: 1000 },
  });
}

export async function enqueueNotification(
  projectId: string,
  eventBody: Record<string, unknown>
): Promise<void> {
  const data: NotificationJobData = { type: 'notification', projectId, eventBody };
  await getEventQueue().add('notification', data, {
    backoff: { type: 'exponential', delay: 1000 },
  });
}

export async function enqueueAnomalyDetection(
  projectId: string,
  event: AnomalyJobData['event']
): Promise<void> {
  const data: AnomalyJobData = { type: 'anomaly', projectId, event };
  await getEventQueue().add('anomaly', data, {
    backoff: { type: 'exponential', delay: 1000 },
  });
}
