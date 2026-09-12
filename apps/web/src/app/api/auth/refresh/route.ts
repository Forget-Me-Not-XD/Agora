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
 * Stilweg-hernu roete.
 *
 * Die middleware stuur 'n gebruiker hierheen wanneer die access cookie verval het
 * maar 'n refresh cookie nog bestaan. Ons ruil die refresh token vir 'n nuwe paar,
 * stel die cookies, en stuur die gebruiker terug na waar hulle op pad was.
 *
 * Loop in die Node runtime (nie edge nie), sodat process.env.API_URL by looptyd
 * gelees word — die waarde word in produksie deur die container ingespuit.
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

/** Mislukte hernuwing: gooi die sessie weg en stuur terug na die aanmeldskerm. */
function expireSession(loginUrl: URL): NextResponse {
  const response = noStore(NextResponse.redirect(loginUrl));
  clearAuthCookies(response.cookies);
  return response;
}

function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

/**
 * Slegs 'n pad binne hierdie webwerf mag deurgegee word — 'n volle URL of 'n
 * protokol-relatiewe pad ("//boos.example") sou 'n open redirect wees.
 */
function safeRedirectPath(from: string | null): string {
  if (!from || !from.startsWith('/') || from.startsWith('//')) {
    return '/dashboard';
  }
  return from;
}
