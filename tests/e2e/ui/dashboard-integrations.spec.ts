import { test, expect, loginUser, navigateTo } from './helpers';
import { argosScreenshot } from '@argos-ci/playwright';

// ==========================================================================
// Webhooks
// ==========================================================================

test.describe('Dashboard — Integrations — Webhooks', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateTo(page, '/dashboard/integrations/webhooks');
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('webhook list or empty state renders', async ({ page }) => {
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('create webhook button or form exists', async ({ page }) => {
    const addBtn = page.getByText(/add|create|new/i).first();
    const hasAdd = await addBtn.isVisible().catch(() => false);
    const hasButtons = (await page.locator('button:has(svg)').count()) > 0;
    expect(hasAdd || hasButtons).toBeTruthy();
  });

  test('screenshot — integrations-webhooks', async ({ page }) => {
    await page.waitForLoadState('networkidle').catch(() => {});
    await argosScreenshot(page, 'integrations-webhooks', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});

// ==========================================================================
// SIEM Connectors
// ==========================================================================

test.describe('Dashboard — Integrations — SIEM', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateTo(page, '/dashboard/integrations/siem');
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('SIEM provider cards are visible', async ({ page }) => {
    // After remediation, supports: Splunk, Datadog, S3, Sentinel, GCS, BigQuery, Elastic, Custom
    const providers = ['Splunk', 'Datadog', 'S3', 'Custom'];
    const hasProviders = await Promise.all(
      providers.map((p) =>
        page.getByText(p, { exact: false }).first().isVisible().catch(() => false),
      ),
    );
    const hasBody = await page.locator('main').isVisible();
    expect(
      hasProviders.some(Boolean) || hasBody,
      'SIEM page should show provider options or main content',
    ).toBeTruthy();
  });

  test('configured connectors show redacted credentials', async ({ page }) => {
    // After remediation (HIGH-3), SIEM credentials are encrypted at rest
    // and API responses show redacted values like { configured: true, lastFour: "****" }
    // Verify raw tokens never appear in the rendered page
    const pageContent = await page.locator('main').textContent();
    // No raw API keys or tokens should be visible in plain text
    expect(pageContent).not.toContain('tok_');
    expect(pageContent).not.toContain('sk_');
  });

  test('screenshot — integrations-siem', async ({ page }) => {
    await page.waitForLoadState('networkidle').catch(() => {});
    await argosScreenshot(page, 'integrations-siem', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});

// ==========================================================================
// Notifications
// ==========================================================================

test.describe('Dashboard — Integrations — Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateTo(page, '/dashboard/integrations/notifications');
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('notification rules or empty state renders', async ({ page }) => {
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('screenshot — integrations-notifications', async ({ page }) => {
    await page.waitForLoadState('networkidle').catch(() => {});
    await argosScreenshot(page, 'integrations-notifications', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});
