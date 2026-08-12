'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createUser, type CreateUserPayload } from '@/lib/api/auth';
import { deleteAccount } from '@/lib/api/users';
import type { TokenPair, LoginPayload, UserResponse } from '@/lib/types';
import { COOKIE_NAME, COOKIE_REFRESH_NAME, COOKIE_USER_NAME } from '@/lib/auth-cookies';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

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
  const cookieOpts = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path:     '/',
  };

  cookieStore.set(COOKIE_NAME, data.accessToken, { ...cookieOpts, maxAge: 60 * 15 });

  // Store the user profile returned by the backend so server components can
  // read name/surname/role without depending on what the JWT payload contains.
  if (data.user) {
    cookieStore.set(COOKIE_USER_NAME, JSON.stringify(data.user), {
      ...cookieOpts,
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
    });
  }

  if (data.refreshToken) {
    cookieStore.set(COOKIE_REFRESH_NAME, data.refreshToken, {
      ...cookieOpts,
      ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
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
  role:        'GAS' | 'STUDENT';
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

  const tokenPair: TokenPair = {
    accessToken,
    refreshToken,
    expiresIn: 60 * 15,
    tokenType: 'Bearer',
    user,
  };

  setAuthCookies(cookies(), tokenPair, true);
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
  cookieStore.delete(COOKIE_USER_NAME);
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

  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(COOKIE_REFRESH_NAME);
  cookieStore.delete(COOKIE_USER_NAME);
  redirect('/login?deleted=true');
}