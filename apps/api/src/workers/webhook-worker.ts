import { createHmac } from 'crypto';
import { eq, and, lte, lt, sql } from 'drizzle-orm';
import { webhookEndpoints, webhookDeliveries } from '../db/schema.js';
import type { Database } from '../db/index.js';
import { logger } from '../services/logger.js';

const WEBHOOK_RETRY_LOCK_KEY = 4_274_201;
let retryLoopInFlight = false;

/**
 * Check if an event action matches a webhook endpoint's event filter.
 * Supports '*' for all events, or glob patterns like 'document.*'
 */
function matchesEventFilter(action: string, filters: string[]): boolean {
  for (const filter of filters) {
    if (filter === '*') return true;
    if (filter === action) return true;
    // Glob matching: 'document.*' matches 'document.created', 'document.updated', etc.
    if (filter.includes('*')) {
      const escaped = filter
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\*/g, '.*');
      const regex = new RegExp('^' + escaped + '$');
      if (regex.test(action)) return true;
    }
  }
  return false;
}

/**
 * Compute HMAC-SHA256 signature for webhook payload.
 */
function computeSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Deliver a single webhook to an endpoint. Returns success status.
 */
async function deliverToEndpoint(
  db: Database,
  endpoint: { id: string; url: string; secret: string },
  eventId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const body = JSON.stringify(payload);
  const timestamp = new Date().toISOString();
  const signature = computeSignature(body, endpoint.secret);

  // Create delivery record
  const [delivery] = await db
    .insert(webhookDeliveries)
    .values({
      endpointId: endpoint.id,
      eventId,
      payload,
      attempt: '1',
    })
    .returning({ id: webhookDeliveries.id });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AuditKit-Signature': signature,
        'X-AuditKit-Event-ID': eventId,
        'X-AuditKit-Timestamp': timestamp,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseBody = await response.text().catch(() => '');

    if (response.ok) {
      // Success
      await db
        .update(webhookDeliveries)
        .set({
          responseStatus: String(response.status),
          responseBody: responseBody.slice(0, 1000),
          deliveredAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, delivery.id));

      await db
        .update(webhookEndpoints)
        .set({
          lastSuccessAt: new Date(),
          failureCount: '0',
        })
        .where(eq(webhookEndpoints.id, endpoint.id));
    } else {
      // HTTP error
      await handleDeliveryFailure(
        db,
        delivery.id,
        endpoint.id,
        String(response.status),
        responseBody.slice(0, 1000),
        1
      );
    }
  } catch (err) {
    // Network/timeout error
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await handleDeliveryFailure(
      db,
      delivery.id,
      endpoint.id,
      null,
      errorMessage,
      1
    );
  }
}

/**
 * Handle a failed delivery: update records, schedule retry.
 */
async function handleDeliveryFailure(
  db: Database,
  deliveryId: string,
  endpointId: string,
  responseStatus: string | null,
  responseBody: string,
  attempt: number
): Promise<void> {
  // Exponential backoff: 1min, 5min, 15min, 1hr, 4hr
  const backoffMinutes = [1, 5, 15, 60, 240];
  const nextRetry =
    attempt < 5
      ? new Date(Date.now() + backoffMinutes[attempt - 1] * 60_000)
      : null;

  await db
    .update(webhookDeliveries)
    .set({
      responseStatus: responseStatus ?? 'error',
      responseBody,
      nextRetryAt: nextRetry,
    })
    .where(eq(webhookDeliveries.id, deliveryId));

  // Increment failure count on the endpoint
  const [endpoint] = await db
    .select({ failureCount: webhookEndpoints.failureCount })
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.id, endpointId))
    .limit(1);

  const newFailureCount = (Number(endpoint?.failureCount) || 0) + 1;

  await db
    .update(webhookEndpoints)
    .set({
      failureCount: String(newFailureCount),
      lastFailureAt: new Date(),
    })
    .where(eq(webhookEndpoints.id, endpointId));
}

/**
 * Fire-and-forget webhook delivery for a newly ingested event.
 * Call this WITHOUT awaiting from the events route.
 */
