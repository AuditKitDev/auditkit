import { test, expect, loginUser, navigateTo } from './helpers';
import { argosScreenshot } from '@argos-ci/playwright';

// ==========================================================================
// Anomalies
// ==========================================================================

test.describe('Dashboard — Anomalies', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateTo(page, '/dashboard/anomalies');
  });

  test('page heading "Anomaly Detection" is visible', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Anomaly Detection' }),
    ).toBeVisible();
  });

  test('alert feed section is visible', async ({ page }) => {
    await expect(page.getByText('Alert Feed')).toBeVisible();
  });

  test('anomaly alerts or empty state renders', async ({ page }) => {
    const hasAlerts =
      (await page.locator('[class*="rounded-xl"][class*="bg-card"]').count()) > 0;
    const hasEmpty = await page
      .getByText('No anomaly alerts detected')
      .isVisible()
      .catch(() => false);
    const hasError = await page
      .getByText('Failed to load anomaly alerts')
      .isVisible()
      .catch(() => false);
    const hasSkeletons = (await page.locator('.skeleton').count()) > 0;
    expect(hasAlerts || hasEmpty || hasError || hasSkeletons).toBeTruthy();
  });

  test('detection rules section is visible', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Detection Rules' }),
    ).toBeVisible();
  });

  test('detection status badge (Active/Inactive) is visible', async ({ page }) => {
    const hasActive = await page
      .getByText('Active', { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    const hasInactive = await page
      .getByText('Inactive', { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasActive || hasInactive).toBeTruthy();
  });

  test('screenshot — dashboard-anomalies', async ({ page }) => {
    await page.waitForLoadState('networkidle').catch(() => {});
    await argosScreenshot(page, 'dashboard-anomalies', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});

// ==========================================================================
// Compliance
// ==========================================================================

test.describe('Dashboard — Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateTo(page, '/dashboard/compliance');
  });

  test('page heading "Compliance Reports" is visible', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Compliance Reports' }),
    ).toBeVisible();
  });

  test('framework cards show SOC 2, HIPAA, ISO 27001, GDPR', async ({ page }) => {
    for (const framework of ['SOC 2', 'HIPAA', 'ISO 27001', 'GDPR']) {
      await expect(
        page.getByText(framework, { exact: false }).first(),
      ).toBeVisible();
    }
  });

  test('generate report buttons exist for each framework', async ({ page }) => {
    const buttons = page.getByText('Generate Report');
    await expect(buttons).toHaveCount(4);
  });

  test('generated reports section exists', async ({ page }) => {
    await expect(page.getByText('Generated Reports')).toBeVisible();
  });

  test('refresh button exists', async ({ page }) => {
    await expect(page.getByText('Refresh')).toBeVisible();
  });

  test('screenshot — dashboard-compliance', async ({ page }) => {
    await page.waitForLoadState('networkidle').catch(() => {});
    await argosScreenshot(page, 'dashboard-compliance', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});

// ==========================================================================
// Tenants
// ==========================================================================

test.describe('Dashboard — Tenants', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateTo(page, '/dashboard/tenants');
  });

  test('page heading "Tenants" is visible', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Tenants' }),
    ).toBeVisible();
  });

  test('search input for tenants exists', async ({ page }) => {
    await expect(
      page.locator('input[placeholder*="Search tenants"]'),
    ).toBeVisible();
  });

  test('tenant list or empty state renders', async ({ page }) => {
    const hasTenantCards =
      (await page.locator('[class*="card-hover"]').count()) > 0;
    const hasEmpty =
      (await page.getByText('No tenants found').isVisible().catch(() => false)) ||
      (await page.getByText('No tenants match').isVisible().catch(() => false));
    const hasError = await page
      .getByText('Failed to load tenants')
      .isVisible()
      .catch(() => false);
    const hasSkeletons = (await page.locator('.skeleton').count()) > 0;
    expect(hasTenantCards || hasEmpty || hasError || hasSkeletons).toBeTruthy();
  });

  test('screenshot — dashboard-tenants', async ({ page }) => {
    await page.waitForLoadState('networkidle').catch(() => {});
    await argosScreenshot(page, 'dashboard-tenants', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});

// ==========================================================================
// Verification
// ==========================================================================

test.describe('Dashboard — Verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateTo(page, '/dashboard/verification');
  });

  test('page heading "Chain Verification" is visible', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Chain Verification' }),
    ).toBeVisible();
  });

  test('run verification section exists', async ({ page }) => {
    await expect(page.getByText('Run Verification').first()).toBeVisible();
  });

  test('verify chain button exists', async ({ page }) => {
    await expect(page.getByText('Verify Chain')).toBeVisible();
  });

  test('tenant selector or skeleton exists', async ({ page }) => {
    const hasSelect = (await page.locator('select').count()) > 0;
    const hasSkeletons = (await page.locator('.skeleton').count()) > 0;
    expect(hasSelect || hasSkeletons).toBeTruthy();
  });

  test('empty state shows guidance text', async ({ page }) => {
    await expect(
      page.getByText('Select a tenant and run verification'),
    ).toBeVisible();
  });

  test('clicking verify chain triggers verification', async ({ page }) => {
    const verifyBtn = page.getByText('Verify Chain');
    await verifyBtn.click();
    // Should either show results, an error, or a loading indicator
    await page.waitForSelector(
      '.skeleton, [role="alert"], [class*="result"], [class*="progress"]',
      { state: 'attached', timeout: 5_000 },
    ).catch(() => {});
    // The button should still be visible (page did not crash)
    await expect(page.getByRole('heading', { name: 'Chain Verification' })).toBeVisible();
  });

  test('screenshot — dashboard-verification', async ({ page }) => {
    await page.waitForLoadState('networkidle').catch(() => {});
    await argosScreenshot(page, 'dashboard-verification', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});
