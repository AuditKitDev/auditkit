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
// GET /dashboard/redaction-rules
// ---------------------------------------------------------------------------
test.describe('GET /dashboard/redaction-rules', () => {
  test('returns empty list and built-in patterns', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/redaction-rules`, {
      headers: sessionHeaders(signup.token),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.built_in_patterns).toBeDefined();
    expect(typeof body.built_in_patterns.email).toBe('string');
    expect(typeof body.built_in_patterns.ssn).toBe('string');
  });

  test('returns 401 without session', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/redaction-rules`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /dashboard/redaction-rules
// ---------------------------------------------------------------------------
test.describe('POST /dashboard/redaction-rules', () => {
  test('creates a redaction rule and returns 201', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/redaction-rules`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        field_path: 'actor.email',
        pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
        replacement: '[EMAIL_REDACTED]',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(typeof body.id).toBe('string');
    expect(body.field_path).toBe('actor.email');
    expect(body.replacement).toBe('[EMAIL_REDACTED]');
    expect(body.enabled).toBe(true);
    expect(typeof body.created_at).toBe('string');
  });

  test('returns 400 when field_path is missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/redaction-rules`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        pattern: '\\d{3}-\\d{2}-\\d{4}',
      },
    });

    expect(res.status()).toBe(400);
  });

  test('returns 400 when pattern is missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/redaction-rules`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        field_path: 'metadata.ssn',
      },
    });

    expect(res.status()).toBe(400);
  });

  test('returns 400 for invalid regex pattern', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/redaction-rules`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        field_path: 'metadata.bad',
        pattern: '(unclosed group',
      },
    });

    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /dashboard/redaction-rules/:id
// ---------------------------------------------------------------------------
test.describe('DELETE /dashboard/redaction-rules/:id', () => {
  test('deletes an existing redaction rule', async ({ request }) => {
    // Create one to delete
    const createRes = await request.post(`${API_URL}/dashboard/redaction-rules`, {
      headers: sessionHeaders(signup.token),
      data: {
        project_id: signup.project.id,
        field_path: 'metadata.phone',
        pattern: '\\d{3}-\\d{3}-\\d{4}',
      },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();

    const res = await request.delete(
      `${API_URL}/dashboard/redaction-rules/${created.id}`,
      { headers: sessionHeaders(signup.token) },
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
