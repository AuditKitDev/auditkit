import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { createHash } from 'crypto';
import { getCookie } from 'hono/cookie';
import { eq, and, gte } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { apiKeys, projects, sessions, viewerTokens } from '../db/schema.js';

export interface AuthContext {
  projectId: string;
  environment: string;
  scopes: string[];
  type: 'api_key' | 'viewer_token' | 'session';
  tenantId?: string; // Only set for viewer tokens
  viewerScopes?: Record<string, unknown>; // Scoping for viewer tokens
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Authentication middleware.
 * Supports API keys (Bearer ak_...), viewer tokens (Bearer vt_...),
 * and session tokens via httpOnly cookie fallback.
 */
export function authMiddleware(db: Database) {
  return createMiddleware<{ Variables: { auth: AuthContext } }>(async (c, next) => {
    const authHeader = c.req.header('Authorization');

    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    // Fallback: read session token from httpOnly cookie (dashboard frontend)
    if (!token) {
      const cookieToken = getCookie(c, 'session');
      if (cookieToken?.startsWith('st_')) {
        token = cookieToken;
      }
    }

    if (!token) {
      throw new HTTPException(401, { message: 'Missing or invalid Authorization header' });
    }

    if (token.startsWith('ak_')) {
      // API Key authentication
      const hash = hashKey(token);

      const result = await db
        .select({
          id: apiKeys.id,
          projectId: apiKeys.projectId,
          environment: apiKeys.environment,
          scopes: apiKeys.scopes,
          expiresAt: apiKeys.expiresAt,
        })
        .from(apiKeys)
        .where(eq(apiKeys.keyHash, hash))
        .limit(1);

      if (result.length === 0) {
        throw new HTTPException(401, { message: 'Invalid API key' });
      }

      const key = result[0];

      if (key.expiresAt && key.expiresAt < new Date()) {
        throw new HTTPException(401, { message: 'API key has expired' });
      }

      // Update last_used_at (fire and forget)
      db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, key.id))
        .catch(() => { /* fire-and-forget */ });

      c.set('auth', {
        projectId: key.projectId,
        environment: key.environment,
        scopes: key.scopes,
        type: 'api_key',
      });
    } else if (token.startsWith('vt_')) {
      // Viewer token authentication
      const hash = hashKey(token);

      const result = await db
        .select({
          id: viewerTokens.id,
          projectId: viewerTokens.projectId,
          tenantId: viewerTokens.tenantId,
          scopes: viewerTokens.scopes,
          expiresAt: viewerTokens.expiresAt,
        })
        .from(viewerTokens)
        .where(
          and(eq(viewerTokens.tokenHash, hash), gte(viewerTokens.expiresAt, new Date()))
        )
        .limit(1);

      if (result.length === 0) {
        throw new HTTPException(401, { message: 'Invalid or expired viewer token' });
      }

      const vt = result[0];

      c.set('auth', {
        projectId: vt.projectId,
        environment: 'production',
        scopes: ['read'],
        type: 'viewer_token',
        tenantId: vt.tenantId,
        viewerScopes: vt.scopes ?? {},
      });
    } else if (token.startsWith('st_')) {
      // Session token authentication (dashboard users calling API routes)
      const hash = hashKey(token);

      const sessionResult = await db
        .select({ userId: sessions.userId, expiresAt: sessions.expiresAt })
        .from(sessions)
        .where(
          and(eq(sessions.tokenHash, hash), gte(sessions.expiresAt, new Date()))
        )
        .limit(1);

      if (sessionResult.length === 0) {
        throw new HTTPException(401, { message: 'Invalid or expired session' });
      }

      // Get the user's first project
      const projectResult = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.userId, sessionResult[0].userId))
        .limit(1);

      if (projectResult.length === 0) {
        throw new HTTPException(403, { message: 'No project found for user' });
      }

      c.set('auth', {
        projectId: projectResult[0].id,
        environment: 'production',
        scopes: ['read', 'write'],
        type: 'session',
      });
    } else {
      throw new HTTPException(401, { message: 'Invalid token format' });
    }

    await next();
  });
}

/**
 * Require specific scopes.
 */
export function requireScope(...requiredScopes: string[]) {
  return createMiddleware<{ Variables: { auth: AuthContext } }>(async (c, next) => {
    const auth = c.get('auth');

    for (const scope of requiredScopes) {
      if (!auth.scopes.includes(scope)) {
        throw new HTTPException(403, {
          message: `Insufficient permissions. Required scope: ${scope}`,
        });
      }
    }

    await next();
  });
}

/**
 * Disallow viewer tokens on routes that expose project-wide or administrative data.
 */
export function forbidViewerTokens(message = 'Viewer tokens cannot access this resource') {
  return createMiddleware<{ Variables: { auth: AuthContext } }>(async (c, next) => {
    const auth = c.get('auth');

    if (auth.type === 'viewer_token') {
      throw new HTTPException(403, { message });
    }

    await next();
  });
}
