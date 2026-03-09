import { test, expect } from '@playwright/test';
import {
  API_URL,
  uniqueEmail,
  uniqueName,
  signupUser,
  loginUser,
  assertServerReachable,
} from './helpers';

test.beforeAll(async ({ request }) => {
  await assertServerReachable(request);
});

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------
test.describe('POST /auth/signup', () => {
  test('creates a new user and returns 201 with session + refresh tokens', async ({ request }) => {
    const email = uniqueEmail();
    const name = uniqueName();

    const res = await request.post(`${API_URL}/auth/signup`, {
      data: { email, name, password: 'Str0ngP@ss!' },
    });

    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(email.toLowerCase());
    expect(body.user.name).toBe(name);
    expect(typeof body.user.id).toBe('string');
    expect(typeof body.token).toBe('string');
    expect(body.token).toMatch(/^st_/);
    expect(typeof body.refresh_token).toBe('string');
    expect(body.refresh_token).toMatch(/^rt_/);
    expect(body.project).toBeDefined();
    expect(typeof body.project.id).toBe('string');
    expect(typeof body.project.slug).toBe('string');
  });

  test('returns 409 for duplicate email', async ({ request }) => {
    const email = uniqueEmail();
    await signupUser(request, { email });

    const res = await request.post(`${API_URL}/auth/signup`, {
      data: { email, name: 'Dup User', password: 'Str0ngP@ss!' },
    });

    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('EMAIL_EXISTS');
  });

  test('returns 400 when required fields are missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/signup`, {
      data: { email: uniqueEmail() },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('MISSING_FIELDS');
  });

  test('returns 400 for invalid email format', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/signup`, {
      data: { email: 'not-an-email', name: 'Bad Email', password: 'Str0ngP@ss!' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_EMAIL');
  });

  test('returns 400 for short password (< 8 chars)', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/signup`, {
      data: { email: uniqueEmail(), name: 'Short Pw', password: 'Ab1!' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('WEAK_PASSWORD');
  });
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
test.describe('POST /auth/login', () => {
  const sharedEmail = uniqueEmail();
  const sharedPassword = 'LoginTest1234!';

  test.beforeAll(async ({ request }) => {
    await signupUser(request, { email: sharedEmail, password: sharedPassword });
  });

  test('logs in with valid credentials and returns refresh token', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/login`, {
      data: { email: sharedEmail, password: sharedPassword },
    });

    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.user.email).toBe(sharedEmail.toLowerCase());
    expect(typeof body.token).toBe('string');
    expect(body.token).toMatch(/^st_/);
    expect(typeof body.refresh_token).toBe('string');
    expect(body.refresh_token).toMatch(/^rt_/);
    expect(Array.isArray(body.projects)).toBeTruthy();
    expect(body.projects.length).toBeGreaterThanOrEqual(1);
  });

  test('returns 401 for wrong password', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/login`, {
      data: { email: sharedEmail, password: 'WrongPassword!' },
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });

  test('returns 401 for non-existent email', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/login`, {
      data: { email: 'ghost@nowhere.test', password: 'whatever123' },
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });

  test('returns 400 when fields are missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/login`, {
      data: { email: sharedEmail },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('MISSING_FIELDS');
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
test.describe('POST /auth/logout', () => {
  test('logs out a valid session', async ({ request }) => {
    const { token } = await signupUser(request);

    const res = await request.post(`${API_URL}/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // Session should now be invalid
    const meRes = await request.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.status()).toBe(401);
  });

  test('returns 200 even with an invalid session (no-op)', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/logout`, {
      headers: { Authorization: 'Bearer st_invalid_token_value' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Me
// ---------------------------------------------------------------------------
test.describe('GET /auth/me', () => {
  test('returns user info with a valid session', async ({ request }) => {
    const signup = await signupUser(request);

    const res = await request.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${signup.token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.user).toBeDefined();
    expect(body.user.id).toBe(signup.user.id);
    expect(body.user.email).toBe(signup.user.email);
    expect(Array.isArray(body.projects)).toBeTruthy();
  });

  test('returns 401 without a session', async ({ request }) => {
    const res = await request.get(`${API_URL}/auth/me`);

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });
});

// ---------------------------------------------------------------------------
// Refresh token rotation
// ---------------------------------------------------------------------------
test.describe('POST /auth/refresh', () => {
  const email = uniqueEmail();
  const password = 'RefreshTest1234!';

  test.beforeAll(async ({ request }) => {
    await signupUser(request, { email, password });
  });

  test('refresh token issues a new session + refresh token pair', async ({ request }) => {
    const login = await loginUser(request, email, password);

    const refreshRes = await request.post(`${API_URL}/auth/refresh`, {
      data: { refresh_token: login.refresh_token },
    });

    expect(refreshRes.status()).toBe(200);
    const body = await refreshRes.json();

    expect(typeof body.token).toBe('string');
    expect(body.token).toMatch(/^st_/);
    expect(body.token).not.toBe(login.token);

    expect(typeof body.refresh_token).toBe('string');
    expect(body.refresh_token).toMatch(/^rt_/);
    expect(body.refresh_token).not.toBe(login.refresh_token);
  });

  test('used refresh token is rejected (replay detection)', async ({ request }) => {
    const login = await loginUser(request, email, password);

    // First use — should succeed
    const first = await request.post(`${API_URL}/auth/refresh`, {
      data: { refresh_token: login.refresh_token },
    });
    expect(first.status()).toBe(200);

    // Replay the same token — should be rejected
    const replay = await request.post(`${API_URL}/auth/refresh`, {
      data: { refresh_token: login.refresh_token },
    });
    expect(replay.status()).toBe(401);
    const body = await replay.json();
    expect(body.code).toBe('TOKEN_REUSED');
  });

  test('invalid refresh token is rejected with 401', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/refresh`, {
      data: { refresh_token: 'rt_invalid_token_value_here' },
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('INVALID_TOKEN');
  });

  test('missing refresh token returns 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/refresh`, {
      data: {},
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_TOKEN');
  });

  test('token without rt_ prefix returns 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/refresh`, {
      data: { refresh_token: 'not_a_valid_format' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_TOKEN');
  });

  test('new session token from refresh is valid for /auth/me', async ({ request }) => {
    const login = await loginUser(request, email, password);

    const refreshRes = await request.post(`${API_URL}/auth/refresh`, {
      data: { refresh_token: login.refresh_token },
    });
    expect(refreshRes.status()).toBe(200);
    const refreshBody = await refreshRes.json();

    const meRes = await request.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${refreshBody.token}` },
    });

    expect(meRes.status()).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.user.email).toBe(email.toLowerCase());
  });
});

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------
test.describe('POST /auth/forgot-password', () => {
  test('returns 200 for a valid registered email', async ({ request }) => {
    const { user } = await signupUser(request);

    const res = await request.post(`${API_URL}/auth/forgot-password`, {
      data: { email: user.email },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('returns 200 for a non-existent email (no info leak)', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/forgot-password`, {
      data: { email: 'nonexistent@nowhere.test' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('returns 400 when email is missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/forgot-password`, {
      data: {},
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('MISSING_FIELDS');
  });
});

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------
test.describe('POST /auth/reset-password', () => {
  test('returns 400 for an invalid token', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/reset-password`, {
      data: { token: 'pr_bogus_token_value', password: 'NewStr0ng!' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_TOKEN');
  });

  test('returns 400 when fields are missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/reset-password`, {
      data: { token: 'pr_some_token' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('MISSING_FIELDS');
  });
});

// ---------------------------------------------------------------------------
// Verify email
// ---------------------------------------------------------------------------
test.describe('POST /auth/verify-email', () => {
  test('returns 400 for an invalid token', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/verify-email`, {
      data: { token: 'ev_bogus_verification_token' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_TOKEN');
  });

  test('returns 400 when token is missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/verify-email`, {
      data: {},
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('MISSING_FIELDS');
  });
});
