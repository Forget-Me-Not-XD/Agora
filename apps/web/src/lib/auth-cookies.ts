// ========== Imports: ==========
import type { TokenPair } from '@/lib/types';

export const COOKIE_NAME         = 'akademia_token';
export const COOKIE_REFRESH_NAME = 'akademia_refresh_token';
export const COOKIE_USER_NAME    = 'akademia_user';
export const COOKIE_REMEMBER_NAME = 'akademia_remember';
export const COOKIE_REFRESH_GUARD = 'akademia_refresh_guard';

/**
 * Hoe lank die guard cookie na 'n hernu-poging bly staan. Verhoed 'n herlei-lus
 * as die nuwe access cookie om een of ander rede nie by die blaaier land nie.
 */
export const REFRESH_GUARD_SECONDS = 10;

/**
 * Refresh a few seconds before the access token actually expires, so a request
 * that slips through the middleware never reaches the backend with a dead JWT.
 */
const ACCESS_COOKIE_SKEW_SECONDS = 30;

/** Fallback lifetime as die backend nie 'n expiresIn teruggee nie (15 min / 7 dae). */
const DEFAULT_ACCESS_EXPIRY  = 60 * 15;
const DEFAULT_REFRESH_EXPIRY = 60 * 60 * 24 * 7;

interface CookieOptions {
  httpOnly: boolean;
  secure:   boolean;
  sameSite: 'lax';
  path:     string;
  maxAge?:  number;
}

/**
 * Minimal shape shared by `cookies()` (next/headers) and `NextResponse.cookies`,
 * so server actions and route handlers can use the same helpers.
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
 * Stel access-, refresh-, user- en remember-cookies uit 'n token-paar.
 *
 * Die access cookie hou net so lank as die JWT self (min 'n paar sekondes speling).
 * Sodra dit verval, sien die middleware geen token nie en ruil die refresh token
 * vir 'n nuwe paar in — dis wat die sessie aan die lewe hou, nie die access cookie nie.
 *
 * rememberMe = false → refresh/user cookies verval saam met die blaaier-sessie.
 * rememberMe = true  → refresh/user cookies hou so lank as wat die refresh JWT geldig is.
 */
export function setAuthCookies(
  cookieStore: CookieWriter,
  data: TokenPair,
  rememberMe = false,
): void {
  const opts = baseOptions();

  const accessMaxAge = Math.max(
    (data.expiresIn ?? DEFAULT_ACCESS_EXPIRY) - ACCESS_COOKIE_SKEW_SECONDS,
    30,
  );
  const refreshMaxAge = data.refreshExpiresIn ?? DEFAULT_REFRESH_EXPIRY;

  // Persistent as "onthou my" gekies is, andersins 'n session cookie (geen maxAge).
  const persist = rememberMe ? { maxAge: refreshMaxAge } : {};

  cookieStore.set(COOKIE_NAME, data.accessToken, { ...opts, maxAge: accessMaxAge });

  if (data.user) {
    setUserCookie(cookieStore, data.user, rememberMe, refreshMaxAge);
  }

  if (data.refreshToken) {
    cookieStore.set(COOKIE_REFRESH_NAME, data.refreshToken, { ...opts, ...persist });
  }

  // Onthou die keuse self, anders weet die refresh-roete nie of die nuwe cookies
  // persistent of session cookies moet wees nie.
  if (rememberMe) {
    cookieStore.set(COOKIE_REMEMBER_NAME, '1', { ...opts, maxAge: refreshMaxAge });
  } else {
    cookieStore.delete(COOKIE_REMEMBER_NAME);
  }
}

/**
 * Stoor die gebruikersprofiel wat die backend teruggee, sodat server components
 * naam/van/rol kan lees sonder om op die JWT payload staat te maak.
 *
 * Behou dieselfde lewensduur as die refresh cookie: 'n onthoude sessie kry 'n
 * persistente cookie, 'n gewone aanmelding 'n session cookie.
 */
export function setUserCookie(
  cookieStore: CookieWriter,
  user: unknown,
  rememberMe: boolean,
  refreshMaxAge = DEFAULT_REFRESH_EXPIRY,
): void {
  cookieStore.set(COOKIE_USER_NAME, JSON.stringify(user), {
    ...baseOptions(),
    ...(rememberMe ? { maxAge: refreshMaxAge } : {}),
  });
}

/** Verwyder elke auth cookie — afmelding, verwyderde rekening, of 'n dooie refresh token. */
export function clearAuthCookies(cookieStore: CookieWriter): void {
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(COOKIE_REFRESH_NAME);
  cookieStore.delete(COOKIE_USER_NAME);
  cookieStore.delete(COOKIE_REMEMBER_NAME);
  cookieStore.delete(COOKIE_REFRESH_GUARD);
}

/** Merk dat 'n hernu-poging pas gebeur het — sien COOKIE_REFRESH_GUARD. */
export function setRefreshGuard(cookieStore: CookieWriter): void {
  cookieStore.set(COOKIE_REFRESH_GUARD, '1', {
    ...baseOptions(),
    maxAge: REFRESH_GUARD_SECONDS,
  });
}
