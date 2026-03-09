import { getToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getSessionCookieToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)session=([^;]+)/);
  if (!match) return null;

  const token = decodeURIComponent(match[1]);
  return token.startsWith('st_') ? token : null;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...apiHeaders(),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error: ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as unknown as T;
  }
  return res.json();
}

// Dashboard requests must always use a real session token.
export function apiHeaders(): Record<string, string> {
  const sessionToken = getToken() || getSessionCookieToken();
  if (sessionToken) {
    return { Authorization: `Bearer ${sessionToken}` };
  }
  return {};
}
