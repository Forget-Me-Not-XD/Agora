// ========== Imports: ==========
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshTokenPair } from '@/lib/api/refresh';
import {
  clearAuthCookies,
  setAuthCookies,
  setRefreshGuard,
  COOKIE_REFRESH_NAME,
  COOKIE_REMEMBER_NAME,
} from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

/**
 * Refresh roete.
 *
 * Die middleware stuur die gebruiker hierheen as die access cookie weg is maar daar nog
 * 'n refresh cookie is. Ons kry nuwe tokens, stel die cookies en stuur hulle terug na
 * die bladsy waarheen hulle wou gaan.
 *
 * Dit loop in Node (nie edge nie) sodat API_URL in produksie van die container af gelees word.
 */
export async function GET(request: NextRequest) {
  const target      = safeRedirectPath(request.nextUrl.searchParams.get('from'));
  const loginUrl    = new URL('/login?error=session_expired', request.url);
  const refreshToken = request.cookies.get(COOKIE_REFRESH_NAME)?.value;

  if (!refreshToken) {
    return expireSession(loginUrl);
  }

  const tokens = await refreshTokenPair(refreshToken);

  if (!tokens) {
    return expireSession(loginUrl);
  }

  const rememberMe = request.cookies.get(COOKIE_REMEMBER_NAME)?.value === '1';
  const response   = noStore(NextResponse.redirect(new URL(target, request.url)));

  setAuthCookies(response.cookies, tokens, rememberMe);
  setRefreshGuard(response.cookies);
  return response;
}

/**
 * Refresh het misluk, verwyder die cookies en stuur na /login.
 * Ons stel die guard hier ook, net ingeval die cookies nie weggaan nie en ons in 'n
 * redirect-lus tussen /login en hierdie roete beland.
 */
function expireSession(loginUrl: URL): NextResponse {
  const response = noStore(NextResponse.redirect(loginUrl));
  clearAuthCookies(response.cookies);
  setRefreshGuard(response.cookies);
  return response;
}

function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

/**
 * Laat net paaie op ons eie site toe. 'n Volle URL of "//iets.com" sou 'n open redirect wees.
 */
function safeRedirectPath(from: string | null): string {
  if (!from || !from.startsWith('/') || from.startsWith('//')) {
    return '/dashboard';
  }
  return from;
}
