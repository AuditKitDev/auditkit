import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { AuthContext } from '../middleware/auth.js';
import { eventBus, type PublishedEvent } from '../services/event-bus.js';

export function createSSERouter() {
  const router = new Hono<{ Variables: { auth: AuthContext } }>();

  // GET /v1/events/stream — SSE endpoint for real-time event streaming
  router.get('/stream', async (c) => {
    const auth = c.get('auth');
    const projectId = auth.projectId;

    // Query param filters
    const requestedTenantId = c.req.query('tenant_id') ?? null;
    const filterTenantId = auth.type === 'viewer_token' ? auth.tenantId ?? null : requestedTenantId;
    const filterAction = c.req.query('action') ?? null;
    const filterSeverity = c.req.query('severity') ?? null;
    const severities = filterSeverity ? filterSeverity.split(',') : null;

    return streamSSE(c, async (stream) => {
      let alive = true;
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
      let unsubscribe: (() => void) | null = null;

      function cleanup() {
        if (!alive) return; // Already cleaned up
        alive = false;
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      }

      // Filter function
      function matchesFilters(event: PublishedEvent): boolean {
        if (filterTenantId && event.tenant_id !== filterTenantId) return false;
        if (filterAction && event.action !== filterAction) return false;
        if (severities && !severities.includes(event.severity)) return false;
        return true;
      }

      // Subscribe to project events
      unsubscribe = eventBus.subscribe(projectId, (event) => {
        if (!alive) return;
        if (!matchesFilters(event)) return;

        stream
          .writeSSE({
            event: 'event',
            data: JSON.stringify(event),
            id: event.event_id,
          })
          .catch(() => {
            cleanup();
          });
      });

      // Send initial connection message
      await stream.writeSSE({
        event: 'connected',
        data: JSON.stringify({
          project_id: projectId,
          filters: {
            tenant_id: filterTenantId,
            action: filterAction,
            severity: filterSeverity,
          },
        }),
      });

      // Heartbeat every 30 seconds
      heartbeatInterval = setInterval(() => {
        if (!alive) return;
        stream.writeSSE({ event: 'heartbeat', data: '' }).catch(() => {
          cleanup();
        });
      }, 30_000);

      // Keep the stream open until client disconnects
      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          cleanup();
          resolve();
        });
      });
    });
  });

  return router;
}
