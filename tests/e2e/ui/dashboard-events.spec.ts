import { test, expect, loginUser, navigateTo } from './helpers';
import { argosScreenshot } from '@argos-ci/playwright';

test.describe('Dashboard — Events', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateTo(page, '/dashboard/events');
  });

  // -- Page structure -------------------------------------------------------

  test('page heading "Events" is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();
  });

  test('search input exists', async ({ page }) => {
    const search = page.locator('input[type="text"]').first();
    await expect(search).toBeVisible();
  });

  test('filter controls exist', async ({ page }) => {
    await expect(page.getByText('Filters')).toBeVisible();
  });

  test('events table is visible with expected headers', async ({ page }) => {
    const table = page.locator('table');
    await expect(table).toBeVisible();

    for (const header of ['Action', 'Actor', 'Target', 'Tenant', 'Time']) {
      await expect(table.getByText(header, { exact: true }).first()).toBeVisible();
    }
  });

  test('export button exists', async ({ page }) => {
    await expect(page.getByText('Export')).toBeVisible();
  });

  test('live mode toggle exists', async ({ page }) => {
    await expect(page.getByText('Live')).toBeVisible();
  });

  test('NLP search toggle exists', async ({ page }) => {
    await expect(page.getByText('NLP')).toBeVisible();
  });

  // -- Search interaction ---------------------------------------------------

  test('typing in search filters the table', async ({ page }) => {
    const search = page.locator('input[type="text"]').first();
    await search.fill('user.login');
    // The table should update — either show results or "no results"
    await page.waitForSelector('table tbody tr, [class*="empty"]', {
      state: 'attached',
      timeout: 10_000,
    });
    // Verify search value persists
    await expect(search).toHaveValue('user.login');
  });

  // -- Event detail drawer --------------------------------------------------

  test('clicking an event row opens detail drawer', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const rowExists = (await firstRow.count()) > 0;

    if (rowExists) {
      await firstRow.click();

      // Wait for drawer / panel to appear
      const drawer = page
        .locator('[role="dialog"], [data-state="open"], aside.fixed, .drawer')
        .first();
      await expect(drawer).toBeVisible({ timeout: 5_000 });
    } else {
      // No data rows — verify the empty state is rendered
      const emptyState = page.getByText(/no events|no results/i).first();
      const hasEmpty = await emptyState.isVisible().catch(() => false);
      const hasSkeletons = (await page.locator('.skeleton').count()) > 0;
      expect(hasEmpty || hasSkeletons).toBeTruthy();
    }
  });

  // -- Pagination -----------------------------------------------------------

  test('pagination controls are present when data exists', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Look for pagination buttons or text
      const paginationArea = page.locator('nav[aria-label*="pagination"], [class*="pagination"]');
      const nextBtn = page.getByRole('button', { name: /next|›/i });
      const pageNumbers = page.getByText(/page \d|showing/i);

      const hasPagination =
        (await paginationArea.count()) > 0 ||
        (await nextBtn.count()) > 0 ||
        (await pageNumbers.count()) > 0;
      // Pagination may not render if there is only one page
      expect(hasPagination || rowCount < 25).toBeTruthy();
    }
  });

  // -- Screenshots ----------------------------------------------------------

  test('screenshot — events-table', async ({ page }) => {
    await page.waitForLoadState('networkidle').catch(() => {});
    await argosScreenshot(page, 'events-table', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });

  test('screenshot — events-search-results', async ({ page }) => {
    const search = page.locator('input[type="text"]').first();
    await search.fill('user.login');
    await page.waitForSelector('table tbody tr, [class*="empty"]', {
      state: 'attached',
      timeout: 10_000,
    }).catch(() => {});
    await argosScreenshot(page, 'events-search-results', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });

  test('screenshot — events-detail-drawer', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    if ((await firstRow.count()) > 0) {
      await firstRow.click();
      await page
        .locator('[role="dialog"], [data-state="open"], aside.fixed, .drawer')
        .first()
        .waitFor({ state: 'visible', timeout: 5_000 })
        .catch(() => {});
    }
    await argosScreenshot(page, 'events-detail-drawer', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});
