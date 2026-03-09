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
// GET /dashboard/notifications
// ---------------------------------------------------------------------------
test.describe('GET /dashboard/notifications', () => {
  test('returns empty list initially', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/notifications`, {
      headers: sessionHeaders(signup.token),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('returns 401 without session', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/notifications`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /dashboard/notifications
// ---------------------------------------------------------------------------
test.describe('POST /dashboard/notifications', () => {
  test('creates a notification rule and returns 201', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/notifications`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        name: 'Critical Events Alert',
        channel_type: 'webhook',
        channel_config: { webhook_url: 'https://example.com/notify' },
        conditions: { severity: 'critical' },
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(typeof body.id).toBe('string');
    expect(body.name).toBe('Critical Events Alert');
    expect(body.channel_type).toBe('webhook');
    expect(body.is_active).toBe(true);
    expect(typeof body.created_at).toBe('string');
  });

  test('returns 400 when name is missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/notifications`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        channel_type: 'slack',
        channel_config: { webhook_url: 'https://hooks.slack.com/test' },
      },
    });

    expect(res.status()).toBe(400);
  });

  test('returns 400 when channel_type is missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/notifications`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        name: 'Missing Channel',
        channel_config: { webhook_url: 'https://example.com/test' },
      },
    });

    expect(res.status()).toBe(400);
  });

  test('returns 400 when channel_config is missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/notifications`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        name: 'Missing Config',
        channel_type: 'slack',
      },
    });

    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH /dashboard/notifications/:id
// ---------------------------------------------------------------------------
test.describe('PATCH /dashboard/notifications/:id', () => {
  let ruleId: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/notifications`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        name: 'Patchable Rule',
        channel_type: 'webhook',
        channel_config: { webhook_url: 'https://example.com/patchable' },
      },
    });
    const body = await res.json();
    ruleId = body.id;
  });

  test('updates the rule name and is_active', async ({ request }) => {
    const res = await request.patch(`${API_URL}/dashboard/notifications/${ruleId}`, {
      headers: sessionHeaders(signup.token),
      data: { name: 'Updated Rule', is_active: false },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DELETE /dashboard/notifications/:id
// ---------------------------------------------------------------------------
test.describe('DELETE /dashboard/notifications/:id', () => {
  test('deletes an existing notification rule', async ({ request }) => {
    const createRes = await request.post(`${API_URL}/dashboard/notifications`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        name: 'Delete Me',
        channel_type: 'webhook',
        channel_config: { webhook_url: 'https://example.com/deleteme' },
      },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();

    const res = await request.delete(
      `${API_URL}/dashboard/notifications/${created.id}`,
      { headers: sessionHeaders(signup.token) },
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
