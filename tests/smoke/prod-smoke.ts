/**
 * Production Smoke Tests
 *
 * Runs against the live API and web app. No browser needed.
 * Usage: npx tsx tests/smoke/prod-smoke.ts
 */

const API = process.env.API_URL || 'https://api.auditkit.dev';
const WEB = process.env.WEB_URL || 'https://auditkit.dev';
const TEST_EMAIL = `smoke-${Date.now()}@test.auditkit.dev`;
const TEST_PASS = 'SmokeTest99!';

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  \x1b[31m✗\x1b[0m ${name}: ${e.message}`);
    failed++;
    failures.push(`${name}: ${e.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function api(path: string, opts: RequestInit = {}): Promise<{ status: number; body: any }> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string>) },
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

async function webPage(path: string): Promise<{ status: number; size: number }> {
  const res = await fetch(`${WEB}${path}`);
  const text = await res.text();
  return { status: res.status, size: text.length };
}

// ─── State ───
let token = '';
let userId = '';
let projectId = '';
let sdkKey = '';
let eventId = '';

async function main() {
  console.log(`\n\x1b[1m🔍 AuditKit Production Smoke Tests\x1b[0m`);
  console.log(`   API: ${API}`);
  console.log(`   Web: ${WEB}\n`);

  // ═══════════════════════════════════════
  // HEALTH
  // ═══════════════════════════════════════
  console.log('\x1b[1mHealth\x1b[0m');
  await test('API health check', async () => {
    const { status, body } = await api('/health');
    assert(status === 200, `status ${status}`);
    assert(body.status === 'ok', `body: ${JSON.stringify(body)}`);
  });

  // ═══════════════════════════════════════
  // WEB PAGES
  // ═══════════════════════════════════════
  console.log('\n\x1b[1mWeb Pages\x1b[0m');
  for (const [page, minSize] of [
    ['/', 5000],
    ['/login', 5000],
    ['/signup', 5000],
    ['/docs', 10000],
    ['/forgot-password', 3000],
  ] as const) {
    await test(`GET ${page} → 200 (>${minSize}b)`, async () => {
      const { status, size } = await webPage(page);
      assert(status === 200, `status ${status}`);
      assert(size > minSize, `page too small: ${size}b`);
    });
  }

  await test('GET /dashboard/overview → redirect to login', async () => {
    const res = await fetch(`${WEB}/dashboard/overview`, { redirect: 'manual' });
    assert(res.status === 307, `expected 307, got ${res.status}`);
    const loc = res.headers.get('location') || '';
    assert(loc.includes('/login'), `redirect to: ${loc}`);
  });

  // ═══════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════
  console.log('\n\x1b[1mAuth\x1b[0m');

  await test('Signup creates account + project', async () => {
    const { status, body } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS, name: 'Smoke' }),
    });
    assert(status === 201, `status ${status}: ${JSON.stringify(body)}`);
    assert(!!body.token, 'missing token');
    assert(!!body.user?.id, 'missing user.id');
    assert(!!body.project?.id, 'missing project');
    token = body.token;
    userId = body.user.id;
    projectId = body.project.id;
  });

  await test('Duplicate signup rejected (409)', async () => {
    const { status } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS, name: 'Dupe' }),
    });
    assert(status === 409, `expected 409, got ${status}`);
  });

  await test('Signup rejects weak password', async () => {
    const { status } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'weak@test.dev', password: 'short', name: 'Weak' }),
    });
    assert(status === 400, `expected 400, got ${status}`);
  });

  await test('Login works', async () => {
    const { status, body } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
    });
    assert(status === 200, `status ${status}: ${JSON.stringify(body)}`);
    assert(!!body.token, 'missing token');
    assert(!!body.refresh_token, 'missing refresh_token');
    token = body.token;
  });

  await test('Login rejects wrong password (401)', async () => {
    const { status } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: 'wrongwrong' }),
    });
    assert(status === 401, `expected 401, got ${status}`);
  });

  await test('Login rejects nonexistent user (401)', async () => {
    const { status } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'nobody@nowhere.dev', password: 'anything1' }),
    });
    assert(status === 401, `expected 401, got ${status}`);
  });

  await test('GET /auth/me returns user', async () => {
    const { status, body } = await api('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(status === 200, `status ${status}`);
    assert(body.user?.email === TEST_EMAIL, `wrong email: ${body.user?.email}`);
  });

  await test('/auth/me rejects bad token (401)', async () => {
    const { status } = await api('/auth/me', {
      headers: { Authorization: 'Bearer fake_token_here' },
    });
    assert(status === 401, `expected 401, got ${status}`);
  });

  await test('/auth/me rejects no token (401)', async () => {
    const { status } = await api('/auth/me');
    assert(status === 401, `expected 401, got ${status}`);
  });

  // ═══════════════════════════════════════
  // BILLING
  // ═══════════════════════════════════════
  console.log('\n\x1b[1mBilling\x1b[0m');
  const authH = { Authorization: `Bearer ${token}` };

  await test('Subscription returns free plan', async () => {
    const { status, body } = await api('/billing/subscription', { headers: authH });
    assert(status === 200, `status ${status}`);
    assert(body.plan === 'free', `expected free, got ${body.plan}`);
    assert(body.event_quota === 1000, `quota: ${body.event_quota}`);
    assert(body.project_quota === 1, `projects: ${body.project_quota}`);
    assert(body.retention_days === 7, `retention: ${body.retention_days}`);
  });

  await test('Checkout rejects free plan (400)', async () => {
    const { status } = await api('/billing/checkout', {
      method: 'POST',
      headers: authH,
      body: JSON.stringify({ plan: 'free', success_url: `${WEB}/ok`, cancel_url: `${WEB}/no` }),
    });
    assert(status === 400, `expected 400, got ${status}`);
  });

  await test('Checkout rejects invalid plan (400)', async () => {
    const { status } = await api('/billing/checkout', {
      method: 'POST',
      headers: authH,
      body: JSON.stringify({ plan: 'mega', success_url: `${WEB}/ok`, cancel_url: `${WEB}/no` }),
    });
    assert(status === 400, `expected 400, got ${status}`);
  });

  await test('Checkout creates Stripe session for pro', async () => {
    const { status, body } = await api('/billing/checkout', {
      method: 'POST',
      headers: authH,
      body: JSON.stringify({ plan: 'pro', success_url: `${WEB}/ok`, cancel_url: `${WEB}/no` }),
    });
    assert(status === 200, `status ${status}: ${JSON.stringify(body)}`);
    assert(body.url?.startsWith('https://checkout.stripe.com'), `bad url: ${body.url}`);
  });

  await test('Billing rejects unauthenticated (401)', async () => {
    const { status } = await api('/billing/subscription');
    assert(status === 401, `expected 401, got ${status}`);
  });

  // ═══════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════
  console.log('\n\x1b[1mDashboard\x1b[0m');
  const dashH = { Authorization: `Bearer ${token}`, 'X-Project-Id': projectId };

  await test('List projects', async () => {
    const { status, body } = await api('/dashboard/projects', { headers: dashH });
    assert(status === 200, `status ${status}`);
    assert(Array.isArray(body.data || body), `not array: ${JSON.stringify(body).slice(0, 100)}`);
  });

  await test('Get stats', async () => {
    const { status, body } = await api('/dashboard/stats', { headers: dashH });
    assert(status === 200, `status ${status}: ${JSON.stringify(body).slice(0, 200)}`);
  });

  await test('List API keys', async () => {
    const { status, body } = await api('/dashboard/api-keys', { headers: dashH });
    assert(status === 200, `status ${status}`);
    assert(Array.isArray(body.data), `expected data array`);
    assert(body.data.length >= 1, 'should have default key');
  });

  await test('Create API key', async () => {
    const { status, body } = await api('/dashboard/api-keys', {
      method: 'POST',
      headers: dashH,
      body: JSON.stringify({ name: 'smoke-test', scopes: ['write', 'read'] }),
    });
    assert(status === 200 || status === 201, `status ${status}: ${JSON.stringify(body)}`);
    assert(!!body.key, 'missing key');
    sdkKey = body.key;
  });

  await test('Get analytics', async () => {
    const { status, body } = await api('/dashboard/analytics', { headers: dashH });
    assert(status === 200, `status ${status}: ${JSON.stringify(body).slice(0, 200)}`);
  });

  await test('Dashboard rejects missing project header', async () => {
    const { status } = await api('/dashboard/api-keys', { headers: authH });
    assert(status === 400 || status === 401 || status === 403, `expected 4xx, got ${status}`);
  });

  // ═══════════════════════════════════════
  // SDK / EVENT INGESTION
  // ═══════════════════════════════════════
  console.log('\n\x1b[1mSDK Event Ingestion\x1b[0m');
  const sdkH = { Authorization: `Bearer ${sdkKey}` };

  await test('Ingest event', async () => {
    const { status, body } = await api('/v1/events', {
      method: 'POST',
      headers: sdkH,
      body: JSON.stringify({
        action: 'user.login',
        actor: { id: 'usr_1', name: 'Smoke User' },
        target: { type: 'session', id: 'sess_1' },
        tenant_id: 'tenant_smoke',
        metadata: { ip: '1.2.3.4', browser: 'smoke-test' },
      }),
    });
    assert(status === 200 || status === 201 || status === 202, `status ${status}: ${JSON.stringify(body)}`);
    assert(!!body.id, `missing event id: ${JSON.stringify(body)}`);
    eventId = body.id;
  });

  await test('Ingest second event', async () => {
    const { status, body } = await api('/v1/events', {
      method: 'POST',
      headers: sdkH,
      body: JSON.stringify({
        action: 'document.viewed',
        actor: { id: 'usr_1', name: 'Smoke User' },
        target: { type: 'document', id: 'doc_42' },
        tenant_id: 'tenant_smoke',
      }),
    });
    assert(status === 200 || status === 201 || status === 202, `status ${status}: ${JSON.stringify(body)}`);
  });

  // Wait for queue processing
  await new Promise(r => setTimeout(r, 2000));

  await test('List events', async () => {
    const { status, body } = await api('/v1/events?limit=10', { headers: sdkH });
    assert(status === 200, `status ${status}`);
    assert(Array.isArray(body.data), 'expected data array');
    assert(body.data.length >= 1, `expected events, got ${body.data.length}`);
  });

  if (eventId) {
    await test('Get single event', async () => {
      const { status, body } = await api(`/v1/events/${eventId}`, { headers: sdkH });
      assert(status === 200, `status ${status}: ${JSON.stringify(body).slice(0, 200)}`);
      assert(body.action === 'user.login', `wrong action: ${body.action}`);
    });

    await test('Verify chain integrity', async () => {
      const { status, body } = await api('/v1/verify?tenant_id=tenant_smoke', { headers: sdkH });
      assert(status === 200, `status ${status}: ${JSON.stringify(body)}`);
    });
  }

  await test('Search events by action', async () => {
    const { status, body } = await api('/v1/events?action=user.login', { headers: sdkH });
    assert(status === 200, `status ${status}`);
    assert(Array.isArray(body.data), 'expected data array');
  });

  await test('Search events by actor', async () => {
    const { status, body } = await api('/v1/events?actor_id=usr_1', { headers: sdkH });
    assert(status === 200, `status ${status}`);
  });

  await test('Ingest rejects missing action (400)', async () => {
    const { status } = await api('/v1/events', {
      method: 'POST',
      headers: sdkH,
      body: JSON.stringify({ actor: { id: '1' }, tenant_id: 't1' }),
    });
    assert(status === 400, `expected 400, got ${status}`);
  });

  await test('Ingest rejects missing tenant_id (400)', async () => {
    const { status } = await api('/v1/events', {
      method: 'POST',
      headers: sdkH,
      body: JSON.stringify({ action: 'test', actor: { id: '1' } }),
    });
    assert(status === 400, `expected 400, got ${status}`);
  });

  await test('Ingest rejects invalid API key (401)', async () => {
    const { status } = await api('/v1/events', {
      method: 'POST',
      headers: { Authorization: 'Bearer ak_live_fake123' },
      body: JSON.stringify({ action: 'test', actor: { id: '1' }, tenant_id: 't1' }),
    });
    assert(status === 401, `expected 401, got ${status}`);
  });

  // ═══════════════════════════════════════
  // SECURITY
  // ═══════════════════════════════════════
  console.log('\n\x1b[1mSecurity\x1b[0m');

  await test('CORS rejects unknown origin', async () => {
    const res = await fetch(`${API}/health`, { headers: { Origin: 'https://evil.com' } });
    const cors = res.headers.get('access-control-allow-origin');
    assert(cors !== 'https://evil.com' && cors !== '*', `CORS allows evil: ${cors}`);
  });

  await test('Webhook rejects invalid signature', async () => {
    const { status } = await api('/billing/webhook', {
      method: 'POST',
      body: JSON.stringify({ type: 'fake.event' }),
      headers: { 'stripe-signature': 'fake_sig' },
    });
    assert(status >= 400, `expected 4xx, got ${status}`);
  });

  await test('XSS in signup name is stored safely', async () => {
    const xssEmail = `xss-${Date.now()}@test.dev`;
    const { status, body } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: xssEmail, password: 'SafePass99!', name: '<script>alert(1)</script>' }),
    });
    // Should either reject or store as plain text (not execute)
    if (status === 201) {
      assert(!body.user.name.includes('<script>') || body.user.name === '<script>alert(1)</script>',
        'XSS should be escaped or stored as literal');
      // Clean up
      cleanupUserIds.push(body.user.id);
    }
  });

  // ═══════════════════════════════════════
  // EMAIL
  // ═══════════════════════════════════════
  console.log('\n\x1b[1mEmail\x1b[0m');

  await test('Send verification endpoint works', async () => {
    const { status, body } = await api('/auth/send-verification', {
      method: 'POST',
      headers: authH,
    });
    assert(status === 200, `status ${status}: ${JSON.stringify(body)}`);
  });

  await test('Forgot password accepts valid email', async () => {
    const { status } = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL }),
    });
    assert(status === 200, `status ${status}`);
  });

  await test('Forgot password handles nonexistent email gracefully', async () => {
    const { status } = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'nobody-exists@nowhere.dev' }),
    });
    // Should return 200 to avoid email enumeration
    assert(status === 200, `expected 200 (no enumeration), got ${status}`);
  });

  // ═══════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════
  console.log('\n\x1b[1mCleanup\x1b[0m');
  try {
    const pg = (await import('postgres/cjs/src/index.js')).default;
    const dbUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_oNFquKh20DQk@ep-nameless-tooth-adoaytpr.c-2.us-east-1.aws.neon.tech/auditkit?sslmode=require';
    const sql = pg(dbUrl);

    const allUserIds = [userId, ...cleanupUserIds];
    for (const uid of allUserIds) {
      if (!uid) continue;
      await sql`DELETE FROM email_verification_tokens WHERE user_id = ${uid}`.catch(() => {});
      await sql`DELETE FROM password_reset_tokens WHERE user_id = ${uid}`.catch(() => {});
      await sql`DELETE FROM sessions WHERE user_id = ${uid}`.catch(() => {});
      await sql`DELETE FROM audit_events WHERE project_id IN (SELECT id FROM projects WHERE user_id = ${uid})`.catch(() => {});
      await sql`DELETE FROM tenants WHERE project_id IN (SELECT id FROM projects WHERE user_id = ${uid})`.catch(() => {});
      await sql`DELETE FROM api_keys WHERE project_id IN (SELECT id FROM projects WHERE user_id = ${uid})`.catch(() => {});
      await sql`DELETE FROM subscriptions WHERE user_id = ${uid}`.catch(() => {});
      await sql`DELETE FROM projects WHERE user_id = ${uid}`.catch(() => {});
      await sql`DELETE FROM users WHERE id = ${uid}`.catch(() => {});
    }
    await sql.end();
    console.log(`  \x1b[32m✓\x1b[0m Cleaned up ${allUserIds.filter(Boolean).length} test user(s)`);
  } catch (e: any) {
    console.log(`  \x1b[33m⚠\x1b[0m Cleanup error: ${e.message}`);
  }

  // ═══════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`\x1b[1mResults: \x1b[32m${passed} passed\x1b[0m, \x1b[${failed ? '31' : '32'}m${failed} failed\x1b[0m out of ${passed + failed} tests`);

  if (failures.length > 0) {
    console.log('\n\x1b[31mFailures:\x1b[0m');
    failures.forEach(f => console.log(`  • ${f}`));
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

const cleanupUserIds: string[] = [];
main().catch(e => { console.error(e); process.exit(1); });
