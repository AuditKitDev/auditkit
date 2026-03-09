import { test, expect } from '@playwright/test';
import {
  API_URL,
  createAuthenticatedContext,
  uniqueTenantId,
  apiHeaders,
  assertServerReachable,
  type AuthContext,
} from './helpers';

let auth: AuthContext;

test.beforeAll(async ({ request }) => {
  await assertServerReachable(request);
});

test.beforeAll(async ({ request }) => {
  auth = await createAuthenticatedContext(request);
});

// ---------------------------------------------------------------------------
// POST /v1/tenants
// ---------------------------------------------------------------------------
test.describe('POST /v1/tenants', () => {
  test('creates a new tenant and returns 201', async ({ request }) => {
    const extId = uniqueTenantId();

    const res = await request.post(`${API_URL}/v1/tenants`, {
      headers: apiHeaders(auth.apiKey),
      data: { external_id: extId, name: 'Acme Corp', metadata: { plan: 'pro' } },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.external_id).toBe(extId);
    expect(body.name).toBe('Acme Corp');
    expect(body.metadata).toEqual({ plan: 'pro' });
    expect(typeof body.id).toBe('string');
    expect(typeof body.created_at).toBe('string');
  });

  test('upserts when external_id already exists', async ({ request }) => {
    const extId = uniqueTenantId();

    // Create
    const res1 = await request.post(`${API_URL}/v1/tenants`, {
      headers: apiHeaders(auth.apiKey),
      data: { external_id: extId, name: 'First Name' },
    });
    expect(res1.status()).toBe(201);
    const created = await res1.json();

    // Upsert with new name
    const res2 = await request.post(`${API_URL}/v1/tenants`, {
      headers: apiHeaders(auth.apiKey),
      data: { external_id: extId, name: 'Updated Name' },
    });
    expect(res2.status()).toBe(200);
    const upserted = await res2.json();
    expect(upserted.id).toBe(created.id);
    expect(upserted.name).toBe('Updated Name');
  });

  test('returns 400 when external_id is missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/tenants`, {
      headers: apiHeaders(auth.apiKey),
      data: { name: 'No External Id' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('MISSING_FIELD');
  });
});

// ---------------------------------------------------------------------------
// GET /v1/tenants
// ---------------------------------------------------------------------------
test.describe('GET /v1/tenants', () => {
  test.beforeAll(async ({ request }) => {
    // Seed a tenant so the list is non-empty
    await request.post(`${API_URL}/v1/tenants`, {
      headers: apiHeaders(auth.apiKey),
      data: { external_id: uniqueTenantId(), name: 'List Seed' },
    });
  });

  test('lists tenants for the project', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/tenants`, {
      headers: apiHeaders(auth.apiKey),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const tenant = body.data[0];
    expect(typeof tenant.id).toBe('string');
    expect(typeof tenant.external_id).toBe('string');
    expect(typeof tenant.name).toBe('string');
    expect(typeof tenant.event_count).toBe('number');
    expect(typeof tenant.created_at).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// GET /v1/tenants/:tenant_id
// ---------------------------------------------------------------------------
test.describe('GET /v1/tenants/:tenant_id', () => {
  let extId: string;

  test.beforeAll(async ({ request }) => {
    extId = uniqueTenantId();
    await request.post(`${API_URL}/v1/tenants`, {
      headers: apiHeaders(auth.apiKey),
      data: { external_id: extId, name: 'Detail Tenant' },
    });
  });

  test('returns tenant details', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/tenants/${extId}`, {
      headers: apiHeaders(auth.apiKey),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.external_id).toBe(extId);
    expect(body.name).toBe('Detail Tenant');
    expect(typeof body.event_count).toBe('number');
  });

  test('returns 404 for non-existent tenant', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/tenants/nonexistent_${Date.now()}`, {
      headers: apiHeaders(auth.apiKey),
    });

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// PATCH /v1/tenants/:tenant_id
// ---------------------------------------------------------------------------
test.describe('PATCH /v1/tenants/:tenant_id', () => {
  let extId: string;

  test.beforeAll(async ({ request }) => {
    extId = uniqueTenantId();
    await request.post(`${API_URL}/v1/tenants`, {
      headers: apiHeaders(auth.apiKey),
      data: { external_id: extId, name: 'Patch Me' },
    });
  });

  test('updates name and metadata', async ({ request }) => {
    const res = await request.patch(`${API_URL}/v1/tenants/${extId}`, {
      headers: apiHeaders(auth.apiKey),
      data: { name: 'Patched Name', metadata: { tier: 'enterprise' } },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Patched Name');
    expect(body.metadata).toEqual({ tier: 'enterprise' });
  });

  test('returns 404 for non-existent tenant', async ({ request }) => {
    const res = await request.patch(`${API_URL}/v1/tenants/nonexistent_${Date.now()}`, {
      headers: apiHeaders(auth.apiKey),
      data: { name: 'Ghost' },
    });

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });
});
