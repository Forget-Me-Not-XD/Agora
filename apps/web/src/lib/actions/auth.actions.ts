'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { TokenPair, LoginPayload } from '@/lib/types';

const COOKIE_NAME         = 'akademia_token';
const COOKIE_REFRESH_NAME = 'akademia_refresh_token';
const API_URL             = process.env.API_URL ?? 'http://localhost:3000';

/**
 * Shared helper: stel beide access en refresh tokens as HttpOnly cookies.
 *
 * rememberMe = false → refresh token verval met die browser sessie (geen maxAge).
 * rememberMe = true  → refresh token hou vir 30 dae op die skyf.
 * The access token is altyd 15 min maak nie saak wat nie.
 */
function setAuthCookies(
  cookieStore: ReturnType<typeof cookies>,
  data: TokenPair,
  rememberMe = false,
) {
  cookieStore.set(COOKIE_NAME, data.accessToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 15, // 15 min – dieselfde as backend JWT_ACCESS_EXPIRY
  });

  if (data.refreshToken) {
    cookieStore.set(COOKIE_REFRESH_NAME, data.refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
      // rememberMe: hou 30 dae
      ...(rememberMe
        ? { maxAge: 60 * 60 * 24 * 30 }  // 30 dae
        : {}),                             // geen maxAge = session cookie
    });
  }
}

/**
 * Login server action.
 *
 * Roep NestJS POST /api/v1/auth/login, dan word die access token
 * gestel as 'n HttpOnly cookie — die browser sien nooit die raw JWT.
 *
 * Returns null as suksesvol (redirect na /dashboard server-side),
 * of 'n error string wat in die form gewys word.
 */
export async function loginAction(
  payload: LoginPayload & { rememberMe?: boolean },
): Promise<string | null> {
  const { rememberMe, ...rest } = payload;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(rest),
      cache:   'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg  = body?.message ?? 'Aanmelding het misluk.';
      return typeof msg === 'string' ? msg : (msg.join?.(', ') ?? 'Aanmelding het misluk.');
    }

    const data: TokenPair = await res.json();
    setAuthCookies(cookies(), data, rememberMe ?? false);
  } catch {
    return 'Kan nie aan die bediener koppel nie. Probeer later.';
  }

  // Redirect net nadat die cookie gestel is en buite die try/catch is
  redirect('/dashboard');
}

/**
 * Register server action.
 *
 * Roep NestJS POST /api/v1/auth/register, dan stel die cookies net soos
 * loginAction — registration auto-logs die gebruiker in.
 *
 * Returns null as suksesvol (redirect na /dashboard server-side),
 * of 'n error string wat in die form gewys word.
 */
export async function registerAction(payload: {
  name:        string;
  surname:     string;
  email:       string;
  password:    string;
  role:        'ADMIN' | 'DOSENT' | 'GAS';
  studyCenter: string;
}): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      cache:   'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg  = body?.message ?? 'Registrasie het misluk.';
      return typeof msg === 'string' ? msg : (msg.join?.(', ') ?? 'Registrasie het misluk.');
    }

    const data: TokenPair = await res.json();
    setAuthCookies(cookies(), data);
  } catch {
    return 'Kan nie aan die bediener koppel nie. Probeer later.';
  }

  redirect('/dashboard');
}

/**
 * Logout server action.
 * Verwyder die cookies en stuur gebruiker terug na login skerm.
 */
export async function logoutAction(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(COOKIE_REFRESH_NAME);
  redirect('/login');
}