export function deliverWebhooks(
  db: Database,
  projectId: string,
  eventPayload: Record<string, unknown>
): Promise<void> {
  // Fire-and-forget: run async but don't block
  return (async () => {
    try {
      const eventId = String(eventPayload.event_id ?? eventPayload.id ?? '');
      const action = String(eventPayload.action ?? '');

      // Find all active webhook endpoints for this project
      const endpoints = await db
        .select({
          id: webhookEndpoints.id,
          url: webhookEndpoints.url,
          secret: webhookEndpoints.secret,
          events: webhookEndpoints.events,
        })
        .from(webhookEndpoints)
        .where(
          and(
            eq(webhookEndpoints.projectId, projectId),
            eq(webhookEndpoints.isActive, true)
          )
        );

      // Deliver to each matching endpoint
      for (const endpoint of endpoints) {
        if (matchesEventFilter(action, endpoint.events)) {
          try {
            await deliverToEndpoint(db, endpoint, eventId, eventPayload);
          } catch (err) {
            logger.error({ err, endpointId: endpoint.id }, 'Failed to deliver to webhook endpoint');
          }
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error in deliverWebhooks');
    }
  })();
}

/**
 * Process webhook delivery retries. Finds failed deliveries that are due
 * for retry and attempts redelivery.
 */
export async function processRetries(db: Database): Promise<void> {
  if (retryLoopInFlight) {
    return;
  }

  retryLoopInFlight = true;
  try {
    const lockResult = await db.execute(sql<{ locked: boolean }>`
      SELECT pg_try_advisory_lock(${WEBHOOK_RETRY_LOCK_KEY}) AS locked
    `);
    const locked = Boolean(lockResult[0]?.locked);
    if (!locked) {
      return;
    }

    const now = new Date();

    // Find deliveries due for retry (attempt < 5, nextRetryAt <= now)
    const pendingRetries = await db
      .select({
        id: webhookDeliveries.id,
        endpointId: webhookDeliveries.endpointId,
        eventId: webhookDeliveries.eventId,
        payload: webhookDeliveries.payload,
        attempt: webhookDeliveries.attempt,
      })
      .from(webhookDeliveries)
      .where(
        and(
          lte(webhookDeliveries.nextRetryAt, now),
          lt(webhookDeliveries.attempt, '5')
        )
      )
      .limit(100);

    for (const delivery of pendingRetries) {
      try {
        // Look up endpoint
        const [endpoint] = await db
          .select({
            id: webhookEndpoints.id,
            url: webhookEndpoints.url,
            secret: webhookEndpoints.secret,
            isActive: webhookEndpoints.isActive,
          })
          .from(webhookEndpoints)
          .where(eq(webhookEndpoints.id, delivery.endpointId))
          .limit(1);

        if (!endpoint || !endpoint.isActive) {
          // Clear retry if endpoint is gone or inactive
          await db
            .update(webhookDeliveries)
            .set({ nextRetryAt: null })
            .where(eq(webhookDeliveries.id, delivery.id));
          continue;
        }

        const attempt = Number(delivery.attempt) + 1;
        const body = JSON.stringify(delivery.payload);
        const timestamp = new Date().toISOString();
        const signature = computeSignature(body, endpoint.secret);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);

        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AuditKit-Signature': signature,
            'X-AuditKit-Event-ID': delivery.eventId,
            'X-AuditKit-Timestamp': timestamp,
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseBody = await response.text().catch(() => '');

        if (response.ok) {
          // Success
          await db
            .update(webhookDeliveries)
            .set({
              attempt: String(attempt),
              responseStatus: String(response.status),
              responseBody: responseBody.slice(0, 1000),
              deliveredAt: new Date(),
              nextRetryAt: null,
            })
            .where(eq(webhookDeliveries.id, delivery.id));

          await db
            .update(webhookEndpoints)
            .set({
              lastSuccessAt: new Date(),
              failureCount: '0',
            })
            .where(eq(webhookEndpoints.id, endpoint.id));
        } else {
          // Still failing
          const backoffMinutes = [1, 5, 15, 60, 240];
          const nextRetry =
            attempt < 5
              ? new Date(Date.now() + backoffMinutes[attempt - 1] * 60_000)
              : null;

          await db
            .update(webhookDeliveries)
            .set({
              attempt: String(attempt),
              responseStatus: String(response.status),
              responseBody: responseBody.slice(0, 1000),
              nextRetryAt: nextRetry,
            })
            .where(eq(webhookDeliveries.id, delivery.id));

          // If max attempts reached, mark endpoint inactive
          if (attempt >= 5) {
            await db
              .update(webhookEndpoints)
              .set({ isActive: false })
              .where(eq(webhookEndpoints.id, endpoint.id));
            logger.info({ endpointId: endpoint.id }, 'Webhook endpoint deactivated after 5 failed attempts');
          }
        }
      } catch (err) {
        // Network/timeout error on retry
        const attempt = Number(delivery.attempt) + 1;
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        const backoffMinutes = [1, 5, 15, 60, 240];
        const nextRetry =
          attempt < 5
            ? new Date(Date.now() + backoffMinutes[attempt - 1] * 60_000)
            : null;

        await db
          .update(webhookDeliveries)
          .set({
            attempt: String(attempt),
            responseStatus: 'error',
            responseBody: errorMessage,
            nextRetryAt: nextRetry,
          })
          .where(eq(webhookDeliveries.id, delivery.id));

        if (attempt >= 5) {
          await db
            .update(webhookEndpoints)
            .set({ isActive: false })
            .where(eq(webhookEndpoints.id, delivery.endpointId));
          logger.info({ endpointId: delivery.endpointId }, 'Webhook endpoint deactivated after 5 failed attempts');
        }
      }
    }
    await db.execute(sql`SELECT pg_advisory_unlock(${WEBHOOK_RETRY_LOCK_KEY})`);
  } catch (err) {
    logger.error({ err }, 'Error in webhook processRetries');
    try {
      await db.execute(sql`SELECT pg_advisory_unlock(${WEBHOOK_RETRY_LOCK_KEY})`);
    } catch {
      // Best-effort unlock
    }
  } finally {
    retryLoopInFlight = false;
  }
}

/**
 * Start the webhook retry processor on a 60-second interval.
 */
export function startWebhookRetries(db: Database): void {
  logger.info('Webhook retry processor starting (every 60s)');
  const interval = setInterval(() => {
    processRetries(db).catch((err) => {
      logger.error({ err }, 'Webhook retry processor error');
    });
  }, 60_000);
  interval.unref();
}
