import { test, expect } from '@playwright/test';
import {
  API_URL,
  createAuthenticatedContext,
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
// POST /v1/webhooks
// ---------------------------------------------------------------------------
test.describe('POST /v1/webhooks', () => {
  test('creates a webhook and returns 201 with secret', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/webhooks`, {
      headers: apiHeaders(auth.apiKey),
      data: {
        url: 'https://example.com/webhook',
        events: ['document.created', 'document.deleted'],
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(typeof body.id).toBe('string');
    expect(body.url).toBe('https://example.com/webhook');
    expect(typeof body.secret).toBe('string');
    expect(body.secret).toMatch(/^whsec_/);
    expect(body.events).toEqual(['document.created', 'document.deleted']);
    expect(body.is_active).toBe(true);
  });

  test('defaults events to ["*"] when omitted', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/webhooks`, {
      headers: apiHeaders(auth.apiKey),
      data: { url: 'https://example.com/all-events' },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.events).toEqual(['*']);
  });

  test('returns 400 for SSRF-blocked URL (localhost)', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/webhooks`, {
      headers: apiHeaders(auth.apiKey),
      data: { url: 'http://localhost:8080/evil' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_URL');
  });

  test('returns 400 for SSRF-blocked URL (private IP)', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/webhooks`, {
      headers: apiHeaders(auth.apiKey),
      data: { url: 'http://192.168.1.1/internal' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_URL');
  });

  test('returns 400 when URL is missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/webhooks`, {
      headers: apiHeaders(auth.apiKey),
      data: { events: ['user.login'] },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('MISSING_FIELD');
  });

  test('returns 400 when events is not an array of strings', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/webhooks`, {
      headers: apiHeaders(auth.apiKey),
      data: { url: 'https://example.com/wh', events: [123, true] },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_FIELD');
  });
});

// ---------------------------------------------------------------------------
// GET /v1/webhooks
// ---------------------------------------------------------------------------
test.describe('GET /v1/webhooks', () => {
  test.beforeAll(async ({ request }) => {
    // Seed a webhook so the list is non-empty
    await request.post(`${API_URL}/v1/webhooks`, {
      headers: apiHeaders(auth.apiKey),
      data: { url: 'https://example.com/list-test' },
    });
  });

  test('lists webhooks for the project', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/webhooks`, {
      headers: apiHeaders(auth.apiKey),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const wh = body.data[0];
    expect(typeof wh.id).toBe('string');
    expect(typeof wh.url).toBe('string');
    expect(Array.isArray(wh.events)).toBeTruthy();
    expect(typeof wh.is_active).toBe('boolean');
    expect(typeof wh.created_at).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// PATCH /v1/webhooks/:id
// ---------------------------------------------------------------------------
test.describe('PATCH /v1/webhooks/:id', () => {
  let webhookId: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/webhooks`, {
      headers: apiHeaders(auth.apiKey),
      data: { url: 'https://example.com/patchable', events: ['user.login'] },
    });
    const body = await res.json();
    webhookId = body.id;
  });

  test('updates the URL', async ({ request }) => {
    const res = await request.patch(`${API_URL}/v1/webhooks/${webhookId}`, {
      headers: apiHeaders(auth.apiKey),
      data: { url: 'https://example.com/patched' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://example.com/patched');
  });

  test('updates events list', async ({ request }) => {
    const res = await request.patch(`${API_URL}/v1/webhooks/${webhookId}`, {
      headers: apiHeaders(auth.apiKey),
      data: { events: ['document.created', 'document.deleted'] },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.events).toEqual(['document.created', 'document.deleted']);
  });

  test('returns 400 for invalid URL on update', async ({ request }) => {
    const res = await request.patch(`${API_URL}/v1/webhooks/${webhookId}`, {
      headers: apiHeaders(auth.apiKey),
      data: { url: 'http://127.0.0.1/evil' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_URL');
  });

  test('returns 404 for non-existent webhook', async ({ request }) => {
    const res = await request.patch(
      `${API_URL}/v1/webhooks/00000000-0000-0000-0000-000000000000`,
      {
        headers: apiHeaders(auth.apiKey),
        data: { url: 'https://example.com/ghost' },
      },
    );

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// DELETE /v1/webhooks/:id
// ---------------------------------------------------------------------------
test.describe('DELETE /v1/webhooks/:id', () => {
  test('deletes an existing webhook', async ({ request }) => {
    // Create one to delete
    const createRes = await request.post(`${API_URL}/v1/webhooks`, {
      headers: apiHeaders(auth.apiKey),
      data: { url: 'https://example.com/deleteme' },
    });
    const created = await createRes.json();

    const res = await request.delete(`${API_URL}/v1/webhooks/${created.id}`, {
      headers: apiHeaders(auth.apiKey),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
  });

  test('returns 404 for non-existent webhook', async ({ request }) => {
    const res = await request.delete(
      `${API_URL}/v1/webhooks/00000000-0000-0000-0000-000000000000`,
      { headers: apiHeaders(auth.apiKey) },
    );

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });
});
