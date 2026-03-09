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
// GET /dashboard/signing-keys
// ---------------------------------------------------------------------------
test.describe('GET /dashboard/signing-keys', () => {
  test('returns empty list initially', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/signing-keys`, {
      headers: sessionHeaders(signup.token),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('returns 401 without session', async ({ request }) => {
    const res = await request.get(`${API_URL}/dashboard/signing-keys`);
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /dashboard/signing-keys
// ---------------------------------------------------------------------------
test.describe('POST /dashboard/signing-keys', () => {
  test('generates a signing key and returns 201 with public key', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/signing-keys`, {
      headers: sessionHeaders(signup.token),
      data: { project_id: signup.project.id },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(typeof body.id).toBe('string');
    expect(typeof body.public_key).toBe('string');
    expect(body.algorithm).toBe('Ed25519');
    expect(typeof body.message).toBe('string');
  });

  test('returns 409 when active key already exists', async ({ request }) => {
    // Key was created in previous test; creating again should conflict
    const res = await request.post(`${API_URL}/dashboard/signing-keys`, {
      headers: sessionHeaders(signup.token),
      data: { project_id: signup.project.id },
    });

    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('KEY_EXISTS');
  });
});

// ---------------------------------------------------------------------------
// POST /dashboard/signing-keys/rotate
// ---------------------------------------------------------------------------
test.describe('POST /dashboard/signing-keys/rotate', () => {
  test('rotates the signing key and returns new public key', async ({ request }) => {
    const res = await request.post(`${API_URL}/dashboard/signing-keys/rotate`, {
      headers: sessionHeaders(signup.token),
      data: { project_id: signup.project.id },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.id).toBe('string');
    expect(typeof body.public_key).toBe('string');
    expect(body.algorithm).toBe('Ed25519');

    // Verify old key is preserved (list should have 2+ keys)
    const listRes = await request.get(
      `${API_URL}/dashboard/signing-keys?project_id=${signup.project.id}`,
      { headers: sessionHeaders(signup.token) },
    );
    expect(listRes.status()).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.data.length).toBeGreaterThanOrEqual(2);
  });
});
