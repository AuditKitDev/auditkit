import { test, expect, loginUser, navigateTo } from './helpers';

test.describe('Dashboard — Team Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateTo(page, '/dashboard/settings/team');
  });

  test('owner is shown in the members list', async ({ page }) => {
    // The authenticated user should appear as owner
    await expect(page.getByText('Owner', { exact: true }).first()).toBeVisible({ timeout: 5_000 });
  });

  test('send a team invite', async ({ page }) => {
    await page.getByText('Invite Member').click();

    // Fill the email
    await page.locator('input[placeholder*="colleague@company.com"]').fill(
      `invited-${Date.now()}@e2e-test.com`,
    );

    // Select role (member is default)
    await page.locator('select').selectOption('member');

    // Submit
    await page.getByRole('button', { name: 'Send Invite' }).click();

    // Should see success message
    await expect(page.getByText('Invitation sent')).toBeVisible({ timeout: 5_000 });
  });

  test('invite with admin role shows success', async ({ page }) => {
    await page.getByText('Invite Member').click();

    await page.locator('input[placeholder*="colleague@company.com"]').fill(
      `admin-${Date.now()}@e2e-test.com`,
    );
    await page.locator('select').selectOption('admin');
    await page.getByRole('button', { name: 'Send Invite' }).click();

    await expect(page.getByText('Invitation sent')).toBeVisible({ timeout: 5_000 });
  });
});
