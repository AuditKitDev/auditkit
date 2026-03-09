import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import { forbidViewerTokens, requireScope, type AuthContext } from '../middleware/auth.js';
import { tenants } from '../db/schema.js';
import type { Database } from '../db/index.js';

export function createTenantsRouter(db: Database) {
  const router = new Hono<{ Variables: { auth: AuthContext } }>();
  router.use('*', forbidViewerTokens('Viewer tokens cannot access tenant metadata'));

  // POST /v1/tenants — Create/register a tenant
  router.post('/', requireScope('write'), async (c) => {
    const auth = c.get('auth');
    const body = await c.req.json();

    if (!body.external_id) {
      return c.json({ code: 'MISSING_FIELD', message: 'external_id is required' }, 400);
    }

    // Upsert tenant
    const existing = await db
      .select()
      .from(tenants)
      .where(
        and(eq(tenants.projectId, auth.projectId), eq(tenants.externalId, body.external_id))
      )
      .limit(1);

    if (existing.length > 0) {
      // Update metadata if provided
      if (body.name || body.metadata) {
        const [updated] = await db
          .update(tenants)
          .set({
            ...(body.name && { name: body.name }),
            ...(body.metadata && { metadata: body.metadata }),
          })
          .where(eq(tenants.id, existing[0].id))
          .returning();

        return c.json(serializeTenant(updated));
      }

      return c.json(serializeTenant(existing[0]));
    }

    const created = await db
      .insert(tenants)
      .values({
        projectId: auth.projectId,
        externalId: body.external_id,
        name: body.name ?? body.external_id,
        metadata: body.metadata ?? {},
      })
      .returning();

    return c.json(serializeTenant(created[0]), 201);
  });

  // GET /v1/tenants — List tenants
  router.get('/', async (c) => {
    const auth = c.get('auth');
    const limit = Math.min(Number(c.req.query('limit')) || 50, 100);
    const conditions = [eq(tenants.projectId, auth.projectId)];

    const result = await db
      .select({
        tenant: tenants,
        eventCount: sql<number>`(
          SELECT count(*) FROM audit_events
          WHERE audit_events.tenant_id = tenants.id
        )`,
      })
      .from(tenants)
      .where(and(...conditions))
      .orderBy(desc(tenants.createdAt))
      .limit(limit);

    return c.json({
      data: result.map((r) => ({
        ...serializeTenant(r.tenant),
        event_count: Number(r.eventCount),
      })),
    });
  });

  // GET /v1/tenants/:tenant_id — Get tenant details
  router.get('/:tenant_id', async (c) => {
    const auth = c.get('auth');
    const externalId = c.req.param('tenant_id');

    const result = await db
      .select({
        tenant: tenants,
        eventCount: sql<number>`(
          SELECT count(*) FROM audit_events
          WHERE audit_events.tenant_id = tenants.id
        )`,
      })
      .from(tenants)
      .where(
        and(eq(tenants.projectId, auth.projectId), eq(tenants.externalId, externalId))
      )
      .limit(1);

    if (result.length === 0) {
      return c.json({ code: 'NOT_FOUND', message: 'Tenant not found' }, 404);
    }

    return c.json({
      ...serializeTenant(result[0].tenant),
      event_count: Number(result[0].eventCount),
    });
  });

  // PATCH /v1/tenants/:tenant_id — Update tenant
  router.patch('/:tenant_id', requireScope('write'), async (c) => {
    const auth = c.get('auth');
    const externalId = c.req.param('tenant_id');
    const body = await c.req.json();

    const existing = await db
      .select()
      .from(tenants)
      .where(
        and(eq(tenants.projectId, auth.projectId), eq(tenants.externalId, externalId))
      )
      .limit(1);

    if (existing.length === 0) {
      return c.json({ code: 'NOT_FOUND', message: 'Tenant not found' }, 404);
    }

    const updated = await db
      .update(tenants)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.metadata !== undefined && { metadata: body.metadata }),
      })
      .where(eq(tenants.id, existing[0].id))
      .returning();

    return c.json(serializeTenant(updated[0]));
  });

  return router;
}

function serializeTenant(tenant: typeof tenants.$inferSelect) {
  return {
    id: tenant.id,
    project_id: tenant.projectId,
    external_id: tenant.externalId,
    name: tenant.name,
    metadata: tenant.metadata,
    created_at: tenant.createdAt.toISOString(),
  };
}
