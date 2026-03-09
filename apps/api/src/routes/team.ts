import { Hono } from 'hono';
import { createHash, randomBytes } from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import type { SessionUser, SessionProject } from '../middleware/session-auth.js';
import {
  projects,
  users,
  teamMembers,
  teamInvitations,
} from '../db/schema.js';
import type { Database } from '../db/index.js';
import { emailService } from '../services/email.js';
import { logger } from '../services/logger.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getValidProjectId(projectId: string | undefined, userProjects: { id: string }[]): string | null {
  const id = projectId || userProjects[0]?.id;
  if (!id) return null;
  if (!userProjects.some(p => p.id === id)) return null;
  return id;
}

/**
 * Returns the caller's effective role for a project.
 * Project owner always gets 'owner'. Otherwise, check teamMembers.
 */
async function getCallerRole(
  db: Database,
  userId: string,
  projectId: string
): Promise<'owner' | 'admin' | 'member' | null> {
  // Check if user is the project owner
  const proj = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (proj.length > 0 && proj[0].userId === userId) {
    return 'owner';
  }

  // Check team membership
  const membership = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.projectId, projectId), eq(teamMembers.userId, userId)))
    .limit(1);
  if (membership.length > 0) {
    return membership[0].role as 'admin' | 'member';
  }

  return null;
}

