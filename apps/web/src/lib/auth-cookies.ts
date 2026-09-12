// ========== Imports: ==========
import type { TokenPair } from '@/lib/types';

export const COOKIE_NAME         = 'akademia_token';
export const COOKIE_REFRESH_NAME = 'akademia_refresh_token';
export const COOKIE_USER_NAME    = 'akademia_user';
export const COOKIE_REMEMBER_NAME = 'akademia_remember';
export const COOKIE_REFRESH_GUARD = 'akademia_refresh_guard';

/** Hoe lank die guard cookie bly na 'n refresh, keer 'n redirect-lus as die nuwe cookie nie gestel word nie. */
export const REFRESH_GUARD_SECONDS = 10;

/** Refresh bietjie voor die access token verval sodat die backend nie 'n dooie token kry nie. */
const ACCESS_COOKIE_SKEW_SECONDS = 30;

/**
 * Default leeftye as die backend nie expiresIn / refreshExpiresIn stuur nie.
 * Moet dieselfde wees as JWT_ACCESS_EXPIRY en JWT_REFRESH_EXPIRY in die backend.
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
 * Stel die auth cookies uit 'n token-paar.
 *
 * rememberMe = false → geen refresh cookie nie, so die gebruiker word na 15 min uitgelog.
 * rememberMe = true  → refresh cookie wat hou tot 7 dae na aanmelding.
 */
export function setAuthCookies(
  cookieStore: CookieWriter,
  data: TokenPair,
  rememberMe = false,
): void {
  const opts = baseOptions();

  const accessSeconds = data.expiresIn ?? DEFAULT_ACCESS_EXPIRY;
  const refreshMaxAge = data.refreshExpiresIn ?? DEFAULT_REFRESH_EXPIRY;

  // Speling maak net sin as ons kan refresh, anders verloor die gebruiker net 30 sekondes
  const accessMaxAge = rememberMe
    ? Math.max(accessSeconds - ACCESS_COOKIE_SKEW_SECONDS, 30)
    : accessSeconds;

  cookieStore.set(COOKIE_NAME, data.accessToken, { ...opts, maxAge: accessMaxAge });

  if (data.user) {
    setUserCookie(cookieStore, data.user, rememberMe, refreshMaxAge);
  }

  if (rememberMe && data.refreshToken) {
    cookieStore.set(COOKIE_REFRESH_NAME, data.refreshToken, { ...opts, maxAge: refreshMaxAge });
    // Die refresh roete moet weet of die gebruiker onthou-my gekies het
    cookieStore.set(COOKIE_REMEMBER_NAME, '1', { ...opts, maxAge: refreshMaxAge });
  } else {
    // Verwyder ou cookies van 'n vorige onthou-my aanmelding, anders bly hulle steeds ingelog
    cookieStore.delete(COOKIE_REFRESH_NAME);
    cookieStore.delete(COOKIE_REMEMBER_NAME);
    cookieStore.delete(COOKIE_REFRESH_GUARD);
  }
}

/**
 * Stoor die gebruiker se profiel sodat server components naam/van/rol kan lees.
 *
 * Met onthou-my hou dit so lank soos die refresh cookie, anders is dit 'n session cookie.
 * Die session cookie bly langer as die access cookie, so die middleware kan sien die
 * sessie het verval en 'n boodskap op /login wys.
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

/** Verwyder al die auth cookies (uitlog, rekening verwyder of refresh het misluk). */
export function clearAuthCookies(cookieStore: CookieWriter): void {
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(COOKIE_REFRESH_NAME);
  cookieStore.delete(COOKIE_USER_NAME);
  cookieStore.delete(COOKIE_REMEMBER_NAME);
  cookieStore.delete(COOKIE_REFRESH_GUARD);
}

/** Stel die guard cookie na 'n refresh poging. */
export function setRefreshGuard(cookieStore: CookieWriter): void {
  cookieStore.set(COOKIE_REFRESH_GUARD, '1', {
    ...baseOptions(),
    maxAge: REFRESH_GUARD_SECONDS,
  });
}
