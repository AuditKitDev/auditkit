import { test, expect, loginUser, navigateTo } from './helpers';

test.describe('Dashboard — Webhooks CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await navigateTo(page, '/dashboard/integrations/webhooks');
  });

  test('create a new webhook and see it in the list', async ({ page }) => {
    await page.getByText('Add Webhook').click();

    // Fill the URL
    await page
      .locator('input[placeholder*="example.com/webhooks"]')
      .fill('https://e2e-test.example.com/hook');

    // Select event filter (All events should be selected by default)
    // Submit
    await page.getByRole('button', { name: 'Add Webhook' }).click();

    // Should see the webhook URL in the list
    await expect(
      page.getByText('e2e-test.example.com'),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('delete a webhook with confirmation', async ({ page }) => {
    // Create one to delete
    await page.getByText('Add Webhook').click();
    await page
      .locator('input[placeholder*="example.com/webhooks"]')
      .fill('https://delete-me.example.com/hook');
    await page.getByRole('button', { name: 'Add Webhook' }).click();
    await expect(page.getByText('delete-me.example.com')).toBeVisible({ timeout: 5_000 });

    // Click delete (trash icon)
    const deleteBtn = page.locator('[title="Delete webhook"]').first();
    await deleteBtn.click();

    // Confirm
    await page.getByRole('button', { name: 'Confirm' }).click();

    // Should be removed
    await expect(page.getByText('delete-me.example.com')).not.toBeVisible({ timeout: 5_000 });
  });

  test('cancel webhook creation does not add an entry', async ({ page }) => {
    const initialCount = await page.locator('[title="Delete webhook"]').count();

    await page.getByText('Add Webhook').click();
    await page
      .locator('input[placeholder*="example.com/webhooks"]')
      .fill('https://cancelled.example.com/hook');
    await page.getByRole('button', { name: 'Cancel' }).click();

    const finalCount = await page.locator('[title="Delete webhook"]').count();
    expect(finalCount).toBe(initialCount);
  });
});
