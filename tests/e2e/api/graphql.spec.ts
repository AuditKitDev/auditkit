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
let seededEventId: string;

test.beforeAll(async ({ request }) => {
  await assertServerReachable(request);
});

test.beforeAll(async ({ request }) => {
  auth = await createAuthenticatedContext(request);
  tenantId = uniqueTenantId();

  // Create tenant
  await request.post(`${API_URL}/v1/tenants`, {
    headers: apiHeaders(auth.apiKey),
    data: { external_id: tenantId, name: 'GraphQL Tenant' },
  });

  // Seed an event
  const evtRes = await request.post(`${API_URL}/v1/events`, {
    headers: apiHeaders(auth.apiKey),
    data: buildEventPayload(tenantId, { action: 'graphql.seeded' }),
  });
  const evtBody = await evtRes.json();
  seededEventId = evtBody.id;
});

// ---------------------------------------------------------------------------
// POST /v1/graphql — Query events
// ---------------------------------------------------------------------------
test.describe('POST /v1/graphql', () => {
  test('queries events via GraphQL', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/graphql`, {
      headers: apiHeaders(auth.apiKey),
      data: {
        query: `{
          events(first: 5) {
            edges {
              node {
                id
                action
                severity
                actorId
                createdAt
              }
              cursor
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
            totalCount
          }
        }`,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.errors).toBeUndefined();
    expect(body.data).toBeDefined();
    expect(body.data.events).toBeDefined();
    expect(Array.isArray(body.data.events.edges)).toBeTruthy();
    expect(typeof body.data.events.totalCount).toBe('number');
    expect(typeof body.data.events.pageInfo.hasNextPage).toBe('boolean');

    if (body.data.events.edges.length > 0) {
      const node = body.data.events.edges[0].node;
      expect(typeof node.id).toBe('string');
      expect(typeof node.action).toBe('string');
      expect(typeof node.severity).toBe('string');
    }
  });

  test('queries a single event by ID', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/graphql`, {
      headers: apiHeaders(auth.apiKey),
      data: {
        query: `{
          event(id: "${seededEventId}") {
            id
            action
            actorId
            severity
            hash
            createdAt
          }
        }`,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.event).toBeDefined();
    expect(body.data.event.id).toBe(seededEventId);
    expect(body.data.event.action).toBe('graphql.seeded');
    expect(typeof body.data.event.hash).toBe('string');
  });

  test('returns null for a non-existent event ID', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/graphql`, {
      headers: apiHeaders(auth.apiKey),
      data: {
        query: `{
          event(id: "evt_does_not_exist_12345") {
            id
            action
          }
        }`,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.event).toBeNull();
  });

  test('verifies chain integrity via GraphQL', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/graphql`, {
      headers: apiHeaders(auth.apiKey),
      data: {
        query: `{
          verify(eventId: "${seededEventId}") {
            valid
            hash
            prevHash
            chainIntact
          }
        }`,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.verify).toBeDefined();
    expect(typeof body.data.verify.valid).toBe('boolean');
    expect(typeof body.data.verify.chainIntact).toBe('boolean');
    expect(typeof body.data.verify.hash).toBe('string');
  });

  test('rejects deeply nested queries (depth > 10)', async ({ request }) => {
    // Construct a truly deep query by nesting field selections
    // The depth checker counts brace nesting: each { increments depth
    const depth12 = '{'.repeat(12) + ' id ' + '}'.repeat(12);

    const res = await request.post(`${API_URL}/v1/graphql`, {
      headers: apiHeaders(auth.apiKey),
      data: { query: depth12 },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toContain('depth');
  });

  test('returns 400 when query is missing', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/graphql`, {
      headers: apiHeaders(auth.apiKey),
      data: {},
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toContain('required');
  });

  test('queries merkle roots via GraphQL', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/graphql`, {
      headers: apiHeaders(auth.apiKey),
      data: {
        query: `{
          merkleRoots(first: 5) {
            id
            rootHash
            eventCount
            createdAt
          }
        }`,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.errors).toBeUndefined();
    expect(Array.isArray(body.data.merkleRoots)).toBeTruthy();
  });

  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/graphql`, {
      data: { query: '{ events(first:1) { totalCount } }' },
    });

    expect(res.status()).toBe(401);
  });
});
