import { test, expect, loginUser, navigateTo, trackConsoleErrors } from './helpers';
import { argosScreenshot } from '@argos-ci/playwright';

test.describe('Dashboard — Overview', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateTo(page, '/dashboard/overview');
  });

  // -- Page structure -------------------------------------------------------

  test('page heading "Overview" is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  });

  test('stats cards section renders (data or skeletons)', async ({ page }) => {
    const statsGrid = page.locator('.grid').first();
    await expect(statsGrid).toBeVisible();

    const statLabels = ['Events Today', 'Active Tenants', 'Chain Status', 'Anomalies'];
    const hasLabels = await Promise.all(
      statLabels.map((l) =>
        page.getByText(l).first().isVisible().catch(() => false),
      ),
    );
    const hasSkeletons = (await page.locator('.skeleton').count()) > 0;
    expect(
      hasLabels.some(Boolean) || hasSkeletons,
      'Stats cards should show labels or skeleton loaders',
    ).toBeTruthy();
  });

  test('recent events section is visible', async ({ page }) => {
    await expect(page.getByText('Recent Events').first()).toBeVisible();
  });

  test('chain integrity section is visible', async ({ page }) => {
    await expect(page.getByText('Chain Integrity')).toBeVisible();
  });

  test('analytics cards or skeletons are rendered', async ({ page }) => {
    const skeletons = page.locator('.skeleton');
    const cards = page.locator('[class*="rounded-xl"]');
    const hasSkeletons = (await skeletons.count()) > 0;
    const hasCards = (await cards.count()) > 2;
    expect(hasSkeletons || hasCards).toBeTruthy();
  });

  // -- Quality checks -------------------------------------------------------

  test('no unexpected console errors', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    // Allow network to settle after page load
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(errors).toEqual([]);
  });

  // -- Screenshots ----------------------------------------------------------

  test('screenshot — dashboard-overview', async ({ page }) => {
    await page.waitForLoadState('networkidle').catch(() => {});
    await argosScreenshot(page, 'dashboard-overview', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});
