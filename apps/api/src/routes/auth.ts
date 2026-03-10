import { Hono } from 'hono';
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'crypto';
import { eq, and, gte } from 'drizzle-orm';
import { users, sessions, projects, apiKeys, passwordResetTokens, emailVerificationTokens, refreshTokens } from '../db/schema.js';
import { emailService } from '../services/email.js';
import type { Database } from '../db/index.js';

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

function generateSessionToken(): string {
  return `st_${randomBytes(32).toString('hex')}`;
}

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex');
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = stored.split(':');
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      const storedBuffer = Buffer.from(hash, 'hex');
      resolve(timingSafeEqual(storedBuffer, derivedKey));
    });
  });
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function getTrimmedString(value: unknown): string | null {
  const stringValue = getString(value);
  if (stringValue === null) return null;

  const trimmedValue = stringValue.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function getNormalizedEmail(value: unknown): string | null {
  const email = getTrimmedString(value);
  if (!email) return null;

  const normalizedEmail = email.toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 254) {
    return null;
  }

  return normalizedEmail;
}

function generateRefreshToken(): string {
  return `rt_${randomBytes(32).toString('hex')}`;
}

/**
 * Create a session token + refresh token pair for a user.
 * Returns { sessionToken, refreshToken }.
 */
async function createTokenPair(
  db: Database,
  userId: string
): Promise<{ sessionToken: string; refreshToken: string }> {
  const sessionToken = generateSessionToken();
  const sessionTokenHash = hashToken(sessionToken);
  const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    userId,
    tokenHash: sessionTokenHash,
    expiresAt: sessionExpiresAt,
  });

  const refreshTokenRaw = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshTokenRaw);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const familyId = randomUUID();

  await db.insert(refreshTokens).values({
    userId,
    tokenHash: refreshTokenHash,
    familyId,
    expiresAt: refreshExpiresAt,
  });

  return { sessionToken, refreshToken: refreshTokenRaw };
}

