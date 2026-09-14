'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createUser, changePassword, type CreateUserPayload, type ChangePasswordPayload } from '@/lib/api/auth';
import { deleteAccount } from '@/lib/api/users';
import type { TokenPair, LoginPayload, UserResponse } from '@/lib/types';
import {
  setAuthCookies,
  setUserCookie,
  clearAuthCookies,
  COOKIE_NAME,
  COOKIE_USER_NAME,
  COOKIE_REFRESH_NAME,
  DEFAULT_ACCESS_EXPIRY,
  remainingSessionSeconds,
} from '@/lib/auth-cookies';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

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
  const { rememberMe = false, ...rest } = payload;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      // Stuur altyd rememberMe, anders gee die backend 'n lang sessie (dis vir mobiel)
      body:    JSON.stringify({ ...rest, rememberMe }),
      cache:   'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg  = body?.message ?? 'Aanmelding het misluk.';
      return typeof msg === 'string' ? msg : (msg.join?.(', ') ?? 'Aanmelding het misluk.');
    }

    const data: TokenPair = await res.json();
    setAuthCookies(cookies(), data, rememberMe);
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
  role:        'GAS' | 'STUDENT';
  studyCenter: string;
}): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      // Registrasie het nie 'n onthou-my keuse nie, so dit is 'n gewone sessie
      body:    JSON.stringify({ ...payload, rememberMe: false }),
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
 * Admin create-user server action.
 * Roep NestJS POST /api/v1/auth/admin/register met die ingetekende admin se token.
 * Stel GEEN cookies nie - die admin bly ingeteken as homself, die nuwe gebruiker word nie outomaties aangemeld nie. 
 */
export async function adminCreateUserAction(
  payload: CreateUserPayload,
): Promise <{ error?: string }> {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;
    await createUser(payload, token);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Registrasie het misluk.' };
  }
}

/**
 * SSO callback server action.
 *
 * Die backend het reeds 'n token-pare uitgereik na 'n suksesvolle Google/Microsoft
 * aanmelding en die blaaier hierheen herlei met accessToken + refreshToken.
 * Ons haal die volledige gebruikersprofiel op (GET /api/v1/users/me) sodat die
 * akademia_user cookie presies dieselfde vorm het as 'n gewone wagwoord-aanmelding.
 */
export async function completeSsoLoginAction(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache:   'no-store',
  });

  if (!res.ok) {
    redirect('/login?error=sso_failed');
  }

  const user: UserResponse = await res.json();

  // SSO stuur nie die leeftye saam nie, so gebruik die defaults
  const tokenPair: TokenPair = {
    accessToken,
    refreshToken,
    expiresIn: DEFAULT_ACCESS_EXPIRY,
    tokenType: 'Bearer',
    user,
  };

  // SSO het nie 'n onthou-my opsie nie, so ons onthou hulle altyd
  setAuthCookies(cookies(), tokenPair, true);
  redirect('/dashboard');
}

/**
 * Change-password server action.
 * Roep NestJS POST /api/v1/auth/change-password met die ingetekende gebruiker se token.
 * Werk daarna die akademia_user cookie se mustChangePassword veld op na false, sodat die 
 * middleware die gebruiker onmiddelik na /dashboard toelaat sonder om weer aan te meld.
 * 
 * Returns null as sukselvol (redirect na /dashboard server-side),
 * of 'n error string wat in die form gewys word
 */
export async function changePasswordAction(
  payload: ChangePasswordPayload,
): Promise <string | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  try {
    await changePassword(payload, token);
  } catch(err) {
    return err instanceof Error ? err.message : 'Wagwoordverandering het misluk.';
  }

  const userCookie = cookieStore.get(COOKIE_USER_NAME)?.value;
  if (userCookie) {
    try {
      const user = JSON.parse(userCookie) as UserResponse;
      // Hou so lank as wat die sessie nog oor het, soos met aanmelding
      const maxAge = remainingSessionSeconds(cookieStore.get(COOKIE_REFRESH_NAME)?.value, token);
      setUserCookie(cookieStore, { ...user, mustChangePassword: false }, maxAge);
    } catch {
      // Malformed cookie - nothing to patch, next full login will fix the corrupted cookie
    }
  }

  redirect('/dashboard');
}

/**
 * Logout server action.
 * Verwyder die cookies en stuur gebruiker terug na login skerm.
 */
export async function logoutAction(): Promise<void> {
  clearAuthCookies(cookies());
  redirect('/login');
}

/**
 * Delete-account server action.
 *
 * Roep NestJS DELETE /api/v1/users/me — die backend kanselleer eers al die
 * gebruiker se aktiewe RSVP's (gee kapasiteit vry, verwyder gesinkroniseerde
 * kalender-inskrywings) en verwyder dan die rekening self uit die databasis.
 * Verwyder daarna dieselfde cookies as logoutAction, aangesien die sessie
 * sowieso nie meer geldig is nie.
 */
export async function deleteAccountAction(): Promise<{ error?: string }> {
  const token = cookies().get(COOKIE_NAME)?.value;

  try {
    await deleteAccount(token);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Kon nie rekening verwyder nie.' };
  }

  clearAuthCookies(cookies());
  redirect('/login?deleted=true');
}