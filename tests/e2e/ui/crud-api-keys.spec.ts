import { test, expect, loginUser, navigateTo } from './helpers';

test.describe('Dashboard — API Keys CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateTo(page, '/dashboard/settings/api-keys');
  });

  test('create a new API key and see it in the list', async ({ page }) => {
    // Click "Create New Key"
    await page.getByText('Create New Key').click();

    // Fill form
    await page.locator('input[placeholder*="Production API Key"]').fill('E2E Test Key');
    await page.locator('select').selectOption('live');

    // Submit
    await page.getByRole('button', { name: 'Create Key' }).click();

    // Should see the success banner with the key
    await expect(
      page.getByText('API key created'),
    ).toBeVisible({ timeout: 5_000 });

    // The created key should appear in the list
    await expect(page.getByText('E2E Test Key')).toBeVisible();
  });

  test('created key shows prefix in the list', async ({ page }) => {
    // Create a key first
    await page.getByText('Create New Key').click();
    await page.locator('input[placeholder*="Production API Key"]').fill('Prefix Check Key');
    await page.locator('select').selectOption('live');
    await page.getByRole('button', { name: 'Create Key' }).click();

    await expect(page.getByText('API key created')).toBeVisible({ timeout: 5_000 });

    // Should show the key prefix (ak_live_ or ak_test_)
    await expect(page.getByText(/ak_(live|test)_/)).toBeVisible();
  });

  test('delete an API key with confirmation', async ({ page }) => {
    // Create one to delete
    await page.getByText('Create New Key').click();
    await page.locator('input[placeholder*="Production API Key"]').fill('Delete Me Key');
    await page.locator('select').selectOption('test');
    await page.getByRole('button', { name: 'Create Key' }).click();
    await expect(page.getByText('API key created')).toBeVisible({ timeout: 5_000 });

    // Find and click the delete button (trash icon)
    const deleteBtn = page.locator('[title="Delete key"]').first();
    await deleteBtn.click();

    // Confirm deletion
    await page.getByRole('button', { name: 'Confirm' }).click();

    // Wait for the key to be removed
    await expect(page.getByText('Delete Me Key')).not.toBeVisible({ timeout: 5_000 });
  });

  test('cancel create dialog does not add a key', async ({ page }) => {
    const initialKeys = await page.locator('[title="Delete key"]').count();

    await page.getByText('Create New Key').click();
    await page.locator('input[placeholder*="Production API Key"]').fill('Should Not Exist');
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Key count should not have changed
    const finalKeys = await page.locator('[title="Delete key"]').count();
    expect(finalKeys).toBe(initialKeys);
    await expect(page.getByText('Should Not Exist')).not.toBeVisible();
  });
});
