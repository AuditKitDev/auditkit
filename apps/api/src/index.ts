import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { serve } from '@hono/node-server';
import { db } from './db/index.js';
import { authMiddleware } from './middleware/auth.js';
import { sessionAuthMiddleware } from './middleware/session-auth.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { createAuthRouter } from './routes/auth.js';
import { createDashboardRouter } from './routes/dashboard.js';
import { createEventsRouter } from './routes/events.js';
import { createTenantsRouter } from './routes/tenants.js';
import { createViewerTokensRouter } from './routes/viewer-tokens.js';
import { createVerifyRouter } from './routes/verify.js';
import { createWebhooksRouter } from './routes/webhooks.js';
import { createGraphQLRouter } from './routes/graphql.js';
import { createBillingRouter, createBillingWebhookRouter } from './routes/billing.js';
import { createSSERouter } from './routes/sse.js';
import { createExportRouter } from './routes/export.js';
import { createTeamRouter } from './routes/team.js';
import { createSysadminRouter } from './routes/sysadmin.js';
import { createOpenApiRouter } from './openapi.js';
import { idempotencyMiddleware } from './middleware/idempotency.js';
import { authRateLimitMiddleware } from './middleware/auth-rate-limit.js';
import { startWebhookRetries } from './workers/webhook-worker.js';
import { startRetentionCron } from './workers/retention-cron.js';
import { startMerkleBatchCron } from './services/merkle.js';
import { startQueueWorker, stopQueueWorker } from './workers/queue-worker.js';
import { closeRedis } from './services/redis.js';
import { closeEventQueue } from './services/event-queue.js';
import { logger } from './services/logger.js';
import { initAdminLog } from './services/admin-log.js';

const app = new Hono();
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = Array.from(new Set([
  ...(!isProduction ? ['http://localhost:3000', 'http://localhost:3100', 'http://localhost:3200'] : []),
  process.env.FRONTEND_URL,
  process.env.E2E_WEB_URL,
  ...(process.env.ALLOWED_ORIGINS?.split(',') ?? []),
].filter((origin): origin is string => Boolean(origin))));

// --- Global Middleware ---
app.use('*', cors({
  origin: allowedOrigins,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'stripe-signature', 'X-Requested-With'],
  maxAge: 3600,
}));
app.use('*', requestIdMiddleware);
app.use('*', honoLogger());

// --- Health Check ---
const API_VERSION = process.env.API_VERSION || '0.1.0';
app.get('/health', (c) => c.json({ status: 'ok', version: API_VERSION }));

// --- Body size limit for non-API routes (1MB default) ---
app.use('/auth/*', bodyLimit({
  maxSize: 1 * 1024 * 1024,
  onError: (c) => c.json({ code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds 1MB limit' }, 413),
}));
app.use('/dashboard/*', bodyLimit({
  maxSize: 1 * 1024 * 1024,
  onError: (c) => c.json({ code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds 1MB limit' }, 413),
}));

// --- Auth Routes (unauthenticated, rate-limited) ---
app.use('/auth/*', authRateLimitMiddleware);
app.route('/auth', createAuthRouter(db));

// --- Dashboard Routes (session-auth protected) ---
const dashboard = new Hono();
dashboard.use('*', sessionAuthMiddleware(db));
dashboard.route('/', createDashboardRouter(db));
dashboard.route('/exports', createExportRouter(db));
dashboard.route('/team', createTeamRouter(db));
dashboard.route('/sysadmin', createSysadminRouter(db));
app.route('/dashboard', dashboard);

// --- Stripe Webhook (no auth — Stripe sends signature, must be before auth middleware) ---
app.route('/billing', createBillingWebhookRouter(db));

// --- Billing Routes (session-auth protected) ---
const billing = new Hono();
billing.use('*', sessionAuthMiddleware(db));
billing.route('/', createBillingRouter(db));
app.route('/billing', billing);

// --- OpenAPI Spec (unauthenticated) ---
app.route('/v1', createOpenApiRouter());

// --- API v1 (authenticated) ---
const v1 = new Hono();

// Body size limits (defense against oversized payloads)
// 10MB limit for bulk event endpoint — must be registered before the default
v1.use('/events/bulk', bodyLimit({
  maxSize: 10 * 1024 * 1024, // 10MB
  onError: (c) => c.json({ code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds 10MB limit' }, 413),
}));
// 1MB default for all other endpoints
v1.use('*', bodyLimit({
  maxSize: 1 * 1024 * 1024, // 1MB
  onError: (c) => c.json({ code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds 1MB limit' }, 413),
}));

v1.use('*', authMiddleware(db));
v1.use('*', rateLimitMiddleware(db));
v1.use('*', idempotencyMiddleware(db));

// Events (SSE must be mounted before the events CRUD so /events/stream matches first)
v1.route('/events', createSSERouter());
v1.route('/events', createEventsRouter(db));

// Tenants
v1.route('/tenants', createTenantsRouter(db));

// Viewer Tokens
v1.route('/viewer-tokens', createViewerTokensRouter(db));

// Verify
v1.route('/verify', createVerifyRouter(db));

// Webhooks
v1.route('/webhooks', createWebhooksRouter(db));

// GraphQL
v1.route('/graphql', createGraphQLRouter(db));

// Mount v1
app.route('/v1', v1);

// --- Error Handler ---
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        code: 'HTTP_ERROR',
        message: err.message,
        status: err.status,
      },
      err.status
    );
  }

  logger.error({ err }, 'Unhandled error');
  return c.json(
    {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      status: 500,
    },
    500
  );
});

// --- 404 Handler ---
app.notFound((c) => {
  return c.json(
    {
      code: 'NOT_FOUND',
      message: 'Route not found',
      status: 404,
    },
    404
  );
});

// --- Start Server ---
const port = Number(process.env.PORT) || 3001;

initAdminLog(db);
logger.info({ port }, 'AuditKit API starting');

serve({
  fetch: app.fetch,
  port,
});

logger.info({ port, url: `http://localhost:${port}` }, 'AuditKit API running');

// --- Start Background Workers ---
startWebhookRetries(db);
startRetentionCron(db);
startMerkleBatchCron(db);
startQueueWorker(db);

// --- Graceful Shutdown ---
async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, shutting down gracefully');
  try {
    await stopQueueWorker();
    await closeEventQueue();
    await closeRedis();
    logger.info('All connections closed');
  } catch (err) {
    logger.error({ err }, 'Error during shutdown cleanup');
  }
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default app;
export type AppType = typeof app;
