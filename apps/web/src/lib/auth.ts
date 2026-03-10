/**
 * Auth helpers — the actual session token is now stored in an httpOnly cookie
 * set by the server. These helpers manage a non-httpOnly "logged_in" indicator
 * cookie so the client can check authentication state without accessing the
 * real token.
 */

export function setToken(_token: string): void {
  if (typeof window === 'undefined') return;
  // Set a non-httpOnly indicator cookie (the real session is in an httpOnly cookie set by the server)
  document.cookie = `logged_in=1; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
}

export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)logged_in=([^;]+)/);
  return match ? match[1] : null;
}

export function clearToken(): void {
  if (typeof document === 'undefined') return;
  document.cookie = 'logged_in=; path=/; max-age=0';
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
