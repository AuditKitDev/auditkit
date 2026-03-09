import { test as base, expect, type Page } from '@playwright/test';
import { argosScreenshot } from '@argos-ci/playwright';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const API_URL =
  process.env.E2E_API_URL ||
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3102';
export const WEB_URL = process.env.E2E_WEB_URL || 'http://localhost:3000';
const WEB_HOSTNAME = new URL(WEB_URL).hostname;

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Sign up a fresh user via API, then log in and inject the session into the
 * browser so dashboard pages can be visited without going through the UI
 * login flow.
 *
 */
export async function loginUser(page: Page): Promise<{
  email: string;
  token: string;
}> {
  const uniqueEmail = `test-ui-${Date.now()}@example.com`;
  const password = 'TestPass123!';
  const name = 'UI Test User';
  const signupRes = await page.request.post(`${API_URL}/auth/signup`, {
    data: { email: uniqueEmail, password, name },
  });
  if (signupRes.status() !== 201) {
    throw new Error(
      `UI auth helper signup failed (${signupRes.status()}): ${await signupRes.text()}`,
    );
  }

  const loginRes = await page.request.post(`${API_URL}/auth/login`, {
    data: { email: uniqueEmail, password },
  });
  if (loginRes.status() !== 200) {
    throw new Error(
      `UI auth helper login failed (${loginRes.status()}): ${await loginRes.text()}`,
    );
  }

  const body = (await loginRes.json()) as { token?: string; session?: string };
  const token = body.token ?? body.session;
  if (typeof token !== 'string' || !token) {
    throw new Error('UI auth helper login response did not include a session token');
  }

  // Inject session cookie
  await page.context().addCookies([
    {
      name: 'session',
      value: token,
      domain: WEB_HOSTNAME,
      path: '/',
    },
  ]);

  // Set localStorage token & dismiss onboarding
  await page.addInitScript((t: string) => {
    localStorage.setItem('auditkit_session', t);
    localStorage.setItem('auditkit_onboarding_complete', 'true');
  }, token);

  return { email: uniqueEmail, token };
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

/** Navigate to a path and wait for network to settle. */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for the page to display either real content or an error / empty state
 * rather than a loading skeleton.
 */
export async function waitForPageReady(page: Page) {
  await page.waitForSelector(
    'h1, h2, table, [role="alert"], [data-testid]',
    { timeout: 15_000, state: 'attached' },
  );
}

// ---------------------------------------------------------------------------
// Console-error tracking
// ---------------------------------------------------------------------------

const BENIGN_PATTERNS = [
  'net::ERR_CONNECTION_REFUSED',
  'Failed to fetch',
  'NetworkError',
  'TypeError: fetch failed',
  'ERR_NETWORK',
  'ECONNREFUSED',
  'SSE connection failed',
  'SSE error',
  'favicon',
  'HMR',
  'Fast Refresh',
  '[webpack',
];

/** Start tracking console errors; returns the array that will be populated. */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (BENIGN_PATTERNS.some((p) => text.includes(p))) return;
    errors.push(text);
  });
  return errors;
}

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

/** Assert every visible <img> has loaded successfully. */
export async function assertNoBrokenImages(page: Page) {
  const images = page.locator('img:visible');
  const count = await images.count();
  for (let i = 0; i < count; i++) {
    const img = images.nth(i);
    const naturalWidth = await img.evaluate(
      (el) => (el as HTMLImageElement).naturalWidth,
    );
    const src = await img.getAttribute('src');
    expect(naturalWidth, `Image "${src}" should have loaded`).toBeGreaterThan(0);
  }
}

// ---------------------------------------------------------------------------
// Extended test fixture with argos helper
// ---------------------------------------------------------------------------

export const test = base.extend<{
  argos: (name: string) => Promise<void>;
}>({
  argos: async ({ page }, use) => {
    await use(async (name: string) => {
      await argosScreenshot(page, name, {
        viewports: ['macbook-16', 'iphone-x'],
      });
    });
  },
});

export { expect };
