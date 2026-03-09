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
    data: { external_id: tenantId, name: 'Events Test Tenant' },
  });
  expect(res.status()).toBe(201);
});

// ---------------------------------------------------------------------------
// POST /v1/events
// ---------------------------------------------------------------------------
test.describe('POST /v1/events', () => {
  test('creates a valid event and returns 201', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: buildEventPayload(tenantId),
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(typeof body.id).toBe('string');
    expect(body.event_id).toBe(body.id);
    expect(body.action).toBe('document.created');
    expect(typeof body.row_hash).toBe('string');
    expect(typeof body.ingested_at).toBe('string');
  });

  test('row_hash is a real hash, never a placeholder', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: buildEventPayload(tenantId, { action: 'chain.hash_check' }),
    });

    expect(res.status()).toBe(201);
    const created = await res.json();

    expect(typeof created.row_hash).toBe('string');
    expect(created.row_hash).not.toBe('pending');
    expect(created.row_hash).not.toBe('computing');
    expect(created.row_hash.length).toBeGreaterThan(10);

    // Read back immediately and confirm the same hash
    const getRes = await request.get(`${API_URL}/v1/events/${created.id}`, {
      headers: apiHeaders(auth.apiKey),
    });
    expect(getRes.status()).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.row_hash).toBe(created.row_hash);
  });

  test('returns 400 when action is missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: { actor: { id: 'user_1' }, tenant_id: tenantId },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('returns 400 when actor is missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: { action: 'user.login', tenant_id: tenantId },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('returns 400 for invalid severity', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: buildEventPayload(tenantId, { severity: 'SUPER_BAD' }),
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('accepts event with metadata and target', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: buildEventPayload(tenantId, {
        metadata: { ip: '1.2.3.4', browser: 'Chrome' },
        target: { type: 'document', id: 'doc_42', name: 'Report Q4' },
      }),
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(typeof body.id).toBe('string');
  });

  test('deduplicates with idempotency key', async ({ request }) => {
    const idempotencyKey = `idem_${Date.now()}`;
    const payload = buildEventPayload(tenantId, { idempotency_key: idempotencyKey });

    const res1 = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: payload,
    });
    expect(res1.status()).toBe(201);
    const first = await res1.json();

    const res2 = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: payload,
    });
    expect(res2.status()).toBe(200);
    const second = await res2.json();

    expect(second.id).toBe(first.id);
    expect(second.deduplicated).toBe(true);
  });

  test('returns 400 when tenant_id is missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: { action: 'user.login', actor: { id: 'user_1' } },
    });

    expect(res.status()).toBe(400);
  });

  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events`, {
      data: buildEventPayload(tenantId),
    });

    expect(res.status()).toBe(401);
  });

  test('oversized payload (>1MB) is rejected with 413', async ({ request }) => {
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

// ---------------------------------------------------------------------------
// Hash chain integrity under concurrency (CRIT-1)
// ---------------------------------------------------------------------------
test.describe('Hash chain integrity under concurrency', () => {
  test('concurrent writes produce a linear chain with no forks', async ({ request }) => {
    const concurrentTenant = uniqueTenantId();
    await request.post(`${API_URL}/v1/tenants`, {
      headers: apiHeaders(auth.apiKey),
      data: { external_id: concurrentTenant, name: 'Concurrent Chain Tenant' },
    });

    const concurrency = 20;
    const promises = Array.from({ length: concurrency }, (_, i) =>
      request.post(`${API_URL}/v1/events`, {
        headers: apiHeaders(auth.apiKey),
        data: buildEventPayload(concurrentTenant, {
          action: 'chain.concurrent_write',
          metadata: { index: i },
        }),
      }),
    );

    const responses = await Promise.all(promises);

    for (const res of responses) {
      expect(res.status()).toBe(201);
    }

    const listRes = await request.get(
      `${API_URL}/v1/events?tenant_id=${concurrentTenant}&action=chain.concurrent_write&limit=100`,
      { headers: apiHeaders(auth.apiKey) },
    );
    expect(listRes.status()).toBe(200);
    const body = await listRes.json();
    const events = body.data;

    expect(events.length).toBe(concurrency);

    // Reverse to chronological order (API returns newest-first)
    const sorted = [...events].reverse();

    // Verify contiguous chain
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].prev_hash).toBe(sorted[i - 1].row_hash);
    }

    // No duplicate hashes (no forks)
    const hashes = sorted.map((e: { row_hash: string }) => e.row_hash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  test('no events have placeholder hashes', async ({ request }) => {
    for (let i = 0; i < 5; i++) {
      const res = await request.post(`${API_URL}/v1/events`, {
        headers: apiHeaders(auth.apiKey),
        data: buildEventPayload(tenantId, {
          action: 'chain.no_placeholder',
          metadata: { seq: i },
        }),
      });
      expect(res.status()).toBe(201);
    }

    const listRes = await request.get(
      `${API_URL}/v1/events?tenant_id=${tenantId}&action=chain.no_placeholder&limit=100`,
      { headers: apiHeaders(auth.apiKey) },
    );
    expect(listRes.status()).toBe(200);
    const body = await listRes.json();

    for (const event of body.data) {
      expect(event.row_hash).not.toBe('pending');
      expect(event.row_hash).not.toBe('computing');
      expect(typeof event.row_hash).toBe('string');
      expect(event.row_hash.length).toBeGreaterThan(10);
    }
  });
});

// ---------------------------------------------------------------------------
// GET /v1/events
// ---------------------------------------------------------------------------
test.describe('GET /v1/events', () => {
  const actionPrefix = `test_list_${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    for (let i = 0; i < 3; i++) {
      const res = await request.post(`${API_URL}/v1/events`, {
        headers: apiHeaders(auth.apiKey),
        data: buildEventPayload(tenantId, {
          action: `${actionPrefix}.event`,
          severity: i === 0 ? 'warn' : 'info',
        }),
      });
      expect(res.status()).toBe(201);
    }
  });

  test('lists events for the project', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.pagination).toBeDefined();
    expect(typeof body.pagination.has_more).toBe('boolean');
  });

  test('filters by tenant_id', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/events?tenant_id=${tenantId}`, {
      headers: apiHeaders(auth.apiKey),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    for (const evt of body.data) {
      expect(evt.tenant_id).toBeDefined();
    }
  });

  test('filters by action', async ({ request }) => {
    const res = await request.get(
      `${API_URL}/v1/events?action=${actionPrefix}.event`,
      { headers: apiHeaders(auth.apiKey) },
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(3);
    for (const evt of body.data) {
      expect(evt.action).toBe(`${actionPrefix}.event`);
    }
  });

  test('filters by severity', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/events?severity=warn`, {
      headers: apiHeaders(auth.apiKey),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const evt of body.data) {
      expect(evt.severity).toBe('warn');
    }
  });

  test('respects limit parameter', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/events?limit=2`, {
      headers: apiHeaders(auth.apiKey),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeLessThanOrEqual(2);
  });

  test('supports cursor pagination', async ({ request }) => {
    const page1 = await request.get(`${API_URL}/v1/events?limit=1`, {
      headers: apiHeaders(auth.apiKey),
    });
    expect(page1.status()).toBe(200);
    const body1 = await page1.json();

    if (body1.pagination.has_more && body1.pagination.cursor) {
      const page2 = await request.get(
        `${API_URL}/v1/events?limit=1&cursor=${body1.pagination.cursor}`,
        { headers: apiHeaders(auth.apiKey) },
      );
      expect(page2.status()).toBe(200);
      const body2 = await page2.json();
      expect(body2.data.length).toBeGreaterThanOrEqual(1);
      expect(body2.data[0].id).not.toBe(body1.data[0].id);
    }
  });
});

// ---------------------------------------------------------------------------
// GET /v1/events/:id
// ---------------------------------------------------------------------------
test.describe('GET /v1/events/:id', () => {
  let eventId: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events`, {
      headers: apiHeaders(auth.apiKey),
      data: buildEventPayload(tenantId, { action: 'single.lookup' }),
    });
    const body = await res.json();
    eventId = body.id;
  });

  test('returns a single event by ID', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/events/${eventId}`, {
      headers: apiHeaders(auth.apiKey),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(eventId);
    expect(body.event_id).toBe(eventId);
    expect(body.action).toBe('single.lookup');
    expect(body.actor).toBeDefined();
    expect(body.context).toBeDefined();
    expect(typeof body.row_hash).toBe('string');
    expect(typeof body.occurred_at).toBe('string');
    expect(typeof body.ingested_at).toBe('string');
  });

  test('returns 404 for a non-existent event ID', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/events/evt_does_not_exist`, {
      headers: apiHeaders(auth.apiKey),
    });

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// POST /v1/events/bulk
// ---------------------------------------------------------------------------
test.describe('POST /v1/events/bulk', () => {
  test('creates a batch and returns 201 with chained hashes', async ({ request }) => {
    const events = Array.from({ length: 5 }, (_, i) =>
      buildEventPayload(tenantId, {
        action: 'bulk.chained',
        metadata: { bulkIndex: i },
      }),
    );

    const res = await request.post(`${API_URL}/v1/events/bulk`, {
      headers: apiHeaders(auth.apiKey),
      data: { events },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.count).toBe(5);
    expect(body.events.length).toBe(5);

    // All hashes must be real, unique
    const hashes = body.events.map((e: { row_hash: string }) => e.row_hash);
    for (const h of hashes) {
      expect(typeof h).toBe('string');
      expect(h).not.toBe('pending');
      expect(h).not.toBe('computing');
      expect(h.length).toBeGreaterThan(10);
    }
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  test('returns 400 for missing events field', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/events/bulk`, {
      headers: apiHeaders(auth.apiKey),
      data: {},
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_BODY');
  });

  test('returns 400 when batch exceeds 100 events', async ({ request }) => {
    const events = Array.from({ length: 101 }, () =>
      buildEventPayload(tenantId, { action: 'bulk.oversized' }),
    );

    const res = await request.post(`${API_URL}/v1/events/bulk`, {
      headers: apiHeaders(auth.apiKey),
      data: { events },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('TOO_MANY_EVENTS');
  });

  test('bulk with one invalid event rejects the entire batch', async ({ request }) => {
    const events = [
      buildEventPayload(tenantId, { action: 'bulk.mixed_a' }),
      { tenant_id: tenantId, metadata: { bad: true } }, // missing action + actor
      buildEventPayload(tenantId, { action: 'bulk.mixed_c' }),
    ];

    const res = await request.post(`${API_URL}/v1/events/bulk`, {
      headers: apiHeaders(auth.apiKey),
      data: { events },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
    expect(body.event_index).toBe(1);
  });
});
