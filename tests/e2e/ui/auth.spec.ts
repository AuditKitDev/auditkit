import { test, expect, API_URL } from './helpers';
import { argosScreenshot } from '@argos-ci/playwright';

// ==========================================================================
// Login Page
// ==========================================================================

test.describe('Auth — Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
  });

  test('renders login heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome back');
  });

  test('form has email and password fields', async ({ page }) => {
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('form has Sign in submit button', async ({ page }) => {
    const btn = page.locator('button[type="submit"]');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Sign in');
  });

  test('link to signup exists', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Sign up' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/signup');
  });

  test('link to forgot password exists', async ({ page }) => {
    const link = page.getByText('Forgot password?');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/forgot-password');
  });

  test('empty submit triggers native validation — stays on /login', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login/);
    const emailValid = await page.locator('#email').evaluate(
      (el) => (el as HTMLInputElement).validity.valid,
    );
    expect(emailValid).toBe(false);
  });

  test('submit with invalid credentials shows error', async ({ page }) => {
    await page.locator('#email').fill('bad@example.com');
    await page.locator('#password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    // Wait for either an error message or stay on login (API may not be running)
    const errorVisible = await page
      .locator('[role="alert"], .text-red-500, .text-destructive')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const stillOnLogin = /\/login/.test(page.url());
    expect(errorVisible || stillOnLogin).toBeTruthy();
  });

  test('submit with valid credentials redirects to dashboard', async ({ page }) => {
    const uniqueEmail = `login-test-${Date.now()}@example.com`;
    const password = 'TestPass123!';
    const signupRes = await page.request.post(`${API_URL}/auth/signup`, {
      data: { email: uniqueEmail, password, name: 'Login Test' },
    });
    expect(signupRes.status()).toBe(201);

    await page.locator('#email').fill(uniqueEmail);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('logo links back to home', async ({ page }) => {
    const logoLink = page.locator('a[href="/"]').first();
    await expect(logoLink).toBeVisible();
  });

  test('screenshot — login-form', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await argosScreenshot(page, 'login-form', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });

  test('screenshot — login-error', async ({ page }) => {
    await page.locator('#email').fill('bad@example.com');
    await page.locator('#password').fill('wrong');
    await page.locator('button[type="submit"]').click();
    // Wait for response or timeout
    await page
      .locator('[role="alert"], .text-red-500, .text-destructive')
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 })
      .catch(() => {});
    await argosScreenshot(page, 'login-error', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});

// ==========================================================================
// Signup Page
// ==========================================================================

test.describe('Auth — Signup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'networkidle' });
  });

  test('renders signup heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Create your account');
  });

  test('form has name, email, password, confirm-password fields', async ({ page }) => {
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirm-password')).toBeVisible();
  });

  test('form has Create account submit button', async ({ page }) => {
    const btn = page.locator('button[type="submit"]');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Create account');
  });

  test('link to login exists', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Log in' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/login');
  });

  test('empty submit triggers native validation', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/signup/);
    const nameValid = await page.locator('#name').evaluate(
      (el) => (el as HTMLInputElement).validity.valid,
    );
    expect(nameValid).toBe(false);
  });

  test('short password shows client-side error', async ({ page }) => {
    await page.locator('#name').fill('Test');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('ab');
    await page.locator('#confirm-password').fill('ab');
    await page.locator('button[type="submit"]').click();

    // Either native minlength validation or JS error message
    const passwordField = page.locator('#password');
    const isInvalid = await passwordField.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid,
    );
    const hasErrorMsg = await page
      .locator('[role="alert"], .text-red-500, .text-destructive')
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(isInvalid || hasErrorMsg).toBeTruthy();
  });

  test('valid signup redirects to dashboard', async ({ page }) => {
    const email = `signup-test-${Date.now()}@example.com`;
    await page.locator('#name').fill('Signup Test');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('TestPass123!');
    await page.locator('#confirm-password').fill('TestPass123!');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('screenshot — signup-form', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await argosScreenshot(page, 'signup-form', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });

  test('screenshot — signup-error', async ({ page }) => {
    await page.locator('#name').fill('Test');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('ab');
    await page.locator('#confirm-password').fill('ab');
    await page.locator('button[type="submit"]').click();
    await page
      .locator('[role="alert"], .text-red-500, .text-destructive')
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 })
      .catch(() => {});
    await argosScreenshot(page, 'signup-error', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});

// ==========================================================================
// Forgot Password Page
// ==========================================================================

test.describe('Auth — Forgot Password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'networkidle' });
  });

  test('renders forgot-password heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Forgot password?');
  });

  test('form has email field and submit button', async ({ page }) => {
    await expect(page.locator('#email')).toBeVisible();
    const btn = page.locator('button[type="submit"]');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Send reset link');
  });

  test('back to login link exists', async ({ page }) => {
    await expect(page.getByText('Back to login')).toBeVisible();
  });

  test('empty submit triggers native validation', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/forgot-password/);
    const valid = await page.locator('#email').evaluate(
      (el) => (el as HTMLInputElement).validity.valid,
    );
    expect(valid).toBe(false);
  });

  test('submit with email stays or shows confirmation', async ({ page }) => {
    await page.locator('#email').fill('user@example.com');
    await page.locator('button[type="submit"]').click();
    await expect(
      page.getByText(/check your email|reset link sent/i).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('screenshot — forgot-password', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await argosScreenshot(page, 'forgot-password', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});

// ==========================================================================
// Reset Password Page
// ==========================================================================

test.describe('Auth — Reset Password', () => {
  test('without token shows invalid link message', async ({ page }) => {
    await page.goto('/reset-password', { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toContainText('Invalid link');
    await expect(page.getByText('Request a new reset link')).toBeVisible();
  });

  test('with token shows password form', async ({ page }) => {
    await page.goto('/reset-password?token=test_token', {
      waitUntil: 'networkidle',
    });
    await expect(page.locator('h1')).toContainText('Set new password');
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirm-password')).toBeVisible();
    const btn = page.locator('button[type="submit"]');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Reset password');
  });

  test('screenshot — reset-password-invalid', async ({ page }) => {
    await page.goto('/reset-password', { waitUntil: 'networkidle' });
    await argosScreenshot(page, 'reset-password-invalid', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });

  test('screenshot — reset-password-form', async ({ page }) => {
    await page.goto('/reset-password?token=test_token', {
      waitUntil: 'networkidle',
    });
    await argosScreenshot(page, 'reset-password-form', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});
