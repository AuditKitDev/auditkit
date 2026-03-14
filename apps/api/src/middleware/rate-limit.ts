import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { eq } from 'drizzle-orm';
import type Redis from 'ioredis';
import type { AuthContext } from './auth.js';
import type { Database } from '../db/index.js';
import { projects, subscriptions } from '../db/schema.js';
import { getRedis } from '../services/redis.js';
import { incrementUsage, getUsage } from '../services/usage-tracking.js';
import { logger } from '../services/logger.js';

// --- Plan tier definitions ---

type PlanTier = 'free' | 'pro' | 'business' | 'supersize';

interface PlanLimits {
  writePerMin: number;
  readPerMin: number;
  monthlyEvents: number; // -1 = unlimited
}

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free:      { writePerMin: 100,   readPerMin: 50,   monthlyEvents: 1_000 },
  pro:       { writePerMin: 500,   readPerMin: 200,  monthlyEvents: 50_000 },
  business:  { writePerMin: 2_000, readPerMin: 500,  monthlyEvents: 500_000 },
  supersize: { writePerMin: 10_000, readPerMin: 2_000, monthlyEvents: 5_000_000 },
};

// --- Plan cache (avoid DB lookup every request) ---

interface PlanCacheEntry {
  plan: PlanTier;
  cachedAt: number;
}

const planCache = new Map<string, PlanCacheEntry>();
const PLAN_CACHE_TTL = 10_000; // 10 seconds

// --- Monthly usage Redis cache TTL ---
const MONTHLY_USAGE_CACHE_TTL = 30; // seconds

function getMonthlyResetDate(): Date {
  const now = new Date();
  // 1st of next month
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

async function lookupPlan(db: Database, projectId: string): Promise<PlanTier> {
  // Check cache first
  const cached = planCache.get(projectId);
  if (cached && Date.now() - cached.cachedAt < PLAN_CACHE_TTL) {
    return cached.plan;
  }

  try {
    // Look up project -> userId -> subscription
    const projectResult = await db
      .select({ userId: projects.userId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (projectResult.length === 0) {
      planCache.set(projectId, { plan: 'free', cachedAt: Date.now() });
      return 'free';
    }

    const userId = projectResult[0].userId;

    const subResult = await db
      .select({ plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    const plan = (subResult.length > 0 && subResult[0].plan in PLAN_LIMITS)
      ? (subResult[0].plan as PlanTier)
      : 'free';

    planCache.set(projectId, { plan, cachedAt: Date.now() });
    return plan;
  } catch {
    // Graceful fallback if subscriptions table doesn't exist yet
    planCache.set(projectId, { plan: 'free', cachedAt: Date.now() });
    return 'free';
  }
}

// --- Redis sliding window rate limiting ---

async function checkRateLimit(
  redis: Redis,
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowSeconds = Math.ceil(windowMs / 1000);

  // Atomic: INCR first, then check result
  const count = await redis.incr(key);

  if (count === 1) {
    // First request in this window — set TTL
    await redis.expire(key, windowSeconds);
  }

  if (count > limit) {
    const ttl = await redis.pttl(key);
    const resetAt = now + (ttl > 0 ? ttl : windowMs);
    return { allowed: false, remaining: 0, resetAt };
  }

  const ttl = await redis.pttl(key);
  const resetAt = now + (ttl > 0 ? ttl : windowMs);
  return { allowed: true, remaining: limit - count, resetAt };
}

// --- Get cached monthly usage from Redis, falling back to DB ---

async function getCachedMonthlyUsage(
  redis: Redis,
  db: Database,
  projectId: string
): Promise<number> {
  const cacheKey = `mu:${projectId}`;
  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    return Number(cached);
  }

  // Cache miss — load from DB
  const usage = await getUsage(db, projectId);
  await redis.set(cacheKey, String(usage), 'EX', MONTHLY_USAGE_CACHE_TTL);
  return usage;
}

// --- Invalidate monthly usage cache after increment ---

async function incrementAndCacheUsage(
  redis: Redis,
  db: Database,
  projectId: string
): Promise<number> {
  const newCount = await incrementUsage(db, projectId);
  const cacheKey = `mu:${projectId}`;
  await redis.set(cacheKey, String(newCount), 'EX', MONTHLY_USAGE_CACHE_TTL);
  return newCount;
}

export function rateLimitMiddleware(db: Database) {
  return createMiddleware<{ Variables: { auth: AuthContext } }>(async (c, next) => {
    const auth = c.get('auth');
    const method = c.req.method;
    const isWrite = method === 'POST' || method === 'PUT' || method === 'PATCH';
    const limitType = isWrite ? 'write' : 'read';

    // Look up plan
    const plan = await lookupPlan(db, auth.projectId);
    const limits = PLAN_LIMITS[plan];

    try {
      const redis = getRedis();

      // --- Per-minute sliding window (Redis) ---
      const windowKey = `rl:${auth.projectId}:${limitType}`;
      const windowMs = 60_000;
      const perMinLimit = isWrite ? limits.writePerMin : limits.readPerMin;

      const rl = await checkRateLimit(redis, windowKey, perMinLimit, windowMs);

      if (!rl.allowed) {
        c.header('X-RateLimit-Limit', String(perMinLimit));
        c.header('X-RateLimit-Remaining', '0');
        c.header('X-RateLimit-Reset', String(Math.ceil(rl.resetAt / 1000)));
        throw new HTTPException(429, { message: 'Rate limit exceeded' });
      }

      c.header('X-RateLimit-Limit', String(perMinLimit));
      c.header('X-RateLimit-Remaining', String(Math.max(0, rl.remaining)));
      c.header('X-RateLimit-Reset', String(Math.ceil(rl.resetAt / 1000)));

      // --- Monthly event quota (only for write operations) ---
      if (isWrite && limits.monthlyEvents !== -1) {
        const monthlyReset = getMonthlyResetDate();

        // Check current usage (Redis-cached, DB-backed)
        const currentUsage = await getCachedMonthlyUsage(redis, db, auth.projectId);

        if (currentUsage >= limits.monthlyEvents) {
          c.header('X-RateLimit-Monthly-Limit', String(limits.monthlyEvents));
          c.header('X-RateLimit-Monthly-Used', String(currentUsage));
          c.header('X-RateLimit-Monthly-Reset', monthlyReset.toISOString());
          throw new HTTPException(429, { message: 'Monthly event quota exceeded' });
        }

        // Increment usage (reserve quota before processing)
        const newUsage = await incrementAndCacheUsage(redis, db, auth.projectId);

        c.header('X-RateLimit-Monthly-Limit', String(limits.monthlyEvents));
        c.header('X-RateLimit-Monthly-Used', String(newUsage));
        c.header('X-RateLimit-Monthly-Reset', monthlyReset.toISOString());
      } else if (isWrite) {
        // Unlimited plan — still send headers
        c.header('X-RateLimit-Monthly-Limit', 'unlimited');
        c.header('X-RateLimit-Monthly-Used', '0');
        c.header('X-RateLimit-Monthly-Reset', getMonthlyResetDate().toISOString());
      }
    } catch (err) {
      // Re-throw intentional HTTP exceptions (429 rate limit)
      if (err instanceof HTTPException) throw err;
      // Redis unavailable — fail open, let the request through without rate limiting
      logger.warn({ err }, 'Rate limit Redis unavailable, failing open');
    }

    await next();
  });
}

// Clean up stale plan cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of planCache) {
    if (now - entry.cachedAt > PLAN_CACHE_TTL * 5) {
      planCache.delete(key);
    }
  }
}, 300_000).unref();
