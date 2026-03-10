import { defineConfig, devices } from '@playwright/test';

const E2E_WEB_URL = process.env.E2E_WEB_URL || 'http://localhost:3100';
const E2E_API_URL = process.env.E2E_API_URL || 'http://localhost:3102';

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  timeout: 30000,
  reporter: [['list']],
  use: {
    baseURL: E2E_WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 15000,
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'smoke',
      use: { ...devices['Desktop Chrome'] },
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
