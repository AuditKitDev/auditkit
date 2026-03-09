const TOKEN_KEY = 'auditkit_session';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  // Set cookie for middleware access (httpOnly not possible from client, but needed for redirect checks)
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `session=${token}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax${secure}`;
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = 'session=; path=/; max-age=0';
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