export function createTeamRouter(db: Database) {
  const router = new Hono<{
    Variables: { user: SessionUser; projects: SessionProject[] };
  }>();

  // ─── GET /team/members ─── List team members for a project ───
  router.get('/members', async (c) => {
    const userProjects = c.get('projects');
    const projectId = getValidProjectId(
      c.req.query('project_id'),
      userProjects
    );
    if (!projectId) {
      return c.json({ code: 'BAD_REQUEST', message: 'No valid project' }, 400);
    }

    // Fetch the project to include the owner
    const proj = await db
      .select({ userId: projects.userId, name: projects.name })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (proj.length === 0) {
      return c.json({ code: 'NOT_FOUND', message: 'Project not found' }, 404);
    }

    // Get the project owner info
    const ownerResult = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, proj[0].userId))
      .limit(1);

    // Get team members with user info
    const members = await db
      .select({
        id: teamMembers.id,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        userId: teamMembers.userId,
        name: users.name,
        email: users.email,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.projectId, projectId));

    // Build the result: owner first, then team members
    const result: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      joinedAt: string;
    }> = [];

    if (ownerResult.length > 0) {
      const owner = ownerResult[0];
      result.push({
        id: owner.id,
        name: owner.name,
        email: owner.email,
        role: 'owner',
        joinedAt: proj[0].name, // we don't have owner joinedAt, use project creation
      });
    }

    // Replace the owner joinedAt with proper date from project
    // We need to fetch the project createdAt
    const projFull = await db
      .select({ createdAt: projects.createdAt })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (result.length > 0) {
      result[0].joinedAt = projFull[0]?.createdAt?.toISOString() ?? new Date().toISOString();
    }

    for (const m of members) {
      result.push({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      });
    }

    return c.json({ data: result });
  });

  // ─── POST /team/invite ─── Invite a member by email ───
  router.post('/invite', async (c) => {
    const user = c.get('user');
    const userProjects = c.get('projects');
    const body = await c.req.json<{ email?: string; role?: string; project_id?: string }>();

    const projectId = getValidProjectId(body.project_id, userProjects);
    if (!projectId) {
      return c.json({ code: 'BAD_REQUEST', message: 'No valid project' }, 400);
    }

    // Validate email
    const email = body.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ code: 'BAD_REQUEST', message: 'Invalid email address' }, 400);
    }

    // Validate role
    const role = body.role || 'member';
    if (!['admin', 'member'].includes(role)) {
      return c.json({ code: 'BAD_REQUEST', message: 'Role must be admin or member' }, 400);
    }

    // Check caller's permission (must be owner or admin)
    const callerRole = await getCallerRole(db, user.id, projectId);
    if (!callerRole || callerRole === 'member') {
      return c.json({ code: 'FORBIDDEN', message: 'Only owners and admins can invite members' }, 403);
    }

    // Check if user is already a member
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      // Check if already owner
      const proj = await db
        .select({ userId: projects.userId })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      if (proj.length > 0 && proj[0].userId === existingUser[0].id) {
        return c.json({ code: 'CONFLICT', message: 'This user is already the project owner' }, 409);
      }

      // Check if already a team member
      const existing = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(and(eq(teamMembers.projectId, projectId), eq(teamMembers.userId, existingUser[0].id)))
        .limit(1);
      if (existing.length > 0) {
        return c.json({ code: 'CONFLICT', message: 'This user is already a team member' }, 409);
      }
    }

    // Generate invite token
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store invitation
    const [invitation] = await db
      .insert(teamInvitations)
      .values({
        projectId,
        email,
        role,
        tokenHash,
        invitedBy: user.id,
        expiresAt,
      })
      .returning({ id: teamInvitations.id });

    // Get project name for the email
    const projInfo = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    const projectName = projInfo[0]?.name || 'Unknown Project';

    // Build invite URL
    const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/invite/accept?token=${rawToken}`;

    // Send email
    try {
      await emailService.sendTeamInviteEmail(email, user.name, projectName, inviteUrl);
    } catch (err) {
      logger.error({ err }, 'Failed to send team invite email');
      // Don't fail the request — invitation is stored
    }

    return c.json({
      id: invitation.id,
      email,
      role,
      expires_at: expiresAt.toISOString(),
    }, 201);
  });

  // ─── POST /team/accept ─── Accept an invitation (uses token, no auth required) ───
  router.post('/accept', async (c) => {
    const body = await c.req.json<{ token?: string }>();
    const token = body.token?.trim();
    if (!token) {
      return c.json({ code: 'BAD_REQUEST', message: 'Token is required' }, 400);
    }

    const tokenHash = hashToken(token);

    // Look up invitation
    const invitations = await db
      .select()
      .from(teamInvitations)
      .where(and(eq(teamInvitations.tokenHash, tokenHash), isNull(teamInvitations.acceptedAt)))
      .limit(1);

    if (invitations.length === 0) {
      return c.json({ code: 'NOT_FOUND', message: 'Invalid or already used invitation' }, 404);
    }

    const invitation = invitations[0];

    // Check expiry
    if (new Date() > invitation.expiresAt) {
      return c.json({ code: 'GONE', message: 'This invitation has expired' }, 410);
    }

    // Find user by email
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, invitation.email))
      .limit(1);

    if (existingUser.length === 0) {
      return c.json({
        code: 'SIGNUP_REQUIRED',
        message: 'No account found for this email. Please sign up first.',
        email: invitation.email,
        project_id: invitation.projectId,
      }, 200);
    }

    const userId = existingUser[0].id;

    // Check if already a member
    const existing = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(and(eq(teamMembers.projectId, invitation.projectId), eq(teamMembers.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      // Add as team member
      await db.insert(teamMembers).values({
        projectId: invitation.projectId,
        userId,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
      });
    }

    // Mark invitation as accepted
    await db
      .update(teamInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(teamInvitations.id, invitation.id));

    return c.json({
      project_id: invitation.projectId,
      role: invitation.role,
    });
  });

  // ─── PATCH /team/members/:id ─── Update a member's role ───
  router.patch('/members/:id', async (c) => {
    const user = c.get('user');
    const userProjects = c.get('projects');
    const memberId = c.req.param('id');
    const body = await c.req.json<{ role?: string }>();

    const role = body.role;
    if (!role || !['admin', 'member'].includes(role)) {
      return c.json({ code: 'BAD_REQUEST', message: 'Role must be admin or member' }, 400);
    }

    // Find the member
    const member = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, memberId))
      .limit(1);

    if (member.length === 0) {
      return c.json({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    const targetMember = member[0];
    const projectId = targetMember.projectId;

    // Check project access
    if (!userProjects.some(p => p.id === projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Access denied' }, 403);
    }

    // Only owners can change roles
    const callerRole = await getCallerRole(db, user.id, projectId);
    if (callerRole !== 'owner') {
      return c.json({ code: 'FORBIDDEN', message: 'Only project owners can change roles' }, 403);
    }

    // Cannot change own role
    if (targetMember.userId === user.id) {
      return c.json({ code: 'BAD_REQUEST', message: 'Cannot change your own role' }, 400);
    }

    // Update role
    const [updated] = await db
      .update(teamMembers)
      .set({ role })
      .where(eq(teamMembers.id, memberId))
      .returning();

    return c.json({
      id: updated.id,
      role: updated.role,
      userId: updated.userId,
    });
  });

  // ─── DELETE /team/members/:id ─── Remove a member ───
  router.delete('/members/:id', async (c) => {
    const user = c.get('user');
    const userProjects = c.get('projects');
    const memberId = c.req.param('id');

    // Find the member
    const member = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, memberId))
      .limit(1);

    if (member.length === 0) {
      return c.json({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    const targetMember = member[0];
    const projectId = targetMember.projectId;

    // Check project access
    if (!userProjects.some(p => p.id === projectId)) {
      return c.json({ code: 'FORBIDDEN', message: 'Access denied' }, 403);
    }

    // Check caller permission
    const callerRole = await getCallerRole(db, user.id, projectId);
    if (!callerRole || (callerRole !== 'owner' && callerRole !== 'admin')) {
      return c.json({ code: 'FORBIDDEN', message: 'Only owners and admins can remove members' }, 403);
    }

    // Cannot remove yourself
    if (targetMember.userId === user.id) {
      return c.json({ code: 'BAD_REQUEST', message: 'Cannot remove yourself' }, 400);
    }

    // Cannot remove the owner (owners are in projects table, not teamMembers, but guard anyway)
    if (targetMember.role === 'owner') {
      return c.json({ code: 'FORBIDDEN', message: 'Cannot remove the project owner' }, 403);
    }

    await db.delete(teamMembers).where(eq(teamMembers.id, memberId));

    return c.body(null, 204);
  });

  return router;
}
