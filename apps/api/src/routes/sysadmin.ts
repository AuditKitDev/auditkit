import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { desc, sql, count, eq, gte } from 'drizzle-orm';
import type { SessionUser, SessionProject } from '../middleware/session-auth.js';
import { adminActivityLogs, users, projects, sessions, auditEvents } from '../db/schema.js';
import type { Database } from '../db/index.js';

export function createSysadminRouter(db: Database) {
  const router = new Hono<{
    Variables: { user: SessionUser; projects: SessionProject[] };
  }>();

  // Sysadmin gate — every route in this router requires sysadmin role
  router.use('*', async (c, next) => {
    const user = c.get('user');
    if (!user || !user.role || user.role !== 'sysadmin') {
      throw new HTTPException(403, { message: 'Sysadmin access required' });
    }
    await next();
  });

  // GET /dashboard/sysadmin/stats — system-wide stats
  router.get('/stats', async (c) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [userCount, projectCount, eventCount, recentSignups, activeSessions, events24h] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(projects),
      db.select({ count: count() }).from(auditEvents),
      db.select({ count: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo)),
      db.select({ count: count() }).from(sessions).where(gte(sessions.expiresAt, now)),
      db.select({ count: count() }).from(auditEvents).where(gte(auditEvents.occurredAt, twentyFourHoursAgo)),
    ]);

    return c.json({
      totalUsers: userCount[0]?.count ?? 0,
      totalProjects: projectCount[0]?.count ?? 0,
      totalEvents: eventCount[0]?.count ?? 0,
      signupsLast30d: recentSignups[0]?.count ?? 0,
      activeSessions: activeSessions[0]?.count ?? 0,
      eventsLast24h: events24h[0]?.count ?? 0,
    });
  });

  // GET /dashboard/sysadmin/logs — paginated activity logs
  router.get('/logs', async (c) => {
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const actionFilter = c.req.query('action') || '';

    const conditions = [];
    if (actionFilter) {
      conditions.push(eq(adminActivityLogs.action, actionFilter));
    }

    const whereClause = conditions.length > 0 ? conditions[0] : undefined;

    const [logs, totalResult] = await Promise.all([
      db
        .select()
        .from(adminActivityLogs)
        .where(whereClause)
        .orderBy(desc(adminActivityLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(adminActivityLogs).where(whereClause),
    ]);

    return c.json({
      data: logs.map((log) => ({
        id: log.id,
        actorEmail: log.actorEmail,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt?.toISOString(),
      })),
      total: totalResult[0]?.count ?? 0,
      limit,
      offset,
    });
  });

  // GET /dashboard/sysadmin/users — all users
  router.get('/users', async (c) => {
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    const [userList, totalResult] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(users),
    ]);

    return c.json({
      data: userList.map((u) => ({
        ...u,
        createdAt: u.createdAt?.toISOString(),
      })),
      total: totalResult[0]?.count ?? 0,
    });
  });

  // GET /dashboard/sysadmin/users/recent — recent signups
  router.get('/users/recent', async (c) => {
    const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);

    const recentUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit);

    return c.json({
      data: recentUsers.map((u) => ({
        ...u,
        createdAt: u.createdAt?.toISOString(),
      })),
    });
  });

  // GET /dashboard/sysadmin/users/stats — total user count and last signup
  router.get('/users/stats', async (c) => {
    const [totalResult] = await db.select({ count: count() }).from(users);

    const [lastUser] = await db
      .select({ createdAt: users.createdAt })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(1);

    return c.json({
      totalUsers: totalResult?.count ?? 0,
      lastSignupAt: lastUser?.createdAt?.toISOString() ?? null,
    });
  });

  // GET /dashboard/sysadmin/actions — distinct action types for filter dropdown
  router.get('/actions', async (c) => {
    const actions = await db
      .selectDistinct({ action: adminActivityLogs.action })
      .from(adminActivityLogs)
      .orderBy(adminActivityLogs.action);

    return c.json({ data: actions.map((a) => a.action) });
  });

  return router;
}
