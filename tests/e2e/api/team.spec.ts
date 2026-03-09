import { test, expect } from '@playwright/test';
import {
  API_URL,
  signupUser,
  uniqueEmail,
  sessionHeaders,
  assertServerReachable,
  type SignupResult,
} from './helpers';

let signup: SignupResult;

test.beforeAll(async ({ request }) => {
  await assertServerReachable(request);
});

test.beforeAll(async ({ request }) => {
  signup = await signupUser(request);
});

// ---------------------------------------------------------------------------
// GET /dashboard/team/members
// ---------------------------------------------------------------------------
test.describe('GET /dashboard/team/members', () => {
  test('returns array with at least the owner', async ({ request }) => {
    const res = await request.get(
      `${API_URL}/dashboard/team/members?project_id=${signup.project.id}`,
      { headers: sessionHeaders(signup.token) },
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const owner = body.data[0];
    expect(owner.role).toBe('owner');
    expect(owner.id).toBe(signup.user.id);
    expect(typeof owner.name).toBe('string');
    expect(typeof owner.email).toBe('string');
    expect(typeof owner.joinedAt).toBe('string');
  });

  test('returns 401 without session', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/team/members`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /dashboard/team/invite
// ---------------------------------------------------------------------------
test.describe('POST /dashboard/team/invite', () => {
  test('invite with valid email returns 201', async ({ request }) => {
    const inviteEmail = uniqueEmail();

    const res = await request.post(`${API_URL}/dashboard/team/invite`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        email: inviteEmail,
        role: 'member',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(typeof body.id).toBe('string');
    expect(body.email).toBe(inviteEmail.toLowerCase());
    expect(body.role).toBe('member');
    expect(typeof body.expires_at).toBe('string');
  });

  test('invite with admin role returns 201', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/team/invite`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        email: uniqueEmail(),
        role: 'admin',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.role).toBe('admin');
  });

  test('invite with role=owner returns 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/team/invite`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        email: uniqueEmail(),
        role: 'owner',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('BAD_REQUEST');
  });

  test('invite with invalid email returns 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/team/invite`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        email: 'not-an-email',
        role: 'member',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('BAD_REQUEST');
  });

  test('invite with missing email returns 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/team/invite`, {
      headers: sessionHeaders(signup.token),
      data: { project_id: signup.project.id, role: 'member' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('BAD_REQUEST');
  });
});

// ---------------------------------------------------------------------------
// DELETE /dashboard/team/members/:id
// ---------------------------------------------------------------------------
test.describe('DELETE /dashboard/team/members/:id', () => {
  test('random UUID returns 404', async ({ request }) => {
    const res = await request.delete(
      `${API_URL}/dashboard/team/members/00000000-0000-0000-0000-000000000000`,
      { headers: sessionHeaders(signup.token) },
    );

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  test('returns 401 without session', async ({ request }) => {
    const res = await request.delete(`${API_URL}/dashboard/team/members/some-id`);
    expect(res.status()).toBe(401);
  });
});
