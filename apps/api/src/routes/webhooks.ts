import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { forbidViewerTokens, requireScope, type AuthContext } from '../middleware/auth.js';
import { webhookEndpoints, webhookDeliveries } from '../db/schema.js';
import type { Database } from '../db/index.js';

/**
 * Validate that a URL is a safe, public HTTP(S) URL.
 * Rejects non-http/https schemes and private/internal IPs.
 */
function validateWebhookUrl(urlStr: string): { valid: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'URL must use http or https protocol' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Reject localhost and loopback
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname === '0.0.0.0'
  ) {
    return { valid: false, error: 'URL must not point to a private/internal address' };
  }

  // Reject private IP ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (
      a === 10 ||                                     // 10.x.x.x
      (a === 172 && b >= 16 && b <= 31) ||            // 172.16-31.x.x
      (a === 192 && b === 168) ||                     // 192.168.x.x
      (a === 169 && b === 254)                        // 169.254.x.x
    ) {
      return { valid: false, error: 'URL must not point to a private/internal address' };
    }
  }

  // Reject IPv6 private ranges (fc00::/7 covers fc00:: and fd00::)
  if (hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('[fc') || hostname.startsWith('[fd')) {
    return { valid: false, error: 'URL must not point to a private/internal address' };
  }

  return { valid: true };
}

const VALID_EVENT_TYPES = ['event.created', 'event.anomaly', 'event.updated', 'event.deleted', '*'];

export function createWebhooksRouter(db: Database) {
  const router = new Hono<{ Variables: { auth: AuthContext } }>();
  router.use('*', forbidViewerTokens('Viewer tokens cannot manage webhooks'));

  // POST /v1/webhooks
  router.post('/', requireScope('write'), async (c) => {
    const auth = c.get('auth');
    const body = await c.req.json();

    if (!body.url) {
      return c.json({ code: 'MISSING_FIELD', message: 'url is required' }, 400);
    }

    const urlValidation = validateWebhookUrl(body.url);
    if (!urlValidation.valid) {
      return c.json({ code: 'INVALID_URL', message: urlValidation.error }, 400);
    }

    if (body.events !== undefined) {
      if (!Array.isArray(body.events) || !body.events.every((e: unknown) => typeof e === 'string')) {
        return c.json({ code: 'INVALID_FIELD', message: 'events must be an array of strings' }, 400);
      }
      if (!body.events.every((e: string) => VALID_EVENT_TYPES.includes(e))) {
        return c.json({ code: 'INVALID_FIELD', message: 'Invalid event type. Valid types: ' + VALID_EVENT_TYPES.join(', ') }, 400);
      }
    }

    const secret = `whsec_${randomBytes(24).toString('hex')}`;

    const created = await db
      .insert(webhookEndpoints)
      .values({
        projectId: auth.projectId,
        url: body.url,
        secret,
        events: body.events ?? ['*'],
        isActive: true,
      })
      .returning();

    return c.json(
      {
        id: created[0].id,
        url: created[0].url,
        secret,
        events: created[0].events,
        is_active: created[0].isActive,
        created_at: created[0].createdAt.toISOString(),
      },
      201
    );
  });

  // GET /v1/webhooks
  router.get('/', async (c) => {
    const auth = c.get('auth');

    const result = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.projectId, auth.projectId))
      .orderBy(desc(webhookEndpoints.createdAt));

    return c.json({
      data: result.map((w) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        is_active: w.isActive,
        failure_count: w.failureCount,
        last_success_at: w.lastSuccessAt?.toISOString() ?? null,
        last_failure_at: w.lastFailureAt?.toISOString() ?? null,
        created_at: w.createdAt.toISOString(),
      })),
    });
  });

  // PATCH /v1/webhooks/:id
  router.patch('/:id', requireScope('write'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');
    const body = await c.req.json();

    if (body.url !== undefined) {
      const urlValidation = validateWebhookUrl(body.url);
      if (!urlValidation.valid) {
        return c.json({ code: 'INVALID_URL', message: urlValidation.error }, 400);
      }
    }

    if (body.events !== undefined) {
      if (!Array.isArray(body.events) || !body.events.every((e: unknown) => typeof e === 'string')) {
        return c.json({ code: 'INVALID_FIELD', message: 'events must be an array of strings' }, 400);
      }
      if (!body.events.every((e: string) => VALID_EVENT_TYPES.includes(e))) {
        return c.json({ code: 'INVALID_FIELD', message: 'Invalid event type. Valid types: ' + VALID_EVENT_TYPES.join(', ') }, 400);
      }
    }

    const updated = await db
      .update(webhookEndpoints)
      .set({
        ...(body.url !== undefined && { url: body.url }),
        ...(body.events !== undefined && { events: body.events }),
        ...(body.is_active !== undefined && { isActive: body.is_active }),
      })
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.projectId, auth.projectId)))
      .returning();

    if (updated.length === 0) {
      return c.json({ code: 'NOT_FOUND', message: 'Webhook not found' }, 404);
    }

    return c.json({
      id: updated[0].id,
      url: updated[0].url,
      events: updated[0].events,
      is_active: updated[0].isActive,
    });
  });

  // DELETE /v1/webhooks/:id
  router.delete('/:id', requireScope('write'), async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');

    const deleted = await db
      .delete(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.projectId, auth.projectId)))
      .returning({ id: webhookEndpoints.id });

    if (deleted.length === 0) {
      return c.json({ code: 'NOT_FOUND', message: 'Webhook not found' }, 404);
    }

    return c.json({ deleted: true });
  });

  // GET /v1/webhooks/:id/deliveries
  router.get('/:id/deliveries', async (c) => {
    const auth = c.get('auth');
    const id = c.req.param('id');

    // Verify ownership
    const endpoint = await db
      .select({ id: webhookEndpoints.id })
      .from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.projectId, auth.projectId)))
      .limit(1);

    if (endpoint.length === 0) {
      return c.json({ code: 'NOT_FOUND', message: 'Webhook not found' }, 404);
    }

    const deliveries = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, id))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(50);

    return c.json({
      data: deliveries.map((d) => ({
        id: d.id,
        event_id: d.eventId,
        response_status: d.responseStatus,
        attempt: d.attempt,
        delivered_at: d.deliveredAt?.toISOString() ?? null,
        created_at: d.createdAt.toISOString(),
      })),
    });
  });

  return router;
}
