import { test, expect } from '@playwright/test';
import { API_URL } from './helpers';

test.describe('Health Check', () => {
  test('GET /health returns status ok', async ({ request }) => {
    let res;
    try {
      res = await request.get(`${API_URL}/health`);
    } catch {
      throw new Error(
        `API server is not reachable at ${API_URL}. Start the server before running tests.`,
      );
    }

    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('version');
    expect(typeof body.version).toBe('string');
  });

  test('Unknown route returns 404 with standard error shape', async ({ request }) => {
    const res = await request.get(`${API_URL}/this-route-does-not-exist`);
    expect(res.status()).toBe(404);

    const body = await res.json();
    expect(body).toHaveProperty('code', 'NOT_FOUND');
    expect(body).toHaveProperty('message');
  });
});
