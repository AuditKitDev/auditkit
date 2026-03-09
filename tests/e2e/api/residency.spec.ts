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
// GET /dashboard/data-residency
// ---------------------------------------------------------------------------
test.describe('GET /dashboard/data-residency', () => {
  test('returns default residency config', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/data-residency`, {
      headers: sessionHeaders(signup.token),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.region).toBe('string');
    expect(['us', 'eu', 'apac', 'custom']).toContain(body.region);
    expect(typeof body.enabled).toBe('boolean');
  });

  test('returns 401 without session', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/data-residency`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PUT /dashboard/data-residency
// ---------------------------------------------------------------------------
test.describe('PUT /dashboard/data-residency', () => {
  test('updates region to eu', async ({ request }) => {
    const res = await request.put(`${API_URL}/dashboard/data-residency`, {
      headers: sessionHeaders(signup.token),
      data: { project_id: signup.project.id, region: 'eu' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.region).toBe('eu');
    expect(body.enabled).toBe(true);
  });

  test('updates region to apac', async ({ request }) => {
    const res = await request.put(`${API_URL}/dashboard/data-residency`, {
      headers: sessionHeaders(signup.token),
      data: { project_id: signup.project.id, region: 'apac' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.region).toBe('apac');
  });

  test('returns 400 when region is missing', async ({ request }) => {
    const res = await request.put(`${API_URL}/dashboard/data-residency`, {
      headers: sessionHeaders(signup.token),
      data: { project_id: signup.project.id },
    });

    expect(res.status()).toBe(400);
  });

  test('returns 401 without session', async ({ request }) => {
    const res = await request.put(`${API_URL}/dashboard/data-residency`, {
      data: { region: 'us' },
    });
    expect(res.status()).toBe(401);
  });
});
