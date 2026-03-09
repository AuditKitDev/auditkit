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

  // Create tenant
  await request.post(`${API_URL}/v1/tenants`, {
    headers: apiHeaders(auth.apiKey),
    data: { external_id: tenantId, name: 'Verify Test Tenant' },
  });

  // Seed a few events so the chain has data
  for (let i = 0; i < 3; i++) {
    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: buildEventPayload(tenantId, { action: 'verify.seed' }),
    });
    expect(res.status()).toBe(201);
  }
});

// ---------------------------------------------------------------------------
// GET /v1/verify
// ---------------------------------------------------------------------------
test.describe('GET /v1/verify', () => {
  test('verifies hash chain for a tenant', async ({ request }) => {
    const res = await request.get(
      `${API_URL}/v1/verify?tenant_id=${tenantId}`,
      { headers: apiHeaders(auth.apiKey) },
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.valid).toBe('boolean');
    expect(typeof body.events_checked).toBe('number');
    expect(body.events_checked).toBeGreaterThanOrEqual(3);
    expect(typeof body.verified_at).toBe('string');
  });

  test('returns 400 when tenant_id is missing', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/verify`, {
      headers: apiHeaders(auth.apiKey),
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('MISSING_PARAM');
  });

  test('returns 404 for non-existent tenant', async ({ request }) => {
    const res = await request.get(
      `${API_URL}/v1/verify?tenant_id=nonexistent_${Date.now()}`,
      { headers: apiHeaders(auth.apiKey) },
    );

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  test('returns 400 for invalid date formats', async ({ request }) => {
    const res = await request.get(
      `${API_URL}/v1/verify?tenant_id=${tenantId}&from=not-a-date`,
      { headers: apiHeaders(auth.apiKey) },
    );

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_DATE');
  });
});

// ---------------------------------------------------------------------------
// GET /v1/verify/merkle-roots
// ---------------------------------------------------------------------------
test.describe('GET /v1/verify/merkle-roots', () => {
  test('returns a list of Merkle roots (possibly empty)', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/verify/merkle-roots`, {
      headers: apiHeaders(auth.apiKey),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();

    // If roots exist, verify shape
    if (body.data.length > 0) {
      const root = body.data[0];
      expect(typeof root.id).toBe('string');
      expect(typeof root.root_hash).toBe('string');
      expect(typeof root.event_count).toBe('number');
      expect(typeof root.created_at).toBe('string');
    }
  });
});
