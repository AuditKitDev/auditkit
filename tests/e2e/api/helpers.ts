/**
 * Shared helpers for AuditKit E2E API tests.
 *
 * Every helper talks to the REAL running server -- no mocks, no stubs.
 */
import { type APIRequestContext } from '@playwright/test';

export const API_URL =
  process.env.E2E_API_URL || process.env.API_URL || 'http://localhost:3102';

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function uniqueEmail(): string {
  return `test_${uid()}@auditkit-e2e.local`;
}

export function uniqueName(): string {
  return `E2E User ${uid()}`;
}

export function uniqueTenantId(): string {
  return `tenant_${uid()}`;
}

export interface SignupResult {
  user: { id: string; email: string; name: string };
  token: string;
  refresh_token: string;
  project: { id: string; name: string; slug: string };
}

export interface LoginResult {
  user: { id: string; email: string; name: string };
  token: string;
  refresh_token: string;
  projects: Array<{ id: string; name: string; slug: string }>;
}

export async function signupUser(
  request: APIRequestContext,
  overrides: { email?: string; name?: string; password?: string } = {},
): Promise<SignupResult> {
  const email = overrides.email ?? uniqueEmail();
  const name = overrides.name ?? uniqueName();
  const password = overrides.password ?? 'Test1234!secure';

  const res = await request.post(`${API_URL}/auth/signup`, {
    data: { email, name, password },
  });

  if (res.status() !== 201) {
    const body = await res.text();
    throw new Error(`signupUser failed (${res.status()}): ${body}`);
  }

  return res.json() as Promise<SignupResult>;
}

export async function loginUser(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<LoginResult> {
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });

  if (res.status() !== 200) {
    const body = await res.text();
    throw new Error(`loginUser failed (${res.status()}): ${body}`);
  }

  return res.json() as Promise<LoginResult>;
}

export async function getApiKey(
  request: APIRequestContext,
  sessionToken: string,
  projectId: string,
): Promise<string> {
  const res = await request.post(`${API_URL}/dashboard/api-keys`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
    data: {
      project_id: projectId,
      name: `E2E Key ${uid()}`,
      environment: 'production',
      scopes: ['read', 'write'],
    },
  });

  if (res.status() !== 201) {
    const body = await res.text();
    throw new Error(`getApiKey failed (${res.status()}): ${body}`);
  }

  const json = (await res.json()) as { key: string };
  return json.key;
}

export interface AuthContext {
  sessionToken: string;
  refreshToken: string;
  apiKey: string;
  projectId: string;
  userId: string;
  email: string;
}

export async function createAuthenticatedContext(
  request: APIRequestContext,
): Promise<AuthContext> {
  const signup = await signupUser(request);
  const apiKey = await getApiKey(request, signup.token, signup.project.id);

  return {
    sessionToken: signup.token,
    refreshToken: signup.refresh_token,
    apiKey,
    projectId: signup.project.id,
    userId: signup.user.id,
    email: signup.user.email,
  };
}

export function buildEventPayload(
  tenantId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    action: 'document.created',
    actor: { id: 'user_123', type: 'user', name: 'Jane Doe', email: 'jane@example.com' },
    tenant_id: tenantId,
    severity: 'info',
    metadata: { source: 'e2e-test' },
    ...overrides,
  };
}

export function apiHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

export function sessionHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function assertServerReachable(request: APIRequestContext): Promise<void> {
  try {
    const res = await request.get(`${API_URL}/health`);
    if (!res.ok()) throw new Error('Health check failed');
  } catch {
    throw new Error(`API server is not reachable at ${API_URL}. Start the server before running tests.`);
  }
}
