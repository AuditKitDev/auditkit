import { test, expect } from '@playwright/test';
import {
  API_URL,
  signupUser,
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
// GET /dashboard/retention
// ---------------------------------------------------------------------------
test.describe('GET /dashboard/retention', () => {
  test('returns default retention config (30 days)', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/retention`, {
      headers: sessionHeaders(signup.token),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.retention_days).toBe('number');
    expect(body.retention_days).toBeGreaterThanOrEqual(1);
    expect(typeof body.legal_hold).toBe('boolean');
  });

  test('returns 401 without session', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/retention`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PUT /dashboard/retention
// ---------------------------------------------------------------------------
test.describe('PUT /dashboard/retention', () => {
  test('updates retention days', async ({ request }) => {
    const res = await request.put(`${API_URL}/dashboard/retention`, {
      headers: sessionHeaders(signup.token),
      data: { project_id: signup.project.id, retention_days: 90 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.retention_days).toBe(90);

    // Verify it persisted
    const getRes = await request.get(
      `${API_URL}/dashboard/retention?project_id=${signup.project.id}`,
      { headers: sessionHeaders(signup.token) },
    );
    expect(getRes.status()).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.retention_days).toBe(90);
  });

  test('returns 400 for invalid retention_days (0)', async ({ request }) => {
    const res = await request.put(`${API_URL}/dashboard/retention`, {
      headers: sessionHeaders(signup.token),
      data: { project_id: signup.project.id, retention_days: 0 },
    });

    expect(res.status()).toBe(400);
  });

  test('returns 401 without session', async ({ request }) => {
    const res = await request.put(`${API_URL}/dashboard/retention`, {
      data: { retention_days: 30 },
    });
    expect(res.status()).toBe(401);
  });
});
