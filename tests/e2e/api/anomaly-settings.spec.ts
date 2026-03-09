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
// GET /dashboard/anomaly-settings
// ---------------------------------------------------------------------------
test.describe('GET /dashboard/anomaly-settings', () => {
  test('returns default anomaly detection settings', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/anomaly-settings`, {
      headers: sessionHeaders(signup.token),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.settings).toBeDefined();

    // Verify default detection rules exist
    const { settings } = body;
    expect(settings.impossibleTravel).toBeDefined();
    expect(typeof settings.impossibleTravel.enabled).toBe('boolean');
    expect(settings.unusualVolume).toBeDefined();
    expect(typeof settings.unusualVolume.multiplier).toBe('number');
    expect(settings.privilegeEscalation).toBeDefined();
    expect(Array.isArray(settings.privilegeEscalation.actions)).toBeTruthy();
  });

  test('returns 401 without session', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/anomaly-settings`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PUT /dashboard/anomaly-settings
// ---------------------------------------------------------------------------
test.describe('PUT /dashboard/anomaly-settings', () => {
  test('updates anomaly detection settings partially', async ({ request }) => {
    const res = await request.put(`${API_URL}/dashboard/anomaly-settings`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        settings: {
          impossibleTravel: { enabled: false },
          unusualVolume: { enabled: true, multiplier: 5 },
        },
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.settings).toBeDefined();
    expect(body.settings.impossibleTravel.enabled).toBe(false);
    expect(body.settings.unusualVolume.multiplier).toBe(5);
  });

  test('returns 400 when settings is missing', async ({ request }) => {
    const res = await request.put(`${API_URL}/dashboard/anomaly-settings`, {
      headers: sessionHeaders(signup.token),
      data: { project_id: signup.project.id },
    });

    expect(res.status()).toBe(400);
  });

  test('returns 401 without session', async ({ request }) => {
    const res = await request.put(`${API_URL}/dashboard/anomaly-settings`, {
      data: { settings: { impossibleTravel: { enabled: false } } },
    });
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /dashboard/anomalies (alert listing)
// ---------------------------------------------------------------------------
test.describe('GET /dashboard/anomalies', () => {
  test('returns anomaly alerts list (possibly empty)', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/anomalies`, {
      headers: sessionHeaders(signup.token),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.pagination).toBeDefined();
    expect(typeof body.pagination.has_more).toBe('boolean');
  });
});
