// ========== Imports: ==========
import type { TokenPair } from '@/lib/types';

export const COOKIE_NAME         = 'akademia_token';
export const COOKIE_REFRESH_NAME = 'akademia_refresh_token';
export const COOKIE_USER_NAME    = 'akademia_user';
export const COOKIE_REMEMBER_NAME = 'akademia_remember';
export const COOKIE_REFRESH_GUARD = 'akademia_refresh_guard';
// Sessie-cookie sonder persoonlike data. Dit wys net dat iemand hier aangemeld was, sodat die
// middleware "jou sessie het verstryk" kan wys eerder as om stilweg na /login te stuur.
export const COOKIE_SESSION_HINT  = 'akademia_had_session';

/**
 * Hoe lank die middleware en /api/auth/clear na 'n refresh-poging wag voordat hulle weer
 * probeer. Dit keer 'n redirect-lus as die nuwe cookies nie gestel kon word nie, en gee 'n
 * besige backend 'n blaaskans.
 */
export const REFRESH_GUARD_SECONDS = 10;

/**
 * Die access cookie verval soveel sekondes voor die JWT self. Die middleware sien dan reeds
 * geen token nie en refresh, eerder as om 'n token wat amper verval na die backend te stuur.
 */
const ACCESS_COOKIE_SKEW_SECONDS = 30;

/**
 * Leeftye vir wanneer die backend nie expiresIn of refreshExpiresIn saamstuur nie (bv. by
 * SSO-aanmelding). Hou dit gelyk aan JWT_ACCESS_EXPIRY en JWT_REFRESH_EXPIRY in die backend.
 */
export const DEFAULT_ACCESS_EXPIRY  = 60 * 15;          // JWT_ACCESS_EXPIRY=15m
export const DEFAULT_REFRESH_EXPIRY = 60 * 60 * 24 * 7; // JWT_REFRESH_EXPIRY=7d

interface CookieOptions {
  httpOnly: boolean;
  secure:   boolean;
  sameSite: 'lax';
  path:     string;
  maxAge?:  number;
}

/**
 * Wat `cookies()` (next/headers) en `NextResponse.cookies` albei het, sodat server actions
 * en route handlers dieselfde funksies kan gebruik.
 */
export interface CookieWriter {
  set(name: string, value: string, options?: CookieOptions): unknown;
  delete(name: string): unknown;
}

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
  };
}

/**
 * Stel die auth cookies uit 'n token-paar.
 *
 * Albei soorte sessies kry 'n refresh cookie. Hoe lank die refresh token hou, besluit die
 * backend op grond van die rememberMe wat by aanmelding gestuur is:
 * onthou my       → tot 7 dae na aanmelding, ook as die blaaier intussen toe was.
 * sonder onthou my → net 15 min. Die heartbeat hernu dit net as die gebruiker iets doen,
 *                    so na ~15 min sonder aktiwiteit verval die sessie.
 *
 * Die rememberMe-parameter hier stel net die akademia_remember cookie. Die refresh-, user- en
 * remember cookies kry refreshExpiresIn as maxAge, sodat hulle saam met die token verval.
 */
export function setAuthCookies(
  cookieStore: CookieWriter,
  data: TokenPair,
  rememberMe = false,
): void {
  const opts = baseOptions();

  const accessSeconds = data.expiresIn ?? DEFAULT_ACCESS_EXPIRY;
  const refreshMaxAge = data.refreshExpiresIn ?? DEFAULT_REFRESH_EXPIRY;

  const accessMaxAge = Math.max(accessSeconds - ACCESS_COOKIE_SKEW_SECONDS, 30);

  cookieStore.set(COOKIE_NAME, data.accessToken, { ...opts, maxAge: accessMaxAge });

  if (data.user) {
    setUserCookie(cookieStore, data.user, refreshMaxAge);
  }

  cookieStore.set(COOKIE_SESSION_HINT, '1', opts);

  if (data.refreshToken) {
    cookieStore.set(COOKIE_REFRESH_NAME, data.refreshToken, { ...opts, maxAge: refreshMaxAge });
  } else {
    // Geen nuwe refresh token nie, moenie 'n ou een van 'n vorige aanmelding laat staan nie
    cookieStore.delete(COOKIE_REFRESH_NAME);
  }

  if (rememberMe) {
    // Die refresh roete, heartbeat en SessionKeepAlive lees dit om te weet of dit onthou-my is
    cookieStore.set(COOKIE_REMEMBER_NAME, '1', { ...opts, maxAge: refreshMaxAge });
  } else {
    cookieStore.delete(COOKIE_REMEMBER_NAME);
  }
}

/**
 * Stoor die gebruiker se profiel sodat server components naam, van en rol kan lees, en die
 * middleware kan sien of die wagwoord verander moet word.
 *
 * Gee dit dieselfde leeftyd as die refresh token. Hou dit korter (bv. as sessie-cookie), kan
 * die sessie na 'n blaaier-herbegin nog geldig wees terwyl die naam en rol weg is.
 */
export function setUserCookie(cookieStore: CookieWriter, user: unknown, maxAge: number): void {
  cookieStore.set(COOKIE_USER_NAME, JSON.stringify(user), { ...baseOptions(), maxAge });
}

/**
 * Hoeveel sekondes 'n JWT nog geldig is, gelees uit sy payload.
 *
 * Die handtekening word nie nagegaan nie. Gebruik dit net om te besluit of iets nodig is
 * (bv. of die backend geroep moet word), nooit om toegang te gee nie. Dit gebruik atob eerder
 * as Buffer, want die middleware voer hierdie lêer in en loop in die edge runtime.
 */
export function secondsUntilExpiry(jwt: string | undefined): number | undefined {
  if (!jwt) return undefined;
  try {
    const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp     = JSON.parse(atob(payload)).exp;
    return typeof exp === 'number' ? exp - Math.floor(Date.now() / 1000) : undefined;
  } catch {
    return undefined;
  }
}

/** Hoe lank die huidige sessie nog hou, vir cookies wat buite setAuthCookies bygewerk word. */
export function remainingSessionSeconds(refreshToken?: string, accessToken?: string): number {
  const seconds = secondsUntilExpiry(refreshToken) ?? secondsUntilExpiry(accessToken) ?? DEFAULT_ACCESS_EXPIRY;
  return Math.max(seconds, 0);
}

/** Verwyder al die auth cookies, bv. by uitlog, as die rekening verwyder is of as die sessie verval het. */
export function clearAuthCookies(cookieStore: CookieWriter): void {
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(COOKIE_REFRESH_NAME);
  cookieStore.delete(COOKIE_USER_NAME);
  cookieStore.delete(COOKIE_REMEMBER_NAME);
  cookieStore.delete(COOKIE_REFRESH_GUARD);
  cookieStore.delete(COOKIE_SESSION_HINT);
}

/** Stel die guard cookie ná 'n refresh-poging (sien REFRESH_GUARD_SECONDS). */
export function setRefreshGuard(cookieStore: CookieWriter): void {
  cookieStore.set(COOKIE_REFRESH_GUARD, '1', {
    ...baseOptions(),
    maxAge: REFRESH_GUARD_SECONDS,
  });
}
