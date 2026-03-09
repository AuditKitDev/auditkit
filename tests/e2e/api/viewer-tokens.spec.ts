import { test, expect } from '@playwright/test';
import {
  API_URL,
  createAuthenticatedContext,
  uniqueTenantId,
  apiHeaders,
  buildEventPayload,
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

  // Create tenant
  const res = await request.post(`${API_URL}/v1/tenants`, {
    headers: apiHeaders(auth.apiKey),
    data: { external_id: tenantId, name: 'Viewer Token Tenant' },
  });
  expect(res.status()).toBe(201);
});

// ---------------------------------------------------------------------------
// POST /v1/viewer-tokens
// ---------------------------------------------------------------------------
test.describe('POST /v1/viewer-tokens', () => {
  test('creates a viewer token with string expiry (e.g., "1h")', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/viewer-tokens`, {
      headers: apiHeaders(auth.apiKey),
      data: { tenant_id: tenantId, expires_in: '1h' },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(typeof body.token).toBe('string');
    expect(body.token).toMatch(/^vt_/);
    expect(typeof body.expires_at).toBe('string');

    // Verify the token is usable for read access
    const eventsRes = await request.get(`${API_URL}/v1/events`, {
      headers: { Authorization: `Bearer ${body.token}` },
    });
    expect(eventsRes.status()).toBe(200);
  });

  test('creates a viewer token with numeric expiry (seconds)', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/viewer-tokens`, {
      headers: apiHeaders(auth.apiKey),
      data: { tenant_id: tenantId, expires_in: 3600 },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.token).toMatch(/^vt_/);
    expect(typeof body.expires_at).toBe('string');
  });

  test('uses default 1h expiry when expires_in is omitted', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/viewer-tokens`, {
      headers: apiHeaders(auth.apiKey),
      data: { tenant_id: tenantId },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.token).toMatch(/^vt_/);

    // Check that expires_at is roughly 1 hour from now
    const expiresAt = new Date(body.expires_at).getTime();
    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;
    expect(expiresAt).toBeGreaterThan(now);
    expect(expiresAt).toBeLessThanOrEqual(now + oneHourMs + 10000); // 10s tolerance
  });

  test('returns 400 when tenant_id is missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/viewer-tokens`, {
      headers: apiHeaders(auth.apiKey),
      data: {},
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('MISSING_FIELD');
  });

  test('returns 404 for a non-existent tenant', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/viewer-tokens`, {
      headers: apiHeaders(auth.apiKey),
      data: { tenant_id: `nonexistent_${Date.now()}` },
    });

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// Viewer token permissions
// ---------------------------------------------------------------------------
test.describe('viewer token permissions', () => {
  let viewerToken: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/viewer-tokens`, {
      headers: apiHeaders(auth.apiKey),
      data: { tenant_id: tenantId, expires_in: '1h' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    viewerToken = body.token;
  });

  test('can read events for its tenant', async ({ request }) => {
    const seedRes = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: buildEventPayload(tenantId, { action: 'viewer.allowed_read' }),
    });
    expect(seedRes.status()).toBe(201);

    const res = await request.get(`${API_URL}/v1/events`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('cannot create events', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
      data: buildEventPayload(tenantId, { action: 'viewer.denied_write' }),
    });
    expect(res.status()).toBe(403);
  });

  test('cannot create bulk events', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events/bulk`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
      data: { events: [buildEventPayload(tenantId, { action: 'viewer.denied_bulk' })] },
    });
    expect(res.status()).toBe(403);
  });

  test('cannot access tenant metadata endpoints', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/tenants`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test('cannot create webhooks', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/webhooks`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
      data: { url: 'https://example.com/viewer-denied' },
    });
    expect(res.status()).toBe(403);
  });

  test('cannot mint nested viewer tokens', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/viewer-tokens`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
      data: { tenant_id: tenantId },
    });
    expect(res.status()).toBe(403);
  });

  test('cannot access GraphQL', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/graphql`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
      data: { query: '{ events(first: 1) { totalCount } }' },
    });
    expect(res.status()).toBe(403);
  });

  test('cannot access verification endpoints', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/verify?tenant_id=${tenantId}`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.status()).toBe(403);
  });
});
