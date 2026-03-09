import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { createHash } from 'crypto';
import { eq, and, gte } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { sessions, users, projects } from '../db/schema.js';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface SessionProject {
  id: string;
  name: string;
  slug: string;
}

export interface SessionContext {
  user: SessionUser;
  projects: SessionProject[];
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getSessionTokenFromCookieHeader(cookieHeader?: string | null): string | null {
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  if (!match) return null;

  const token = decodeURIComponent(match[1]);
  return token.startsWith('st_') ? token : null;
}

/**
 * Session authentication middleware for dashboard routes.
 * Checks Authorization: Bearer st_* or Cookie: session=st_*
 */
export function sessionAuthMiddleware(db: Database) {
  return createMiddleware<{
    Variables: { user: SessionUser; projects: SessionProject[] };
  }>(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const cookieHeader = c.req.header('Cookie');

    let token: string | null = null;

    if (authHeader?.startsWith('Bearer st_')) {
      token = authHeader.slice(7);
    } else if (cookieHeader) {
      token = getSessionTokenFromCookieHeader(cookieHeader);
    }

    if (!token) {
      throw new HTTPException(401, { message: 'Authentication required' });
    }

    const tokenHash = hashToken(token);

    const sessionResult = await db
      .select({
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          gte(sessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (sessionResult.length === 0) {
      throw new HTTPException(401, { message: 'Invalid or expired session' });
    }

    const userId = sessionResult[0].userId;

    const userResult = await db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userResult.length === 0) {
      throw new HTTPException(401, { message: 'User not found' });
    }

    const userProjects = await db
      .select({ id: projects.id, name: projects.name, slug: projects.slug })
      .from(projects)
      .where(eq(projects.userId, userId));

    c.set('user', userResult[0]);
    c.set('projects', userProjects);

    await next();
  });
}
