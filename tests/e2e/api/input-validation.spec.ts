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
    data: { external_id: tenantId, name: 'Input Validation Test Tenant' },
  });
  expect(res.status()).toBe(201);
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
test.describe('Input validation: payload size', () => {
  test('oversized payload (2MB) is rejected with 413', async ({ request }) => {
    // Build a payload larger than the 1MB body limit
    const largeMetadata: Record<string, string> = {};
    const chunk = 'x'.repeat(1000);
    for (let i = 0; i < 2100; i++) {
      largeMetadata[`key_${i}`] = chunk;
    }

    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: buildEventPayload(tenantId, {
        action: 'validation.oversized',
        metadata: largeMetadata,
      }),
    });

    expect(res.status()).toBe(413);
    const body = await res.json();
    expect(body.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

test.describe('Input validation: action field', () => {
  test('action string longer than 256 chars is rejected with 400', async ({ request }) => {
    // Build an action that exceeds 256 chars but follows the format pattern
    // Pattern: lowercase noun.verb, so build a.b.c.d... chain
    const segments = [];
    for (let i = 0; i < 130; i++) {
      segments.push('ab');
    }
    const longAction = segments.join('.');
    expect(longAction.length).toBeGreaterThan(256);

    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: buildEventPayload(tenantId, { action: longAction }),
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('valid event with action of exactly 256 chars succeeds with 201', async ({ request }) => {
    // Build an action of exactly 256 chars following the pattern
    // Each segment "ab." is 3 chars. 85 segments = 255 chars + last "a" = 256
    const segments = [];
    for (let i = 0; i < 85; i++) {
      segments.push('ab');
    }
    // Join with dots: "ab.ab.ab..." = 85*2 + 84 = 254 chars
    // That gives us 254 chars, add ".aa" to get to 257... instead let's calculate precisely.
    // 85 segments of "ab" joined by "." = 85*2 + 84*1 = 170 + 84 = 254.
    // We need 256 total. Add ".ab" = 254 + 3 = 257, too much.
    // Try 84 segments: 84*2 + 83 = 251. Then add ".abcde" = 251 + 6 = 257, too much.
    // Use variable-length segments.
    // Let's just use a known good length.
    const parts = [];
    let len = 0;
    let i = 0;
    while (len < 256) {
      const seg = `a${i}`;
      if (len + seg.length + (parts.length > 0 ? 1 : 0) > 256) break;
      parts.push(seg);
      len += seg.length + (parts.length > 1 ? 1 : 0);
      i++;
    }
    // Pad the last segment to exactly 256
    const currentLen = parts.join('.').length;
    if (currentLen < 256) {
      const diff = 256 - currentLen;
      // Extend last segment
      parts[parts.length - 1] = parts[parts.length - 1] + 'a'.repeat(diff);
    }
    const action = parts.join('.');
    expect(action.length).toBe(256);

    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: buildEventPayload(tenantId, { action }),
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(typeof body.id).toBe('string');
    expect(typeof body.row_hash).toBe('string');
  });
});

test.describe('Input validation: tags', () => {
  test('more than 20 tags is rejected with 400', async ({ request }) => {
    const tags = Array.from({ length: 25 }, (_, i) => `tag_${i}`);

    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: buildEventPayload(tenantId, {
        action: 'validation.too_many_tags',
        tags,
      }),
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('exactly 20 tags is accepted', async ({ request }) => {
    const tags = Array.from({ length: 20 }, (_, i) => `tag_${i}`);

    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: buildEventPayload(tenantId, {
        action: 'validation.max_tags',
        tags,
      }),
    });

    expect(res.status()).toBe(201);
  });
});

test.describe('Input validation: other constraints', () => {
  test('missing action returns 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: {
        actor: { id: 'user_1' },
        tenant_id: tenantId,
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('missing actor returns 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: {
        action: 'validation.no_actor',
        tenant_id: tenantId,
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('invalid severity returns 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: buildEventPayload(tenantId, {
        action: 'validation.bad_severity',
        severity: 'SUPER_CRITICAL',
      }),
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('returns 401 without authentication', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events`, {
      data: buildEventPayload(tenantId),
    });

    expect(res.status()).toBe(401);
  });
});
