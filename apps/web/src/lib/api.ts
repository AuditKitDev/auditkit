import { clearToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

  // BUG-019: Intercept 401 responses and redirect to login
  // Skip redirect for auth endpoints — 401 there means wrong credentials, not expired session
  if (res.status === 401 && !path.startsWith('/auth/')) {
    clearToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login?expired=1';
    }
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error: ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as unknown as T;
  }
  return res.json();
}

// BUG-004: The httpOnly session cookie is sent automatically via credentials: 'include'.
// BUG-005: Send X-Requested-With header for CSRF protection.
export function apiHeaders(): Record<string, string> {
  return { 'X-Requested-With': 'XMLHttpRequest' };
}
