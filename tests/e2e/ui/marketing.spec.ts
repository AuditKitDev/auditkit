import { test, expect, assertNoBrokenImages } from './helpers';
import { argosScreenshot } from '@argos-ci/playwright';

// ==========================================================================
// Marketing / Public Pages
// ==========================================================================

test.describe('Marketing — Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  // -- Hero section --------------------------------------------------------

  test('hero headline is visible', async ({ page }) => {
    const hero = page.locator('h1');
    await expect(hero).toBeVisible();
    await expect(hero).toContainText('5 minutes, not 5 sprints');
  });

  test('hero badges render (Open source, Tamper-evident, Enterprise-ready)', async ({ page }) => {
    for (const badge of ['Open source', 'Tamper-evident', 'Enterprise-ready']) {
      await expect(
        page.locator('span').filter({ hasText: badge }).first(),
      ).toBeVisible();
    }
  });

  test('hero code example contains SDK import', async ({ page }) => {
    const codeBlock = page.locator('pre').first();
    await expect(codeBlock).toBeVisible();
    await expect(codeBlock).toContainText('@auditkit/sdk');
  });

  // -- Navigation ----------------------------------------------------------

  test('nav bar is visible with expected links', async ({ page }) => {
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();

    for (const label of ['Docs', 'Features', 'Pricing', 'Blog', 'GitHub', 'Get Started']) {
      await expect(nav.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('Docs nav link navigates to /docs', async ({ page }) => {
    await page.locator('nav').first().getByText('Docs', { exact: true }).click();
    await expect(page).toHaveURL(/\/docs/);
  });

  test('Blog nav link navigates to /blog', async ({ page }) => {
    await page.locator('nav').first().getByText('Blog', { exact: true }).click();
    await expect(page).toHaveURL(/\/blog/);
  });

  test('Get Started CTA navigates toward signup or dashboard', async ({ page }) => {
    const cta = page.locator('nav').first().getByText('Get Started', { exact: true });
    const href = await cta.getAttribute('href');
    expect(href).toMatch(/\/(signup|dashboard|login)/);
  });

  // -- Features section ----------------------------------------------------

  test('feature cards are visible', async ({ page }) => {
    await page.locator('#features').scrollIntoViewIfNeeded();
    await expect(
      page.getByText('Built for the people who actually need audit logs'),
    ).toBeVisible();

    const featureTexts = [
      'Your auditors need proof, not promises.',
      'Your customers need their own audit trail.',
      'Your security team needs real-time alerts.',
      'Your compliance officer needs exports.',
    ];
    for (const txt of featureTexts) {
      await expect(page.getByText(txt)).toBeVisible();
    }
  });

  // -- Pricing section -----------------------------------------------------

  test('pricing section renders 4 tiers with correct prices', async ({ page }) => {
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    const section = page.locator('#pricing');

    for (const tier of ['Free', 'Pro', 'Business']) {
      await expect(section.getByRole('heading', { name: tier })).toBeVisible();
    }
    await expect(section.getByRole('heading', { name: /Supersize/i })).toBeVisible();

    for (const price of ['$0', '$39', '$99', '$349']) {
      await expect(section.getByText(price)).toBeVisible();
    }
  });

  test('each pricing tier has a CTA button', async ({ page }) => {
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    for (const cta of ['Get Started Free', 'Start Pro Trial', 'Start Business Trial', 'Go Supersize']) {
      await expect(page.getByText(cta).first()).toBeVisible();
    }
  });

  // -- Comparison table ----------------------------------------------------

  test('comparison table has expected competitor columns', async ({ page }) => {
    const table = page.locator('table').first();
    await table.scrollIntoViewIfNeeded();
    await expect(table).toBeVisible();

    for (const col of ['Feature', 'WorkOS', 'Pangea', 'Retraced', 'Custom Build']) {
      await expect(table.getByText(col)).toBeVisible();
    }
  });

  // -- Footer --------------------------------------------------------------

  test('footer shows copyright and license', async ({ page }) => {
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('2026 AuditKit');
    await expect(footer).toContainText('AGPLv3');
  });

  // -- Images & screenshots ------------------------------------------------

  test('no broken images on homepage', async ({ page }) => {
    await page.waitForLoadState('load');
    await assertNoBrokenImages(page);
  });

  test('screenshot — marketing-homepage', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await argosScreenshot(page, 'marketing-homepage', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});

// ==========================================================================
// Docs Page
// ==========================================================================

test.describe('Marketing — Docs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs', { waitUntil: 'networkidle' });
  });

  test('docs heading is visible', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Documentation');
  });

  test('nav links include Home, Blog, Dashboard', async ({ page }) => {
    const nav = page.locator('nav').first();
    for (const label of ['Home', 'Blog', 'Dashboard']) {
      await expect(nav.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('sidebar sections are present', async ({ page }) => {
    const sidebar = page.locator('aside');
    if (await sidebar.isVisible()) {
      for (const section of [
        'Quick Start',
        'SDK Reference',
        'Framework Integrations',
        'React Viewer',
        'API Reference',
        'Authentication',
        'Event Schema',
      ]) {
        await expect(sidebar.getByText(section, { exact: true })).toBeVisible();
      }
    }
  });

  test('code examples are displayed', async ({ page }) => {
    const codeBlocks = page.locator('pre');
    const count = await codeBlocks.count();
    expect(count).toBeGreaterThan(0);
    await expect(codeBlocks.first()).toContainText('npm install @auditkit/sdk');
  });

  test('sidebar anchor navigation works', async ({ page }) => {
    const sidebar = page.locator('aside');
    if (await sidebar.isVisible()) {
      await sidebar.getByText('SDK Reference', { exact: true }).click();
      await expect(page).toHaveURL(/.*#sdk-reference/);
    }
  });

  test('screenshot — marketing-docs', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await argosScreenshot(page, 'marketing-docs', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});

// ==========================================================================
// Blog Index
// ==========================================================================

test.describe('Marketing — Blog Index', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' });
  });

  test('blog heading is visible', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Blog');
  });

  test('at least one blog post card is visible', async ({ page }) => {
    const cards = page.locator('a[href^="/blog/"]');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('blog card displays title and description', async ({ page }) => {
    const firstCard = page.locator('a[href^="/blog/"]').first();
    await expect(firstCard.locator('h2')).toBeVisible();
    await expect(firstCard.locator('p').first()).toBeVisible();
  });

  test('clicking a post navigates to /blog/[slug]', async ({ page }) => {
    const firstCard = page.locator('a[href^="/blog/"]').first();
    const href = await firstCard.getAttribute('href');
    expect(href).toBeTruthy();
    await firstCard.click();
    await expect(page).toHaveURL(/\/blog\/.+/);
  });

  test('screenshot — marketing-blog-index', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await argosScreenshot(page, 'marketing-blog-index', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});

// ==========================================================================
// Blog Post
// ==========================================================================

test.describe('Marketing — Blog Post', () => {
  test('post renders with article content', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' });
    const firstCard = page.locator('a[href^="/blog/"]').first();
    const expectedTitle = await firstCard.locator('h2').innerText();
    await firstCard.click();
    await expect(page).toHaveURL(/\/blog\/.+/);

    const postTitle = page.locator('article h1');
    await expect(postTitle).toBeVisible();
    await expect(postTitle).toContainText(expectedTitle);

    const content = page.locator('article .prose');
    await expect(content).toBeVisible();
  });

  test('breadcrumb includes Blog link back to /blog', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' });
    await page.locator('a[href^="/blog/"]').first().click();
    await expect(page).toHaveURL(/\/blog\/.+/);

    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.getByText('Home')).toBeVisible();
    await expect(breadcrumb.getByText('Blog')).toBeVisible();

    await breadcrumb.getByText('Blog').click();
    await expect(page).toHaveURL(/\/blog$/);
  });

  test('related articles section is visible', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' });
    await page.locator('a[href^="/blog/"]').first().click();
    await expect(page).toHaveURL(/\/blog\/.+/);

    const related = page.getByText('Related Articles');
    await related.scrollIntoViewIfNeeded();
    await expect(related).toBeVisible();
  });

  test('screenshot — marketing-blog-post', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' });
    await page.locator('a[href^="/blog/"]').first().click();
    await expect(page).toHaveURL(/\/blog\/.+/);
    await page.waitForLoadState('networkidle');
    await argosScreenshot(page, 'marketing-blog-post', {
      viewports: ['macbook-16', 'iphone-x'],
    });
  });
});
