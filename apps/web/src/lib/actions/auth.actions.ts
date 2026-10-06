'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createUser, changePassword, type CreateUserPayload, type ChangePasswordPayload } from '@/lib/api/auth';
import { deleteAccount } from '@/lib/api/users';
import type { TokenPair, LoginPayload, UserResponse } from '@/lib/types';
import {
  setAuthCookies,
  clearAuthCookies,
  COOKIE_NAME,
  COOKIE_REMEMBER_NAME,
  COOKIE_RETURN_TO,
  DEFAULT_ACCESS_EXPIRY,
} from '@/lib/auth-cookies';
import { clientIpHeaders } from '@/lib/client-ip';
import { postLoginRedirect } from '@/lib/safe-redirect';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

/**
 * Waarheen ons ná aanmelding stuur: die bladsy wat die middleware onthou het, of /dashboard.
 *
 * Moet die wagwoord eers verander word, laat ons die cookie staan. Die middleware stuur dan na
 * /change-password, en changePasswordAction gebruik dit daarna.
 */
function afterLoginPath(mustChangePassword = false): string {
  if (mustChangePassword) return '/dashboard';

  const cookieStore = cookies();
  const from = cookieStore.get(COOKIE_RETURN_TO)?.value;
  cookieStore.delete(COOKIE_RETURN_TO);
  return postLoginRedirect(from);
}

/**
 * Login server action.
 *
 * Roep NestJS POST /api/v1/auth/login, dan word die access token
 * gestel as 'n HttpOnly cookie — die browser sien nooit die raw JWT.
 *
 * Returns null as suksesvol (redirect server-side, sien afterLoginPath),
 * of 'n error string wat in die form gewys word.
 */
export async function loginAction(
  payload: LoginPayload & { rememberMe?: boolean },
): Promise<string | null> {
  const { rememberMe = false, ...rest } = payload;
  let data: TokenPair;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method:  'POST',
      // Die backend throttle login per IP, so dit moet die gebruiker se IP wees, nie die web-pod se een nie
      headers: { 'Content-Type': 'application/json', ...clientIpHeaders() },
      // Stuur altyd rememberMe, anders gee die backend 'n lang sessie (dis vir mobiel)
      body:    JSON.stringify({ ...rest, rememberMe }),
      cache:   'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg  = body?.message ?? 'Aanmelding het misluk.';
      return typeof msg === 'string' ? msg : (msg.join?.(', ') ?? 'Aanmelding het misluk.');
    }

    data = await res.json();
    setAuthCookies(cookies(), data, rememberMe);
  } catch {
    return 'Kan nie aan die bediener koppel nie. Probeer later.';
  }

  // Redirect net nadat die cookie gestel is en buite die try/catch is
  redirect(afterLoginPath(data.user?.mustChangePassword));
}

/**
 * Register server action.
 *
 * Roep NestJS POST /api/v1/auth/register, dan stel die cookies net soos
 * loginAction — registration auto-logs die gebruiker in.
 *
 * Returns null as suksesvol (redirect server-side, sien afterLoginPath),
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
      headers: { 'Content-Type': 'application/json', ...clientIpHeaders() },
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

  redirect(afterLoginPath());
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
  redirect(afterLoginPath(user.mustChangePassword));
}

/**
 * Change-password server action.
 * Roep NestJS POST /api/v1/auth/change-password met die ingetekende gebruiker se token.
 * Die backend meld daarmee alle sessies uit en gee 'n nuwe token-paar, wat ons stel sodat die
 * gebruiker op hierdie toestel aangemeld bly en die middleware hulle na /dashboard toelaat.
 * 
 * Returns null as sukselvol (redirect server-side, sien afterLoginPath),
 * of 'n error string wat in die form gewys word
 */
export async function changePasswordAction(
  payload: ChangePasswordPayload,
): Promise <string | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  // Behou die gebruiker se onthou-my keuse vir die nuwe sessie
  const rememberMe = Boolean(cookieStore.get(COOKIE_REMEMBER_NAME)?.value);

  try {
    // Die backend meld alle sessies uit, hierdie een ook, en gee 'n nuwe paar terug. Stel dit
    // soos by aanmelding; die nuwe akademia_user cookie het reeds mustChangePassword = false.
    const data = await changePassword({ ...payload, rememberMe }, token);
    setAuthCookies(cookieStore, data, rememberMe);
  } catch(err) {
    return err instanceof Error ? err.message : 'Wagwoordverandering het misluk.';
  }

  redirect(afterLoginPath());
}

/**
 * Forgot-password server action.
 * Roep NestJS POST /api/v1/auth/forgot-password. Die backend antwoord altyd dieselfde, of die
 * e-posadres bestaan of nie, so ons kan net "kyk in jou e-pos" wys.
 *
 * Returns null as suksesvol, of 'n error string wat in die form gewys word.
 */
export async function forgotPasswordAction(email: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
      method:  'POST',
      // Die backend throttle per e-pos en IP, so dit moet die gebruiker se IP wees, nie die web-pod se een nie
      headers: { 'Content-Type': 'application/json', ...clientIpHeaders() },
      body:    JSON.stringify({ email }),
      cache:   'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg  = body?.message ?? 'Kon nie die versoek stuur nie.';
      return typeof msg === 'string' ? msg : (msg.join?.(', ') ?? 'Kon nie die versoek stuur nie.');
    }
  } catch {
    return 'Kan nie aan die bediener koppel nie. Probeer later.';
  }

  return null;
}

/**
 * Reset-password server action.
 * Roep NestJS POST /api/v1/auth/reset-password met die token uit die e-posskakel. Die backend
 * meld daarmee alle sessies uit, so ons stuur na /login eerder as om iemand aan te meld.
 *
 * Returns 'n error string wat in die form gewys word; met sukses redirect dit na /login.
 */
export async function resetPasswordAction(payload: {
  token:       string;
  newPassword: string;
}): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...clientIpHeaders() },
      body:    JSON.stringify(payload),
      cache:   'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg  = body?.message ?? 'Wagwoordherstel het misluk.';
      return typeof msg === 'string' ? msg : (msg.join?.(', ') ?? 'Wagwoordherstel het misluk.');
    }
  } catch {
    return 'Kan nie aan die bediener koppel nie. Probeer later.';
  }

  // Maak enige ou sessie se cookies skoon; die backend het dit in elk geval reeds beëindig
  clearAuthCookies(cookies());
  redirect('/login?reset=true');
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