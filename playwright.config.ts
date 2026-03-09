import { defineConfig, devices } from '@playwright/test';

const E2E_WEB_URL = process.env.E2E_WEB_URL || 'http://localhost:3100';
const E2E_API_URL = process.env.E2E_API_URL || 'http://localhost:3102';

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60000,
  reporter: [['html'], ['list']],
  use: {
    baseURL: E2E_WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 30000,
    actionTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm exec tsx --env-file=.env src/index.ts',
      cwd: 'apps/api',
      url: `${E2E_API_URL}/health`,
      env: {
        ...process.env,
        PORT: '3102',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: 'npx next dev --port 3100',
      cwd: 'apps/web',
      url: E2E_WEB_URL,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: E2E_API_URL,
        E2E_API_URL,
        E2E_WEB_URL,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
