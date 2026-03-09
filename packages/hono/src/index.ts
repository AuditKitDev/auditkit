import { createMiddleware } from 'hono/factory';
import { AuditKit } from '@auditkit/sdk';
import type { AuditActor } from '@auditkit/shared';
import type { Context } from 'hono';

export interface AuditKitHonoConfig {
  apiKey: string;
  baseUrl?: string;
  autoCapture?: {
    mutations?: boolean;
  };
  getActor: (c: Context) => AuditActor | null;
  getTenantId: (c: Context) => string | null;
  exclude?: string[];
}

/**
 * Hono middleware for auto-capturing audit events.
 *
 * @example
 * import { auditKit } from '@auditkit/hono';
 *
 * app.use('*', auditKit({
 *   apiKey: process.env.AUDITKIT_API_KEY!,
 *   getActor: (c) => ({ id: c.get('userId') }),
 *   getTenantId: (c) => c.get('tenantId'),
 * }));
 */
export function auditKit(config: AuditKitHonoConfig) {
  const client = new AuditKit({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });

  const excludePatterns = (config.exclude ?? []).map(
    (p) => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')
  );

  return createMiddleware(async (c, next) => {
    // Make audit client available in route handlers
    c.set('audit', client);

    await next();

    const path = new URL(c.req.url).pathname;

    // Check exclusions
    if (excludePatterns.some((p) => p.test(path))) return;

    const actor = config.getActor(c);
    const tenantId = config.getTenantId(c);

    if (!actor || !tenantId) return;

    const method = c.req.method;
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (config.autoCapture?.mutations && isMutation) {
      const actionMap: Record<string, string> = {
        POST: 'created',
        PUT: 'updated',
        PATCH: 'updated',
        DELETE: 'deleted',
      };

      // Extract the last non-ID segment as the resource name
      // e.g. /api/v1/documents/123 -> "documents"
      const segments = path.replace(/^\/+/, '').split('/');
      const resource = segments.filter((s) => !/^[0-9a-f-]+$/i.test(s) && !/^\d+$/.test(s)).pop() ?? segments[0];
      const action = `${resource}.${actionMap[method] ?? 'accessed'}`;

      client
        .log(action, {
          actor,
          tenantId,
          target: { type: resource, id: path },
          context: {
            ip: c.req.header('x-forwarded-for')?.split(',')[0],
            userAgent: c.req.header('user-agent'),
          },
          metadata: { method, path, status: c.res.status },
        })
        .catch(() => {});
    }
  });
}

export { AuditKit } from '@auditkit/sdk';
