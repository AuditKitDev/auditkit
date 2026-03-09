import { test, expect } from '@playwright/test';
import {
  API_URL,
  signupUser,
  sessionHeaders,
  assertServerReachable,
} from './helpers';

let sessionToken: string;

test.beforeAll(async ({ request }) => {
  await assertServerReachable(request);
});

test.beforeAll(async ({ request }) => {
  const signup = await signupUser(request);
  sessionToken = signup.token;
});

// ---------------------------------------------------------------------------
// POST /billing/checkout
// ---------------------------------------------------------------------------
test.describe('POST /billing/checkout', () => {
  test('returns 400 for invalid plan', async ({ request }) => {
    const res = await request.post(`${API_URL}/billing/checkout`, {
      headers: sessionHeaders(sessionToken),
      data: {
        plan: 'nonexistent_plan',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID');
  });

  test('returns 400 for free plan', async ({ request }) => {
    const res = await request.post(`${API_URL}/billing/checkout`, {
      headers: sessionHeaders(sessionToken),
      data: {
        plan: 'free',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID');
  });

  test('returns 400 when required fields are missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/billing/checkout`, {
      headers: sessionHeaders(sessionToken),
      data: { plan: 'pro' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID');
  });

  test('returns 401 without session', async ({ request }) => {
    const res = await request.post(`${API_URL}/billing/checkout`, {
      data: {
        plan: 'pro',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      },
    });

    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /billing/subscription (includes N+1 fix coverage)
// ---------------------------------------------------------------------------
test.describe('GET /billing/subscription', () => {
  test('returns subscription info with event_count as number', async ({ request }) => {
    const res = await request.get(`${API_URL}/billing/subscription`, {
      headers: sessionHeaders(sessionToken),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.plan).toBe('free');
    expect(typeof body.plan_name).toBe('string');
    expect(body.status).toBe('active');
    expect(typeof body.event_quota).toBe('number');
    expect(typeof body.project_quota).toBe('number');
    expect(typeof body.retention_days).toBe('number');
    // N+1 fix: event_count must be a real number, not undefined
    expect(typeof body.event_count).toBe('number');
    expect(body.event_count).toBeGreaterThanOrEqual(0);
    expect(typeof body.project_count).toBe('number');
    expect(typeof body.has_stripe).toBe('boolean');
  });

  test('returns 401 without session', async ({ request }) => {
    const res = await request.get(`${API_URL}/billing/subscription`);
    expect(res.status()).toBe(401);
  });
});
