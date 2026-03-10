import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

/**
 * Simple sliding-window rate limiter for auth endpoints.
 * Uses in-memory Map (no Redis dependency) — suitable for single-instance deployments.
 * For multi-instance, swap to Redis-backed.
 */

interface WindowEntry {
  timestamps: number[];
}

const windows = new Map<string, WindowEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [key, entry] of windows) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);
    if (entry.timestamps.length === 0) {
      windows.delete(key);
    }
  }
}, 300_000).unref();

function isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = windows.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    windows.set(key, entry);
  }

  // Remove timestamps outside window
  entry.timestamps = entry.timestamps.filter(t => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    return false;
  }

  entry.timestamps.push(now);
  return true;
}

/**
 * Rate limit auth endpoints by IP + path.
 *
 * Limits:
 * - POST /auth/login:          10 attempts per minute
 * - POST /auth/signup:          5 attempts per minute
 * - POST /auth/forgot-password: 3 attempts per minute
 * - POST /auth/reset-password:  5 attempts per minute
 * - POST /auth/send-verification: 3 attempts per minute
 * - Default:                   30 per minute
 */
const ROUTE_LIMITS: Record<string, number> = {
  '/login': 10,
  '/signup': 5,
  '/forgot-password': 3,
  '/reset-password': 5,
  '/send-verification': 3,
};

const WINDOW_MS = 60_000; // 1 minute

export const authRateLimitMiddleware = createMiddleware(async (c, next) => {
  if (c.req.method !== 'POST') {
    return next();
  }

  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || 'unknown';

  const path = new URL(c.req.url).pathname.replace('/auth', '');
  const maxRequests = ROUTE_LIMITS[path] ?? 30;

  const key = `auth:${ip}:${path}`;

  if (!isAllowed(key, maxRequests, WINDOW_MS)) {
    throw new HTTPException(429, {
      message: 'Too many requests. Please try again later.',
    });
  }

  await next();
});
