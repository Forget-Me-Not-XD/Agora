// ========== Imports: ==========
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshTokenPair } from '@/lib/api/refresh';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { isRscRequest, reloadAsDocument } from '@/lib/rsc-request';
import {
  clearAuthCookies,
  setAuthCookies,
  setRefreshGuard,
  COOKIE_REFRESH_NAME,
  COOKIE_REMEMBER_NAME,
} from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

/**
 * Refresh-roete.
 *
 * Die middleware stuur die gebruiker hierheen as die access cookie weg is maar daar nog 'n
 * refresh cookie is, en /api/auth/clear doen dieselfde as die backend die access token verwerp.
 * Ons kry nuwe tokens, stel die cookies en stuur die gebruiker terug na die bladsy waarheen
 * hulle wou gaan.
 *
 * Dit loop in Node (nie edge nie), sodat API_URL in produksie tydens looptyd uit die container
 * gelees word.
 */
export async function GET(request: NextRequest) {
  const target      = safeRedirectPath(request.nextUrl.searchParams.get('from'));
  const refreshToken = request.cookies.get(COOKIE_REFRESH_NAME)?.value;

  if (!refreshToken) {
    return expireSession(request);
  }

  const result = await refreshTokenPair(refreshToken);

  // Het die refresh misluk en kom die versoek van Next se client router (bv. router.refresh()
  // via die middleware), laai ons eerder hierdie roete as 'n gewone bladsy van voor af. Anders
  // wys die adresbalk nog die ou URL (sien reloadAsDocument). Die cookies bly ook net so, sodat
  // daardie tweede versoek weer refresh probeer en dan die regte redirect kry.
  if (result.status !== 'ok' && isRscRequest(request)) {
    return reloadAsDocument();
  }

  if (result.status === 'invalid') {
    return expireSession(request);
  }

  if (result.status === 'unavailable') {
    return serverUnavailable(request, target);
  }

  const rememberMe = request.cookies.get(COOKIE_REMEMBER_NAME)?.value === '1';
  const response   = noStore(NextResponse.redirect(new URL(target, request.url)));

  setAuthCookies(response.cookies, result.tokens, rememberMe);
  setRefreshGuard(response.cookies);
  return response;
}

/**
 * Die sessie is dood (of daar was nooit 'n refresh cookie nie): verwyder die cookies en stuur
 * na /login. Ons stel die guard ook, net ingeval die cookies nie verwyder word nie en ons in 'n
 * redirect-lus tussen /login en hierdie roete beland.
 */
function expireSession(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login?error=session_expired', request.url);
  const response = noStore(NextResponse.redirect(loginUrl));
  clearAuthCookies(response.cookies);
  setRefreshGuard(response.cookies);
  return response;
}

/**
 * Die backend is besig of af. Die sessie is waarskynlik nog goed, so ons hou die cookies.
 *
 * Ons stuur nie na /login nie: daar sou die gebruiker probeer aanmeld, en dit help niks as die
 * sessie nog geldig is en die backend net besig is. /server-busy wag eerder 'n rukkie en stuur
 * hulle dan terug na waar hulle was. Die guard keer dat die middleware binne 10 s weer probeer.
 */
function serverUnavailable(request: NextRequest, target: string): NextResponse {
  const busyUrl = new URL('/server-busy', request.url);
  busyUrl.searchParams.set('from', target);
  const response = noStore(NextResponse.redirect(busyUrl));
  setRefreshGuard(response.cookies);
  return response;
}

function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
