import { createMiddleware } from 'hono/factory';
import { eq, and, gte } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { idempotencyKeys } from '../db/schema.js';
import { logger } from '../services/logger.js';

/**
 * Idempotency middleware for POST/PUT requests.
 * Accepts an `Idempotency-Key` header and caches responses for 24 hours.
 * If a duplicate key is found, the cached response is returned immediately.
 */
export function idempotencyMiddleware(db: Database): ReturnType<typeof createMiddleware> {
  return createMiddleware(async (c, next) => {
    const method = c.req.method;

    // Only apply to POST and PUT requests
    if (method !== 'POST' && method !== 'PUT') {
      await next();
      return;
    }

    const idempotencyKey = c.req.header('Idempotency-Key');

    // If no key provided, skip idempotency logic
    if (!idempotencyKey) {
      await next();
      return;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    try {
      await db.insert(idempotencyKeys).values({
        key: idempotencyKey,
        responseStatus: 102,
        responseBody: '',
        responseHeaders: { 'Content-Type': 'application/json' },
        expiresAt,
      });
    } catch (err: unknown) {
      const isDuplicateKey = err instanceof Error && (
        err.message.includes('duplicate key') || err.message.includes('unique constraint')
      );

      if (!isDuplicateKey) {
        throw err;
      }

      const existing = await db
        .select({
          id: idempotencyKeys.id,
          responseStatus: idempotencyKeys.responseStatus,
          responseBody: idempotencyKeys.responseBody,
          responseHeaders: idempotencyKeys.responseHeaders,
          expiresAt: idempotencyKeys.expiresAt,
        })
        .from(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.key, idempotencyKey),
            gte(idempotencyKeys.expiresAt, new Date())
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw err;
      }

      const cached = existing[0];
      if (cached.responseStatus === 102) {
        return c.json(
          { code: 'IDEMPOTENCY_IN_PROGRESS', message: 'A request with this Idempotency-Key is already being processed' },
          409
        );
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Idempotency-Replay': 'true',
        ...(cached.responseHeaders as Record<string, string> ?? {}),
      };

      return new Response(cached.responseBody, {
        status: cached.responseStatus,
        headers,
      });
    }

    // Process the request
    try {
      await next();
    } catch (err) {
      await db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, idempotencyKey));
      throw err;
    }

    // Cache the response
    const response = c.res;
    const status = response.status;
    const body = await response.clone().text();

    try {
      await db
        .update(idempotencyKeys)
        .set({
          responseStatus: status,
          responseBody: body,
          responseHeaders: { 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' },
          expiresAt,
        })
        .where(eq(idempotencyKeys.key, idempotencyKey));
    } catch (err: unknown) {
      logger.warn({ err }, 'Failed to cache idempotency response');
    }
  });
}
