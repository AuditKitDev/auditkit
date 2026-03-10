import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/docs', '/pricing'];
const AUTH_PAGES = ['/login', '/signup', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const loggedIn = request.cookies.get('logged_in');

  // BUG-014: Redirect authenticated users away from auth pages
  if (loggedIn?.value && AUTH_PAGES.some(p => pathname === p)) {
    return NextResponse.redirect(new URL('/dashboard/overview', request.url));
  }

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname === p)) {
    return NextResponse.next();
  }

  // Check for logged_in cookie on dashboard routes
  if (!loggedIn?.value && pathname.startsWith('/dashboard')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
