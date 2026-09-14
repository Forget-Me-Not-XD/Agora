// ========== Imports: ==========
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshTokenPair } from '@/lib/api/refresh';
import {
  clearAuthCookies,
  setAuthCookies,
  COOKIE_NAME,
  COOKIE_REFRESH_NAME,
  COOKIE_REMEMBER_NAME,
  secondsUntilExpiry,
} from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

// Solank die access token nog meer as soveel sekondes oor het, roep ons nie die backend nie.
// Met onthou my hou ons die token net vars. Die heartbeat kom elke ~2 min, so 5 min is genoeg speling.
const REFRESH_WHEN_LEFT_REMEMBER = 5 * 60;
// Sonder onthou my skuif elke refresh die 15 min venster vorentoe. Met 12 min kom die uitlog
// tussen ~12 en ~17 min na die laaste aktiwiteit, naby genoeg aan 15, sonder dat ons elke
// heartbeat die backend hoef te roep.
const REFRESH_WHEN_LEFT_IDLE     = 12 * 60;

/**
 * Heartbeat-roete.
 *
 * SessionHeartbeat roep dit elke ~2 min (sonder onthou my net as die gebruiker intussen iets
 * gedoen het). As die access token amper verval, ruil ons die refresh token vir nuwe tokens,
 * wat 'n sessie sonder onthou my weer 15 min vorentoe skuif. Kom daar nie meer heartbeats nie,
 * verval dit vanself.
 *
 * Dit is 'n POST en die cookies is sameSite 'lax', so 'n ander webwerf kan dit nie namens die
 * gebruiker roep nie.
 *
 * 204 → sessie is verleng, of dit was nog nie nodig nie
 * 401 → sessie is dood, die kliënt stuur die gebruiker na /login
 * 503 → backend is besig of af, cookies bly net so en die volgende heartbeat probeer weer
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(COOKIE_REFRESH_NAME)?.value;

  if (!refreshToken) {
    // Elke sessie kry 'n refresh cookie wat saam met die refresh token verval, so as dit weg is,
    // is die sessie dood. Verwyder ook die oorblywende cookies (bv. akademia_had_session), anders
    // wys die middleware "sessie verstryk" weer by die volgende beskermde bladsy, al het die
    // gebruiker dit reeds gesien.
    const response = noStore(new NextResponse(null, { status: 401 }));
    clearAuthCookies(response.cookies);
    return response;
  }

  const rememberMe  = request.cookies.get(COOKIE_REMEMBER_NAME)?.value === '1';
  const accessLeft  = secondsUntilExpiry(request.cookies.get(COOKIE_NAME)?.value);
  const refreshWhen = rememberMe ? REFRESH_WHEN_LEFT_REMEMBER : REFRESH_WHEN_LEFT_IDLE;

  // Die token het nog genoeg tyd, so spaar die backend 'n oproep. Ons gaan nie die handtekening
  // na nie, maar dit maak nie saak nie: 'n vervalste exp laat net hierdie refresh oorslaan, en
  // die backend verwerp steeds 'n token wat regtig verval het.
  if (accessLeft !== undefined && accessLeft > refreshWhen) {
    return noStore(new NextResponse(null, { status: 204 }));
  }

  const result = await refreshTokenPair(refreshToken);

  if (result.status === 'invalid') {
    const response = noStore(new NextResponse(null, { status: 401 }));
    clearAuthCookies(response.cookies);
    return response;
  }

  if (result.status === 'unavailable') {
    return noStore(new NextResponse(null, { status: 503 }));
  }

  const response = noStore(new NextResponse(null, { status: 204 }));

  setAuthCookies(response.cookies, result.tokens, rememberMe);
  return response;
}

function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
