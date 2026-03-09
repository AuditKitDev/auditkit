import { test, expect } from '@playwright/test';
import {
  API_URL,
  createAuthenticatedContext,
  uniqueTenantId,
  buildEventPayload,
  apiHeaders,
  assertServerReachable,
  type AuthContext,
} from './helpers';

let auth: AuthContext;
let tenantId: string;

test.beforeAll(async ({ request }) => {
  await assertServerReachable(request);
});

test.beforeAll(async ({ request }) => {
  auth = await createAuthenticatedContext(request);
  tenantId = uniqueTenantId();

  const res = await request.post(`${API_URL}/v1/tenants`, {
    headers: apiHeaders(auth.apiKey),
    data: { external_id: tenantId, name: 'Rate Limit Test Tenant' },
  });
  expect(res.status()).toBe(201);
});

// ---------------------------------------------------------------------------
// HIGH-1: Rate limit headers and enforcement
// ---------------------------------------------------------------------------
test.describe('HIGH-1: Rate limiting', () => {
  test('rate limit headers are present on successful requests', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: buildEventPayload(tenantId, { action: 'ratelimit.header_check' }),
    });

    expect(res.status()).toBe(201);

    const limit = res.headers()['x-ratelimit-limit'];
    const remaining = res.headers()['x-ratelimit-remaining'];
    const reset = res.headers()['x-ratelimit-reset'];

    expect(limit).toBeDefined();
    expect(remaining).toBeDefined();
    expect(reset).toBeDefined();

    // Limit should be a positive number
    expect(Number(limit)).toBeGreaterThan(0);

    // Remaining should be a non-negative number
    expect(Number(remaining)).toBeGreaterThanOrEqual(0);

    // Reset should be a Unix timestamp (seconds)
    const resetTs = Number(reset);
    expect(resetTs).toBeGreaterThan(Math.floor(Date.now() / 1000) - 60);
  });

  test('rate limit headers are present on read requests', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/events?limit=1`, {
      headers: apiHeaders(auth.apiKey),
    });

    expect(res.status()).toBe(200);

    const limit = res.headers()['x-ratelimit-limit'];
    const remaining = res.headers()['x-ratelimit-remaining'];
    const reset = res.headers()['x-ratelimit-reset'];

    expect(limit).toBeDefined();
    expect(remaining).toBeDefined();
    expect(reset).toBeDefined();
    expect(Number(limit)).toBeGreaterThan(0);
  });

  test('rate limit enforced — 429 returned after exceeding limit', async ({ request }) => {
    // Create a fresh user so rate limit counters start at zero
    const freshAuth = await createAuthenticatedContext(request);
    const freshTenant = uniqueTenantId();

    await request.post(`${API_URL}/v1/tenants`, {
      headers: apiHeaders(freshAuth.apiKey),
      data: { external_id: freshTenant, name: 'Rate Limit Burst Tenant' },
    });

    // Free tier write limit is 100/min. Fire 110 requests concurrently.
    // Some may succeed, but eventually we should get a 429.
    const batchSize = 110;
    const promises = Array.from({ length: batchSize }, (_, i) =>
      request.post(`${API_URL}/v1/events`, {
        headers: apiHeaders(freshAuth.apiKey),
        data: buildEventPayload(freshTenant, {
          action: 'ratelimit.burst_test',
          metadata: { index: i },
        }),
      }),
    );

    const responses = await Promise.all(promises);
    const statuses = responses.map((r) => r.status());

    // At least one should be 429 (rate limited)
    const has429 = statuses.includes(429);
    // At least some should be 201 (accepted)
    const has201 = statuses.includes(201);

    expect(has429).toBeTruthy();
    expect(has201).toBeTruthy();

    // Verify the 429 response has rate limit headers
    const limitedResponse = responses.find((r) => r.status() === 429)!;
    expect(limitedResponse.headers()['x-ratelimit-limit']).toBeDefined();
    expect(limitedResponse.headers()['x-ratelimit-remaining']).toBe('0');
    expect(limitedResponse.headers()['x-ratelimit-reset']).toBeDefined();
  });
});