export function createAuthRouter(db: Database) {
  const router = new Hono();

  // POST /auth/signup
  router.post('/signup', async (c) => {
    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ code: 'INVALID_BODY', message: 'Invalid JSON body' }, 400);
    }
    const normalizedEmail = getNormalizedEmail(body.email);
    const trimmedName = getTrimmedString(body.name);
    const password = getString(body.password);

    if (!normalizedEmail || !trimmedName || !password) {
      return c.json({ code: 'MISSING_FIELDS', message: 'email, name, and password are required' }, 400);
    }

    if (password.length < 8) {
      return c.json({ code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' }, 400);
    }

    // Check if user exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return c.json({ code: 'EMAIL_EXISTS', message: 'An account with this email already exists' }, 409);
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const role = adminEmails.includes(normalizedEmail) ? 'sysadmin' : 'user';
    const [user] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        name: trimmedName,
        passwordHash,
        role,
      })
      .returning({ id: users.id, email: users.email, name: users.name });

    // Create default project
    const projectSlug = `${slugify(trimmedName)}-project-${randomBytes(3).toString('hex')}`;
    const [project] = await db
      .insert(projects)
      .values({
        userId: user.id,
        name: 'My Project',
        slug: projectSlug,
      })
      .returning({ id: projects.id, name: projects.name, slug: projects.slug });

    // Create default API key for the project
    const rawKey = `ak_live_${randomBytes(24).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12);

    await db.insert(apiKeys).values({
      projectId: project.id,
      name: 'Default Key',
      keyHash,
      keyPrefix,
      environment: 'production',
      scopes: ['write', 'read'],
    });

    // Create session + refresh token pair
    const { sessionToken, refreshToken } = await createTokenPair(db, user.id);

    // Send verification email (non-blocking)
    const verificationRaw = `ev_${randomBytes(32).toString('hex')}`;
    const verificationHash = hashToken(verificationRaw);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    db.insert(emailVerificationTokens).values({
      userId: user.id,
      tokenHash: verificationHash,
      expiresAt: verificationExpires,
    }).then(() => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const verifyUrl = `${frontendUrl}/dashboard/verification?token=${verificationRaw}`;
      return emailService.sendVerificationEmail(user.email, verifyUrl);
    }).catch(() => {});

    return c.json({
      user: { id: user.id, email: user.email, name: user.name },
      token: sessionToken,
      refresh_token: refreshToken,
      project: { id: project.id, name: project.name, slug: project.slug },
    }, 201);
  });

  // POST /auth/login
  router.post('/login', async (c) => {
    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ code: 'INVALID_BODY', message: 'Invalid JSON body' }, 400);
    }
    const normalizedEmail = getNormalizedEmail(body.email);
    const password = getString(body.password);

    if (!normalizedEmail || !password) {
      return c.json({ code: 'MISSING_FIELDS', message: 'email and password are required' }, 400);
    }

    const result = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (result.length === 0) {
      return c.json({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }, 401);
    }

    const user = result[0];
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return c.json({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }, 401);
    }

    // Create session + refresh token pair
    const { sessionToken, refreshToken } = await createTokenPair(db, user.id);

    // Get user's projects
    const userProjects = await db
      .select({ id: projects.id, name: projects.name, slug: projects.slug })
      .from(projects)
      .where(eq(projects.userId, user.id));

    return c.json({
      user: { id: user.id, email: user.email, name: user.name },
      token: sessionToken,
      refresh_token: refreshToken,
      projects: userProjects,
    });
  });

  // POST /auth/logout
  router.post('/logout', async (c) => {
    const authHeader = c.req.header('Authorization');
    const cookieHeader = c.req.header('Cookie');

    let token: string | null = null;

    if (authHeader?.startsWith('Bearer st_')) {
      token = authHeader.slice(7);
    } else if (cookieHeader) {
      token = getSessionTokenFromCookieHeader(cookieHeader);
    }

    if (token) {
      const tokenHash = hashToken(token);
      // Delete session
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    }

    return c.json({ ok: true });
  });

  // POST /auth/refresh — Exchange a refresh token for a new session + refresh token pair
  router.post('/refresh', async (c) => {
    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ code: 'INVALID_BODY', message: 'Invalid JSON body' }, 400);
    }

    const { refresh_token } = body;

    if (!refresh_token || typeof refresh_token !== 'string' || !refresh_token.startsWith('rt_')) {
      return c.json({ code: 'INVALID_TOKEN', message: 'A valid refresh token is required' }, 400);
    }

    const tokenHash = hashToken(refresh_token);

    // Look up the refresh token
    const tokenResult = await db
      .select({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        familyId: refreshTokens.familyId,
        expiresAt: refreshTokens.expiresAt,
        usedAt: refreshTokens.usedAt,
      })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (tokenResult.length === 0) {
      return c.json({ code: 'INVALID_TOKEN', message: 'Invalid refresh token' }, 401);
    }

    const existingToken = tokenResult[0];

    // Replay attack detection: if the token was already used, invalidate
    // ALL tokens in this family and all sessions for the user
    if (existingToken.usedAt) {
      // Token reuse detected — potential theft. Nuke the entire family.
      await db.delete(refreshTokens).where(eq(refreshTokens.familyId, existingToken.familyId));
      await db.delete(sessions).where(eq(sessions.userId, existingToken.userId));
      return c.json({ code: 'TOKEN_REUSED', message: 'Refresh token reuse detected. All sessions have been revoked for security.' }, 401);
    }

    // Check expiry
    if (new Date() > existingToken.expiresAt) {
      return c.json({ code: 'TOKEN_EXPIRED', message: 'Refresh token has expired' }, 401);
    }

    // Mark old token as used (for replay detection)
    await db
      .update(refreshTokens)
      .set({ usedAt: new Date() })
      .where(eq(refreshTokens.id, existingToken.id));

    // Issue new session token
    const newSessionToken = generateSessionToken();
    const newSessionHash = hashToken(newSessionToken);
    const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await db.insert(sessions).values({
      userId: existingToken.userId,
      tokenHash: newSessionHash,
      expiresAt: sessionExpiresAt,
    });

    // Issue new refresh token in the same family
    const newRefreshTokenRaw = generateRefreshToken();
    const newRefreshHash = hashToken(newRefreshTokenRaw);
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await db.insert(refreshTokens).values({
      userId: existingToken.userId,
      tokenHash: newRefreshHash,
      familyId: existingToken.familyId, // Same family for rotation tracking
      expiresAt: refreshExpiresAt,
    });

    return c.json({
      token: newSessionToken,
      refresh_token: newRefreshTokenRaw,
    });
  });

  // GET /auth/me
  router.get('/me', async (c) => {
    const authHeader = c.req.header('Authorization');
    const cookieHeader = c.req.header('Cookie');

    let token: string | null = null;

    if (authHeader?.startsWith('Bearer st_')) {
      token = authHeader.slice(7);
    } else if (cookieHeader) {
      token = getSessionTokenFromCookieHeader(cookieHeader);
    }

    if (!token) {
      return c.json({ code: 'UNAUTHORIZED', message: 'Not authenticated' }, 401);
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
      return c.json({ code: 'UNAUTHORIZED', message: 'Invalid or expired session' }, 401);
    }

    const userId = sessionResult[0].userId;

    const userResult = await db
      .select({ id: users.id, email: users.email, name: users.name, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userResult.length === 0) {
      return c.json({ code: 'UNAUTHORIZED', message: 'User not found' }, 401);
    }

    const userProjects = await db
      .select({ id: projects.id, name: projects.name, slug: projects.slug })
      .from(projects)
      .where(eq(projects.userId, userId));

    return c.json({
      user: userResult[0],
      projects: userProjects,
    });
  });

  // POST /auth/forgot-password
  router.post('/forgot-password', async (c) => {
    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ code: 'INVALID_BODY', message: 'Invalid JSON body' }, 400);
    }
    const normalizedEmail = getNormalizedEmail(body.email);

    if (!normalizedEmail) {
      return c.json({ code: 'MISSING_FIELDS', message: 'email is required' }, 400);
    }

    // Always return ok to avoid revealing whether email exists
    const result = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (result.length > 0) {
      const user = result[0];
      const rawToken = `pr_${randomBytes(32).toString('hex')}`;
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
      await emailService.sendPasswordResetEmail(user.email, resetUrl);
    }

    return c.json({ ok: true });
  });

  // POST /auth/reset-password
  router.post('/reset-password', async (c) => {
    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ code: 'INVALID_BODY', message: 'Invalid JSON body' }, 400);
    }
    const token = getTrimmedString(body.token);
    const password = getString(body.password);

    if (!token || !password) {
      return c.json({ code: 'MISSING_FIELDS', message: 'token and password are required' }, 400);
    }

    if (password.length < 8) {
      return c.json({ code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' }, 400);
    }

    const tokenHash = hashToken(token);

    const tokenResult = await db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (tokenResult.length === 0) {
      return c.json({ code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' }, 400);
    }

    const resetToken = tokenResult[0];

    if (resetToken.usedAt) {
      return c.json({ code: 'TOKEN_USED', message: 'This reset token has already been used' }, 400);
    }

    if (new Date() > resetToken.expiresAt) {
      return c.json({ code: 'TOKEN_EXPIRED', message: 'This reset token has expired' }, 400);
    }

    // Update password
    const newPasswordHash = await hashPassword(password);
    await db
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, resetToken.userId));

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id));

    // Delete all sessions for this user (force re-login)
    await db.delete(sessions).where(eq(sessions.userId, resetToken.userId));

    return c.json({ ok: true });
  });

  // POST /auth/send-verification
  router.post('/send-verification', async (c) => {
    // Requires session auth
    const authHeader = c.req.header('Authorization');
    const cookieHeader = c.req.header('Cookie');

    let token: string | null = null;

    if (authHeader?.startsWith('Bearer st_')) {
      token = authHeader.slice(7);
    } else if (cookieHeader) {
      token = getSessionTokenFromCookieHeader(cookieHeader);
    }

    if (!token) {
      return c.json({ code: 'UNAUTHORIZED', message: 'Not authenticated' }, 401);
    }

    const sessionTokenHash = hashToken(token);

    const sessionResult = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(
        and(
          eq(sessions.tokenHash, sessionTokenHash),
          gte(sessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (sessionResult.length === 0) {
      return c.json({ code: 'UNAUTHORIZED', message: 'Invalid or expired session' }, 401);
    }

    const userId = sessionResult[0].userId;

    const userResult = await db
      .select({ id: users.id, email: users.email, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userResult.length === 0) {
      return c.json({ code: 'UNAUTHORIZED', message: 'User not found' }, 401);
    }

    const user = userResult[0];

    if (user.emailVerified) {
      return c.json({ code: 'ALREADY_VERIFIED', message: 'Email is already verified' }, 400);
    }

    const rawToken = `ev_${randomBytes(32).toString('hex')}`;
    const verificationTokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(emailVerificationTokens).values({
      userId: user.id,
      tokenHash: verificationTokenHash,
      expiresAt,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/dashboard/verification?token=${rawToken}`;
    await emailService.sendVerificationEmail(user.email, verifyUrl);

    return c.json({ ok: true });
  });

  // POST /auth/verify-email
  router.post('/verify-email', async (c) => {
    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ code: 'INVALID_BODY', message: 'Invalid JSON body' }, 400);
    }
    const token = getTrimmedString(body.token);

    if (!token) {
      return c.json({ code: 'MISSING_FIELDS', message: 'token is required' }, 400);
    }

    const tokenHash = hashToken(token);

    const tokenResult = await db
      .select({
        id: emailVerificationTokens.id,
        userId: emailVerificationTokens.userId,
        expiresAt: emailVerificationTokens.expiresAt,
        verifiedAt: emailVerificationTokens.verifiedAt,
      })
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, tokenHash))
      .limit(1);

    if (tokenResult.length === 0) {
      return c.json({ code: 'INVALID_TOKEN', message: 'Invalid or expired verification token' }, 400);
    }

    const verificationToken = tokenResult[0];

    if (verificationToken.verifiedAt) {
      return c.json({ code: 'TOKEN_USED', message: 'This verification token has already been used' }, 400);
    }

    if (new Date() > verificationToken.expiresAt) {
      return c.json({ code: 'TOKEN_EXPIRED', message: 'This verification token has expired' }, 400);
    }

    // Mark email as verified
    await db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, verificationToken.userId));

    // Mark token as used
    await db
      .update(emailVerificationTokens)
      .set({ verifiedAt: new Date() })
      .where(eq(emailVerificationTokens.id, verificationToken.id));

    return c.json({ ok: true });
  });

  return router;
}
