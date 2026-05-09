import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't need authentication
const PUBLIC_PATHS = ['/login', '/register'];
const COOKIE_NAME  = 'akademia_token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')   ||
    pathname === '/favicon.ico'   ||
    pathname === '/';              // root redirects to /login via page.tsx

  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Not authenticated → send to login
  if (!isPublic && !token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // Already authenticated → skip login/register pages
  const isAuthPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
