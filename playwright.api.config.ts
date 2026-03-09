import { defineConfig } from '@playwright/test';

/**
 * Playwright config for E2E API tests.
 *
 * Run with:  npx playwright test --config playwright.api.config.ts
 *
 * These tests hit the REAL running API at E2E_API_URL/API_URL.
 * No browser is needed -- only the Playwright HTTP `request` context is used.
 */
const apiBaseUrl =
  process.env.E2E_API_URL || process.env.API_URL || 'http://localhost:3102';

export default defineConfig({
  testDir: './tests/e2e/api',
  fullyParallel: false, // Many suites use serial order (signup before login, etc.)
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Serial execution avoids cross-test data races
  timeout: 30_000,
  reporter: [['html', { outputFolder: 'playwright-report-api' }], ['list']],
  use: {
    baseURL: apiBaseUrl,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },
  // No webServer block -- the API must be started manually or by CI.
});
