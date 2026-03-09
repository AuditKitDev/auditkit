import { AuditKit } from '@auditkit/sdk';
import type { AuditActor } from '@auditkit/shared';
import type { NextRequest, NextResponse } from 'next/server';

export interface AuditKitNextConfig {
  apiKey: string;
  baseUrl?: string;
  autoCapture?: {
    auth?: boolean;
    apiMutations?: boolean;
    routeAccess?: boolean;
  };
  getActor?: (req: NextRequest) => AuditActor | null;
  getTenantId?: (req: NextRequest) => string | null;
  exclude?: string[];
}

/**
 * Next.js middleware wrapper that auto-captures audit events.
 *
 * @example
 * // middleware.ts
 * import { withAuditKit } from '@auditkit/next';
 *
 * export default withAuditKit({
 *   apiKey: process.env.AUDITKIT_API_KEY!,
 *   autoCapture: { auth: true, apiMutations: true },
 *   getActor: (req) => ({ id: req.headers.get('x-user-id')! }),
 *   getTenantId: (req) => req.headers.get('x-tenant-id'),
 * });
 */
export function withAuditKit(config: AuditKitNextConfig) {
  const client = new AuditKit({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });

  const excludePatterns = (config.exclude ?? []).map((p) =>
    new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')
  );

  return async function middleware(req: NextRequest): Promise<NextResponse | undefined> {
    const { NextResponse } = await import('next/server');
    const pathname = req.nextUrl.pathname;

    // Check exclusions
    if (excludePatterns.some((p) => p.test(pathname))) {
      return NextResponse.next();
    }

    const actor = config.getActor?.(req);
    const tenantId = config.getTenantId?.(req);

    if (!actor || !tenantId) {
      return NextResponse.next();
    }

    const method = req.method;
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    // Auto-capture API mutations
    if (config.autoCapture?.apiMutations && isMutation && pathname.startsWith('/api/')) {
      const actionMap: Record<string, string> = {
        POST: 'created',
        PUT: 'updated',
        PATCH: 'updated',
        DELETE: 'deleted',
      };

      // Extract the last non-ID segment as the resource name
      // e.g. /api/v1/documents/123 -> "documents"
      const segments = pathname.replace('/api/', '').split('/');
      const resource = segments.filter((s) => !/^[0-9a-f-]+$/i.test(s) && !/^\d+$/.test(s)).pop() ?? segments[0];
      const action = `${resource}.${actionMap[method] ?? 'accessed'}`;

      client
        .log(action, {
          actor,
          tenantId,
          target: { type: resource, id: pathname },
          context: {
            ip: req.headers.get('x-forwarded-for')?.split(',')[0] ?? undefined,
            userAgent: req.headers.get('user-agent') ?? undefined,
          },
          metadata: { method, path: pathname },
        })
        .catch(() => {}); // Fire and forget
    }

    // Auto-capture route access
    if (config.autoCapture?.routeAccess && !pathname.startsWith('/api/')) {
      client
        .log('page.viewed', {
          actor,
          tenantId,
          target: { type: 'page', id: pathname },
          context: {
            ip: req.headers.get('x-forwarded-for')?.split(',')[0] ?? undefined,
            userAgent: req.headers.get('user-agent') ?? undefined,
          },
        })
        .catch(() => {});
    }

    return NextResponse.next();
  };
}
