/**
 * Global setup: warm Next.js dev server compiler by visiting key pages
 * so first-load compilation doesn't cause test timeouts.
 */
async function globalSetup() {
  const baseURL = process.env.E2E_WEB_URL || 'http://localhost:3100';
  const pages = [
    '/',
    '/login',
    '/docs',
    '/blog',
    '/dashboard/overview',
    '/dashboard/events',
    '/dashboard/settings/team',
    '/dashboard/integrations/webhooks',
  ];

  for (const page of pages) {
    try {
      await fetch(`${baseURL}${page}`);
    } catch {
      // Server may not be ready yet, that's fine
    }
  }

  // Give the compiler a moment to finish
  await new Promise((r) => setTimeout(r, 2000));
}

export default globalSetup;
