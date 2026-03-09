import { Hono } from 'hono';
import { createHash, randomBytes } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { requireScope, type AuthContext } from '../middleware/auth.js';
import { viewerTokens, tenants } from '../db/schema.js';
import type { Database } from '../db/index.js';

function parseExpiresIn(expiresIn: string | number): number {
  // Handle numeric seconds (e.g., 3600)
  if (typeof expiresIn === 'number') {
    if (expiresIn <= 0) throw new Error('expiresIn must be a positive number');
    return expiresIn * 1000;
  }

  // Handle numeric string (e.g., "3600")
  const numericValue = Number(expiresIn);
  if (!isNaN(numericValue) && /^\d+$/.test(expiresIn)) {
    if (numericValue <= 0) throw new Error('expiresIn must be a positive number');
    return numericValue * 1000;
  }

  // Handle duration string (e.g., "1h", "30m", "7d")
  const match = expiresIn.match(/^(\d+)(m|h|d)$/);
  if (!match) throw new Error('Invalid expiresIn format. Use: 30m, 1h, 24h, 7d, or numeric seconds');

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error('Invalid expiresIn unit');
  }
}

export function createViewerTokensRouter(db: Database) {
  const router = new Hono<{ Variables: { auth: AuthContext } }>();

  // POST /v1/viewer-tokens — Create a scoped viewer token
  router.post('/', requireScope('write'), async (c) => {
    const auth = c.get('auth');
    const body = await c.req.json();

    if (!body.tenant_id) {
      return c.json({ code: 'MISSING_FIELD', message: 'tenant_id is required' }, 400);
    }

    // Resolve tenant
    const tenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(
        and(eq(tenants.projectId, auth.projectId), eq(tenants.externalId, body.tenant_id))
      )
      .limit(1);

    if (tenant.length === 0) {
      return c.json({ code: 'NOT_FOUND', message: 'Tenant not found' }, 404);
    }

    const expiresIn = body.expires_in ?? '1h';
    const expiresMs = parseExpiresIn(expiresIn);
    const expiresAt = new Date(Date.now() + expiresMs);

    // Generate token
    const tokenRaw = `vt_${randomBytes(32).toString('hex')}`;
    const tokenHash = createHash('sha256').update(tokenRaw).digest('hex');

    await db.insert(viewerTokens).values({
      projectId: auth.projectId,
      tenantId: tenant[0].id,
      scopes: body.scopes ?? {},
      tokenHash,
      expiresAt,
    });

    return c.json(
      {
        token: tokenRaw,
        expires_at: expiresAt.toISOString(),
      },
      201
    );
  });

  return router;
}
