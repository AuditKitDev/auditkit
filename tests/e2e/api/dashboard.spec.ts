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
// GET /dashboard/projects
// ---------------------------------------------------------------------------
test.describe('GET /dashboard/projects', () => {
  test('lists projects for the authenticated user', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/projects`, {
      headers: sessionHeaders(signup.token),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const project = body.data[0];
    expect(typeof project.id).toBe('string');
    expect(typeof project.name).toBe('string');
    expect(typeof project.slug).toBe('string');
    expect(typeof project.created_at).toBe('string');
  });

  test('returns 401 without session', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/projects`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /dashboard/stats
// ---------------------------------------------------------------------------
test.describe('GET /dashboard/stats', () => {
  test('returns event and tenant counts', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/stats`, {
      headers: sessionHeaders(signup.token),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.event_count).toBe('number');
    expect(typeof body.tenant_count).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// API keys CRUD
// ---------------------------------------------------------------------------
test.describe('GET /dashboard/api-keys', () => {
  test('lists API keys for the project', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/api-keys`, {
      headers: sessionHeaders(signup.token),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const key = body.data[0];
    expect(typeof key.id).toBe('string');
    expect(typeof key.name).toBe('string');
    expect(typeof key.key_prefix).toBe('string');
    expect(typeof key.environment).toBe('string');
    expect(Array.isArray(key.scopes)).toBeTruthy();
  });
});

test.describe('POST /dashboard/api-keys', () => {
  test('creates a new API key and returns the raw key', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/api-keys`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        name: 'Dashboard E2E Key',
        environment: 'production',
        scopes: ['read', 'write'],
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(typeof body.key).toBe('string');
    expect(body.key).toMatch(/^ak_live_/);
    expect(typeof body.id).toBe('string');
  });
});

test.describe('DELETE /dashboard/api-keys/:id', () => {
  test('revokes an API key', async ({ request }) => {
    const createRes = await request.post(`${API_URL}/dashboard/api-keys`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        name: 'Revoke Me',
        environment: 'production',
        scopes: ['read'],
      },
    });
    const created = await createRes.json();

    const res = await request.delete(
      `${API_URL}/dashboard/api-keys/${created.id}?project_id=${signup.project.id}`,
      { headers: sessionHeaders(signup.token) },
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SIEM connector credential redaction (HIGH-3)
// ---------------------------------------------------------------------------
test.describe('SIEM connector credential redaction', () => {
  let connectorId: string;

  test('creating a SIEM connector returns 201 with redacted credentials', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/siem`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        type: 'splunk',
        name: 'E2E Test Splunk',
        config: {
          hecToken: 'tok_abcdef1234567890',
          endpoint: 'https://splunk.example.com:8088',
        },
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();

    expect(typeof body.id).toBe('string');
    expect(body.type).toBe('splunk');
    expect(body.name).toBe('E2E Test Splunk');
    expect(body.is_active).toBe(true);

    connectorId = body.id;

    // Returned config should have hecToken redacted
    if (body.config?.hecToken) {
      expect(typeof body.config.hecToken).toBe('object');
      expect(body.config.hecToken.configured).toBe(true);
      expect(body.config.hecToken.lastFour).toMatch(/^\*{4}/);
    }
  });

  test('SIEM config credentials are never exposed in GET', async ({ request }) => {
    const res = await request.get(
      `${API_URL}/dashboard/siem?project_id=${signup.project.id}`,
      { headers: sessionHeaders(signup.token) },
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();

    const connector = body.data.find((c: { id: string }) => c.id === connectorId);
    expect(connector).toBeDefined();

    // Raw token must NOT appear
    const configStr = JSON.stringify(connector.config);
    expect(configStr).not.toContain('tok_abcdef1234567890');

    if (connector.config?.hecToken) {
      expect(connector.config.hecToken.configured).toBe(true);
    }
  });

  test('creating a connector without required fields returns 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/siem`, {
      headers: sessionHeaders(signup.token),
      data: { project_id: signup.project.id, type: 'splunk' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID');
  });
});

// ---------------------------------------------------------------------------
// Exports (MED-3: job reference, not inline content)
// ---------------------------------------------------------------------------
test.describe('Export endpoint returns job reference', () => {
  test('POST /dashboard/exports returns job ID and status', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/exports`, {
      headers: sessionHeaders(signup.token),
      data: { project_id: signup.project.id, format: 'json' },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();

    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThan(0);
    expect(typeof body.status).toBe('string');
    expect(['processing', 'completed', 'failed']).toContain(body.status);
    expect(body.project_id).toBe(signup.project.id);
    expect(body.format).toBe('json');
    expect(typeof body.created_at).toBe('string');
  });

  test('POST with CSV format returns job reference', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/exports`, {
      headers: sessionHeaders(signup.token),
      data: { project_id: signup.project.id, format: 'csv' },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(typeof body.id).toBe('string');
    expect(body.format).toBe('csv');
  });

  test('GET /dashboard/exports lists export jobs', async ({ request }) => {
    const res = await request.get(
      `${API_URL}/dashboard/exports?project_id=${signup.project.id}`,
      { headers: sessionHeaders(signup.token) },
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    for (const job of body.data) {
      expect(typeof job.id).toBe('string');
      expect(typeof job.status).toBe('string');
      expect(typeof job.format).toBe('string');
      expect(typeof job.created_at).toBe('string');
    }
  });

  test('POST with invalid format returns 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/exports`, {
      headers: sessionHeaders(signup.token),
      data: { project_id: signup.project.id, format: 'xml' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_FORMAT');
  });

  test('POST returns 401 without session', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/exports`, {
      data: { format: 'json' },
    });
    expect(res.status()).toBe(401);
  });
});
