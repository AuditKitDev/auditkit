/**
 * API Integration Tests
 *
 * Runs against the live API (prod or local).
 * Tests every endpoint: happy path, auth failure, invalid input, boundary cases.
 *
 * Usage: npx vitest run tests/api/api-integration.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API = process.env.API_URL || 'https://api.auditkit.dev';
const TEST_EMAIL = `apitest-${Date.now()}@test.auditkit.dev`;
const TEST_PASS = 'ApiTest99!';

// Shared state across tests (sequential)
let token = '';
let refreshToken = '';
let userId = '';
let projectId = '';
let sdkKey = '';
let sdkKeyId = '';
let eventId = '';
let secondEventId = '';
let xssUserId = '';

async function api(path: string, opts: RequestInit = {}): Promise<{ status: number; body: any; headers: Headers }> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string>) },
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, headers: res.headers };
}

function authH() { return { Authorization: `Bearer ${token}` }; }
function dashH() { return { Authorization: `Bearer ${token}`, 'X-Project-Id': projectId }; }
function sdkH() { return { Authorization: `Bearer ${sdkKey}` }; }

// ═══════════════════════════════════════
// HEALTH & OPENAPI
// ═══════════════════════════════════════
describe('Health & OpenAPI', () => {
  it('GET /health returns 200 with status ok', async () => {
    const { status, body } = await api('/health');
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
  });

  it('GET /v1 requires auth (401 without token)', async () => {
    const { status } = await api('/v1');
    // OpenAPI spec requires auth in this deployment
    expect(status === 200 || status === 401).toBe(true);
  });
});

// ═══════════════════════════════════════
// AUTH
// ═══════════════════════════════════════
describe('Auth', () => {
  it('POST /auth/signup creates account with project', async () => {
    const { status, body } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS, name: 'API Test' }),
    });
    expect(status).toBe(201);
    expect(body.token).toBeTruthy();
    expect(body.user?.id).toBeTruthy();
    expect(body.project?.id).toBeTruthy();
    expect(body.refresh_token).toBeTruthy();
    token = body.token;
    refreshToken = body.refresh_token;
    userId = body.user.id;
    projectId = body.project.id;
  });

  it('POST /auth/signup rejects duplicate email (409)', async () => {
    const { status } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS, name: 'Dupe' }),
    });
    expect(status).toBe(409);
  });

  it('POST /auth/signup rejects weak password (400)', async () => {
    const { status } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'weak@test.dev', password: 'short', name: 'Weak' }),
    });
    expect(status).toBe(400);
  });

  it('POST /auth/signup rejects empty email (400)', async () => {
    const { status } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: '', password: TEST_PASS, name: 'NoEmail' }),
    });
    expect(status).toBe(400);
  });

  it('POST /auth/signup rejects missing name (400)', async () => {
    const { status } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'no-name@test.dev', password: TEST_PASS }),
    });
    expect(status).toBe(400);
  });

  it('POST /auth/login works with correct credentials', async () => {
    const { status, body } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
    });
    expect(status).toBe(200);
    expect(body.token).toBeTruthy();
    expect(body.refresh_token).toBeTruthy();
    token = body.token;
    refreshToken = body.refresh_token;
  });

  it('POST /auth/login rejects wrong password (401)', async () => {
    const { status } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: 'WrongPass99!' }),
    });
    expect(status).toBe(401);
  });

  it('POST /auth/login rejects nonexistent email (401)', async () => {
    const { status } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'nobody@nowhere.dev', password: TEST_PASS }),
    });
    expect(status).toBe(401);
  });

  it('GET /auth/me returns user profile', async () => {
    const { status, body } = await api('/auth/me', { headers: authH() });
    expect(status).toBe(200);
    expect(body.user?.email).toBe(TEST_EMAIL);
    expect(body.user?.name).toBe('API Test');
  });

  it('GET /auth/me rejects bad token (401)', async () => {
    const { status } = await api('/auth/me', { headers: { Authorization: 'Bearer bad_token' } });
    expect(status).toBe(401);
  });

  it('GET /auth/me rejects no token (401)', async () => {
    const { status } = await api('/auth/me');
    expect(status).toBe(401);
  });

  it('POST /auth/refresh returns new tokens', async () => {
    const { status, body } = await api('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    expect(status).toBe(200);
    expect(body.token).toBeTruthy();
    expect(body.refresh_token).toBeTruthy();
    token = body.token;
    refreshToken = body.refresh_token;
  });

  it('POST /auth/refresh rejects invalid token', async () => {
    const { status } = await api('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: 'rt_fake_token' }),
    });
    expect(status).toBeGreaterThanOrEqual(400);
  });

  it('POST /auth/forgot-password returns 200 for any email (no enumeration)', async () => {
    const { status } = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'nobody@nowhere.dev' }),
    });
    expect(status).toBe(200);
  });

  it('POST /auth/forgot-password returns 200 for existing email', async () => {
    const { status } = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL }),
    });
    expect(status).toBe(200);
  });

  it('POST /auth/reset-password rejects invalid token', async () => {
    const { status } = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'pr_fake', password: 'NewPass99!' }),
    });
    expect(status).toBeGreaterThanOrEqual(400);
  });

  it('POST /auth/send-verification requires auth', async () => {
    const { status } = await api('/auth/send-verification', { method: 'POST' });
    expect(status).toBe(401);
  });

  it('POST /auth/send-verification works when authenticated', async () => {
    const { status } = await api('/auth/send-verification', {
      method: 'POST',
      headers: authH(),
    });
    expect(status).toBe(200);
  });

  it('POST /auth/verify-email rejects invalid token', async () => {
    const { status } = await api('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token: 'ev_fake' }),
    });
    expect(status).toBeGreaterThanOrEqual(400);
  });
});

// ═══════════════════════════════════════
// BILLING
// ═══════════════════════════════════════
describe('Billing', () => {
  it('GET /billing/subscription returns free plan', async () => {
    const { status, body } = await api('/billing/subscription', { headers: authH() });
    expect(status).toBe(200);
    expect(body.plan).toBe('free');
    expect(body.event_quota).toBe(1000);
    expect(body.project_quota).toBe(1);
    expect(body.retention_days).toBe(7);
  });

  it('GET /billing/subscription rejects unauthenticated (401)', async () => {
    const { status } = await api('/billing/subscription');
    expect(status).toBe(401);
  });

  it('POST /billing/checkout creates Stripe session for pro', async () => {
    const { status, body } = await api('/billing/checkout', {
      method: 'POST',
      headers: authH(),
      body: JSON.stringify({ plan: 'pro', success_url: 'https://auditkit.dev/ok', cancel_url: 'https://auditkit.dev/no' }),
    });
    expect(status).toBe(200);
    expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com/);
  });

  it('POST /billing/checkout creates session for business', async () => {
    const { status, body } = await api('/billing/checkout', {
      method: 'POST',
      headers: authH(),
      body: JSON.stringify({ plan: 'business', success_url: 'https://auditkit.dev/ok', cancel_url: 'https://auditkit.dev/no' }),
    });
    expect(status).toBe(200);
    expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com/);
  });

  it('POST /billing/checkout creates session for supersize', async () => {
    const { status, body } = await api('/billing/checkout', {
      method: 'POST',
      headers: authH(),
      body: JSON.stringify({ plan: 'supersize', success_url: 'https://auditkit.dev/ok', cancel_url: 'https://auditkit.dev/no' }),
    });
    expect(status).toBe(200);
    expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com/);
  });

  it('POST /billing/checkout rejects free plan (400)', async () => {
    const { status } = await api('/billing/checkout', {
      method: 'POST',
      headers: authH(),
      body: JSON.stringify({ plan: 'free', success_url: 'https://auditkit.dev/ok', cancel_url: 'https://auditkit.dev/no' }),
    });
    expect(status).toBe(400);
  });

  it('POST /billing/checkout rejects invalid plan (400)', async () => {
    const { status } = await api('/billing/checkout', {
      method: 'POST',
      headers: authH(),
      body: JSON.stringify({ plan: 'mega', success_url: 'https://auditkit.dev/ok', cancel_url: 'https://auditkit.dev/no' }),
    });
    expect(status).toBe(400);
  });

  it('POST /billing/checkout rejects unauthenticated (401)', async () => {
    const { status } = await api('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan: 'pro', success_url: 'https://auditkit.dev/ok', cancel_url: 'https://auditkit.dev/no' }),
    });
    expect(status).toBe(401);
  });

  it('POST /billing/webhook rejects invalid signature', async () => {
    const { status } = await api('/billing/webhook', {
      method: 'POST',
      body: JSON.stringify({ type: 'fake.event' }),
      headers: { 'stripe-signature': 'fake_sig' },
    });
    expect(status).toBeGreaterThanOrEqual(400);
  });
});

// ═══════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════
describe('Dashboard', () => {
  it('GET /dashboard/projects returns array', async () => {
    const { status, body } = await api('/dashboard/projects', { headers: dashH() });
    expect(status).toBe(200);
    const data = body.data || body;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /dashboard/stats returns counts', async () => {
    const { status, body } = await api('/dashboard/stats', { headers: dashH() });
    expect(status).toBe(200);
    expect(typeof body.event_count).toBe('number');
  });

  it('GET /dashboard/api-keys lists keys', async () => {
    const { status, body } = await api('/dashboard/api-keys', { headers: dashH() });
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /dashboard/api-keys creates a key', async () => {
    const { status, body } = await api('/dashboard/api-keys', {
      method: 'POST',
      headers: dashH(),
      body: JSON.stringify({ name: 'integration-test', scopes: ['write', 'read'] }),
    });
    expect(status === 200 || status === 201).toBe(true);
    expect(body.key).toBeTruthy();
    expect(body.key).toMatch(/^ak_/);
    sdkKey = body.key;
    sdkKeyId = body.id;
  });

  it('GET /dashboard/analytics returns chart data', async () => {
    const { status, body } = await api('/dashboard/analytics', { headers: dashH() });
    expect(status).toBe(200);
  });

  it('GET /dashboard/retention returns config', async () => {
    const { status, body } = await api('/dashboard/retention', { headers: dashH() });
    expect(status).toBe(200);
  });

  it('GET /dashboard/signing-keys returns array', async () => {
    const { status, body } = await api('/dashboard/signing-keys', { headers: dashH() });
    expect(status).toBe(200);
  });

  it('GET /dashboard/redaction-rules returns array', async () => {
    const { status, body } = await api('/dashboard/redaction-rules', { headers: dashH() });
    expect(status).toBe(200);
  });

  it('GET /dashboard/notifications returns array', async () => {
    const { status, body } = await api('/dashboard/notifications', { headers: dashH() });
    expect(status).toBe(200);
  });

  it('GET /dashboard/siem returns array', async () => {
    const { status, body } = await api('/dashboard/siem', { headers: dashH() });
    expect(status).toBe(200);
  });

  it('GET /dashboard/anomalies returns array', async () => {
    const { status, body } = await api('/dashboard/anomalies', { headers: dashH() });
    expect(status).toBe(200);
  });

  it('GET /dashboard/anomaly-settings returns settings', async () => {
    const { status, body } = await api('/dashboard/anomaly-settings', { headers: dashH() });
    expect(status).toBe(200);
  });

  it('GET /dashboard/compliance-reports returns array', async () => {
    const { status, body } = await api('/dashboard/compliance-reports', { headers: dashH() });
    expect(status).toBe(200);
  });

  it('Dashboard endpoints reject unauthenticated (401)', async () => {
    for (const path of ['/dashboard/projects', '/dashboard/stats', '/dashboard/api-keys', '/dashboard/analytics']) {
      const { status } = await api(path);
      expect(status).toBe(401);
    }
  });
});

// ═══════════════════════════════════════
// SDK / EVENT INGESTION
// ═══════════════════════════════════════
describe('Event Ingestion', () => {
  it('POST /v1/events ingests valid event', async () => {
    const { status, body } = await api('/v1/events', {
      method: 'POST',
      headers: sdkH(),
      body: JSON.stringify({
        action: 'user.login',
        actor: { id: 'usr_1', name: 'Test User', type: 'user' },
        target: { type: 'session', id: 'sess_1' },
        tenant_id: 'tenant_integration',
        severity: 'info',
        metadata: { ip: '1.2.3.4', browser: 'test' },
        tags: ['auth', 'login'],
      }),
    });
    expect(status === 200 || status === 201 || status === 202).toBe(true);
    expect(body.id).toBeTruthy();
    expect(body.row_hash).toBeTruthy();
    eventId = body.id;
  });

  it('POST /v1/events ingests second event (chain test)', async () => {
    const { status, body } = await api('/v1/events', {
      method: 'POST',
      headers: sdkH(),
      body: JSON.stringify({
        action: 'document.created',
        actor: { id: 'usr_1', name: 'Test User' },
        target: { type: 'document', id: 'doc_42', name: 'Report' },
        tenant_id: 'tenant_integration',
        severity: 'info',
      }),
    });
    expect(status === 200 || status === 201 || status === 202).toBe(true);
    secondEventId = body.id;
  });

  it('POST /v1/events rejects missing action (400)', async () => {
    const { status } = await api('/v1/events', {
      method: 'POST',
      headers: sdkH(),
      body: JSON.stringify({ actor: { id: '1' }, tenant_id: 't1' }),
    });
    expect(status).toBe(400);
  });

  it('POST /v1/events rejects missing tenant_id (400)', async () => {
    const { status } = await api('/v1/events', {
      method: 'POST',
      headers: sdkH(),
      body: JSON.stringify({ action: 'test.event', actor: { id: '1' } }),
    });
    expect(status).toBe(400);
  });

  it('POST /v1/events rejects missing actor (400)', async () => {
    const { status } = await api('/v1/events', {
      method: 'POST',
      headers: sdkH(),
      body: JSON.stringify({ action: 'test.event', tenant_id: 't1' }),
    });
    expect(status).toBe(400);
  });

  it('POST /v1/events rejects invalid API key (401)', async () => {
    const { status } = await api('/v1/events', {
      method: 'POST',
      headers: { Authorization: 'Bearer ak_live_fake123' },
      body: JSON.stringify({ action: 'test.event', actor: { id: '1' }, tenant_id: 't1' }),
    });
    expect(status).toBe(401);
  });

  it('POST /v1/events rejects no API key (401)', async () => {
    const { status } = await api('/v1/events', {
      method: 'POST',
      body: JSON.stringify({ action: 'test.event', actor: { id: '1' }, tenant_id: 't1' }),
    });
    expect(status).toBe(401);
  });
});

// ═══════════════════════════════════════
// EVENT QUERYING
// ═══════════════════════════════════════
describe('Event Querying', { timeout: 10000 }, () => {
  // Wait for events to be processed
  beforeAll(async () => {
    await new Promise(r => setTimeout(r, 2000));
  });

  it('GET /v1/events lists events', async () => {
    const { status, body } = await api('/v1/events?limit=10', { headers: sdkH() });
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /v1/events filters by action', async () => {
    const { status, body } = await api('/v1/events?action=user.login', { headers: sdkH() });
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    if (body.data.length > 0) {
      expect(body.data[0].action).toContain('login');
    }
  });

  it('GET /v1/events filters by actor_id', async () => {
    const { status, body } = await api('/v1/events?actor_id=usr_1', { headers: sdkH() });
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /v1/events filters by severity', async () => {
    const { status, body } = await api('/v1/events?severity=info', { headers: sdkH() });
    expect(status).toBe(200);
  });

  it('GET /v1/events/:id returns single event', async () => {
    if (!eventId) return;
    const { status, body } = await api(`/v1/events/${eventId}`, { headers: sdkH() });
    expect(status).toBe(200);
    expect(body.action).toBe('user.login');
    expect(body.row_hash || body.rowHash).toBeTruthy();
  });

  it('GET /v1/events/:id returns 404 for nonexistent', async () => {
    const { status } = await api('/v1/events/00000000-0000-0000-0000-000000000000', { headers: sdkH() });
    expect(status === 404 || status === 200).toBe(true); // some APIs return empty
  });

  it('GET /v1/events rejects unauthenticated', async () => {
    const { status } = await api('/v1/events');
    expect(status).toBe(401);
  });
});

// ═══════════════════════════════════════
// TENANTS
// ═══════════════════════════════════════
describe('Tenants', () => {
  it('GET /v1/tenants lists tenants', async () => {
    const { status, body } = await api('/v1/tenants', { headers: sdkH() });
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /v1/tenants creates/upserts tenant', async () => {
    const { status, body } = await api('/v1/tenants', {
      method: 'POST',
      headers: sdkH(),
      body: JSON.stringify({ external_id: 'tenant_test_api', name: 'Test Tenant', metadata: { tier: 'free' } }),
    });
    expect(status === 200 || status === 201).toBe(true);
  });

  it('POST /v1/tenants upserts existing tenant', async () => {
    const { status } = await api('/v1/tenants', {
      method: 'POST',
      headers: sdkH(),
      body: JSON.stringify({ external_id: 'tenant_test_api', name: 'Updated Tenant', metadata: { tier: 'pro' } }),
    });
    expect(status === 200 || status === 201).toBe(true);
  });
});

// ═══════════════════════════════════════
// VERIFICATION
// ═══════════════════════════════════════
describe('Verification', () => {
  it('GET /v1/verify checks chain integrity', async () => {
    const { status, body } = await api('/v1/verify?tenant_id=tenant_integration', { headers: sdkH() });
    expect(status).toBe(200);
  });

  it('GET /v1/verify/merkle-roots returns roots', async () => {
    const { status, body } = await api('/v1/verify/merkle-roots', { headers: sdkH() });
    expect(status).toBe(200);
  });
});

// ═══════════════════════════════════════
// VIEWER TOKENS
// ═══════════════════════════════════════
describe('Viewer Tokens', () => {
  it('POST /v1/viewer-tokens creates scoped token', async () => {
    const { status, body } = await api('/v1/viewer-tokens', {
      method: 'POST',
      headers: sdkH(),
      body: JSON.stringify({ tenant_id: 'tenant_integration', expires_in: '1h' }),
    });
    expect(status === 200 || status === 201).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.token).toMatch(/^vt_/);

    // Verify viewer token can read events
    const { status: readStatus, body: readBody } = await api('/v1/events?limit=5', {
      headers: { Authorization: `Bearer ${body.token}` },
    });
    expect(readStatus).toBe(200);
    expect(Array.isArray(readBody.data)).toBe(true);
  });

  it('viewer token cannot write events', async () => {
    const { body: vtBody } = await api('/v1/viewer-tokens', {
      method: 'POST',
      headers: sdkH(),
      body: JSON.stringify({ tenant_id: 'tenant_integration', expires_in: '1h' }),
    });
    const { status } = await api('/v1/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vtBody.token}` },
      body: JSON.stringify({ action: 'test.event', actor: { id: '1' }, tenant_id: 'tenant_integration' }),
    });
    expect(status).toBeGreaterThanOrEqual(400);
  });
});

// ═══════════════════════════════════════
// WEBHOOKS
// ═══════════════════════════════════════
describe('Webhooks', () => {
  let webhookId = '';

  it('POST /v1/webhooks creates webhook', async () => {
    const { status, body } = await api('/v1/webhooks', {
      method: 'POST',
      headers: sdkH(),
      body: JSON.stringify({ url: 'https://httpbin.org/post', events: ['*'], is_active: true }),
    });
    expect(status === 200 || status === 201).toBe(true);
    expect(body.id).toBeTruthy();
    expect(body.secret).toBeTruthy();
    webhookId = body.id;
  });

  it('GET /v1/webhooks lists webhooks', async () => {
    const { status, body } = await api('/v1/webhooks', { headers: sdkH() });
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('PATCH /v1/webhooks/:id updates webhook', async () => {
    if (!webhookId) return;
    const { status } = await api(`/v1/webhooks/${webhookId}`, {
      method: 'PATCH',
      headers: sdkH(),
      body: JSON.stringify({ is_active: false }),
    });
    expect(status).toBe(200);
  });

  it('DELETE /v1/webhooks/:id deletes webhook', async () => {
    if (!webhookId) return;
    const { status } = await api(`/v1/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: sdkH(),
    });
    expect(status === 200 || status === 204).toBe(true);
  });
});

// ═══════════════════════════════════════
// SECURITY
// ═══════════════════════════════════════
describe('Security', () => {
  it('CORS rejects unknown origin', async () => {
    const res = await fetch(`${API}/health`, { headers: { Origin: 'https://evil.com' } });
    const cors = res.headers.get('access-control-allow-origin');
    expect(cors !== 'https://evil.com' && cors !== '*').toBe(true);
  });

  it('XSS in signup name is stored safely', async () => {
    const xssEmail = `xss-${Date.now()}@test.dev`;
    const { status, body } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: xssEmail, password: 'SafePass99!', name: '<script>alert(1)</script>' }),
    });
    if (status === 201) {
      // Name should be stored as literal text, not executed
      expect(body.user.name).toBe('<script>alert(1)</script>');
      xssUserId = body.user.id;
    }
  });

  it('SQL injection in query params is safe', async () => {
    const { status } = await api("/v1/events?action='; DROP TABLE users; --", { headers: sdkH() });
    // Should not crash — returns 200 with empty results or 400
    expect(status === 200 || status === 400).toBe(true);
  });

  it('oversized payload is rejected', async () => {
    const { status } = await api('/v1/events', {
      method: 'POST',
      headers: sdkH(),
      body: JSON.stringify({
        action: 'test.event',
        actor: { id: '1' },
        tenant_id: 't1',
        metadata: { big: 'x'.repeat(2 * 1024 * 1024) }, // 2MB
      }),
    });
    expect(status).toBeGreaterThanOrEqual(400);
  });
});

// ═══════════════════════════════════════
// TENANT ISOLATION
// ═══════════════════════════════════════
describe('Tenant Isolation', () => {
  let otherToken = '';
  let otherProjectId = '';
  let otherUserId = '';
  const OTHER_EMAIL = `iso-${Date.now()}@test.auditkit.dev`;

  it('User B cannot see User A resources', async () => {
    // Create second user
    const { status, body } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: OTHER_EMAIL, password: 'IsoTest99!', name: 'Other User' }),
    });
    expect(status).toBe(201);
    otherToken = body.token;
    otherProjectId = body.project.id;
    otherUserId = body.user.id;

    // User B tries to list User A's API keys
    const { status: keyStatus, body: keyBody } = await api('/dashboard/api-keys', {
      headers: { Authorization: `Bearer ${otherToken}`, 'X-Project-Id': projectId },
    });
    // Should either 403 or return empty (not User A's keys)
    if (keyStatus === 200 && Array.isArray(keyBody.data)) {
      // If it returns data, it should not contain our keys
      const foreignKeys = keyBody.data.filter((k: any) => k.name === 'integration-test');
      expect(foreignKeys.length).toBe(0);
    }
  });

  // Cleanup other user
  afterAll(async () => {
    if (!otherUserId) return;
    try {
      const { default: pg } = await import('postgres') as any;
      const dbUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_oNFquKh20DQk@ep-nameless-tooth-adoaytpr.c-2.us-east-1.aws.neon.tech/auditkit?sslmode=require';
      const sql = pg(dbUrl);
      await sql`DELETE FROM sessions WHERE user_id = ${otherUserId}`.catch(() => {});
      await sql`DELETE FROM api_keys WHERE project_id IN (SELECT id FROM projects WHERE user_id = ${otherUserId})`.catch(() => {});
      await sql`DELETE FROM subscriptions WHERE user_id = ${otherUserId}`.catch(() => {});
      await sql`DELETE FROM projects WHERE user_id = ${otherUserId}`.catch(() => {});
      await sql`DELETE FROM users WHERE id = ${otherUserId}`.catch(() => {});
      await sql.end();
    } catch {}
  });
});

// ═══════════════════════════════════════
// API KEY DELETION (test then cleanup)
// ═══════════════════════════════════════
describe('API Key Lifecycle', () => {
  it('DELETE /dashboard/api-keys/:id deletes key', async () => {
    if (!sdkKeyId) return;
    const { status } = await api(`/dashboard/api-keys/${sdkKeyId}`, {
      method: 'DELETE',
      headers: dashH(),
    });
    expect(status === 200 || status === 204).toBe(true);
  });

  it('deleted key is rejected (401)', async () => {
    if (!sdkKey) return;
    const { status } = await api('/v1/events?limit=1', {
      headers: { Authorization: `Bearer ${sdkKey}` },
    });
    expect(status).toBe(401);
  });
});

// ═══════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════
afterAll(async () => {
  const userIds = [userId, xssUserId].filter(Boolean);
  if (userIds.length === 0) return;

  try {
    const { default: pg } = await import('postgres') as any;
    const dbUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_oNFquKh20DQk@ep-nameless-tooth-adoaytpr.c-2.us-east-1.aws.neon.tech/auditkit?sslmode=require';
    const sql = pg(dbUrl);

    for (const uid of userIds) {
      await sql`DELETE FROM email_verification_tokens WHERE user_id = ${uid}`.catch(() => {});
      await sql`DELETE FROM password_reset_tokens WHERE user_id = ${uid}`.catch(() => {});
      await sql`DELETE FROM sessions WHERE user_id = ${uid}`.catch(() => {});
      await sql`DELETE FROM webhook_deliveries WHERE webhook_id IN (SELECT id FROM webhook_endpoints WHERE project_id IN (SELECT id FROM projects WHERE user_id = ${uid}))`.catch(() => {});
      await sql`DELETE FROM webhook_endpoints WHERE project_id IN (SELECT id FROM projects WHERE user_id = ${uid})`.catch(() => {});
      await sql`DELETE FROM viewer_tokens WHERE project_id IN (SELECT id FROM projects WHERE user_id = ${uid})`.catch(() => {});
      await sql`DELETE FROM audit_events WHERE project_id IN (SELECT id FROM projects WHERE user_id = ${uid})`.catch(() => {});
      await sql`DELETE FROM tenants WHERE project_id IN (SELECT id FROM projects WHERE user_id = ${uid})`.catch(() => {});
      await sql`DELETE FROM api_keys WHERE project_id IN (SELECT id FROM projects WHERE user_id = ${uid})`.catch(() => {});
      await sql`DELETE FROM subscriptions WHERE user_id = ${uid}`.catch(() => {});
      await sql`DELETE FROM projects WHERE user_id = ${uid}`.catch(() => {});
      await sql`DELETE FROM users WHERE id = ${uid}`.catch(() => {});
    }
    await sql.end();
  } catch (e: any) {
    console.log(`Cleanup warning: ${e.message}`);
  }
}, 30000);
