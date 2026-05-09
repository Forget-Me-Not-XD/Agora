'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { TokenPair, LoginPayload } from '@/lib/types';

const COOKIE_NAME = 'akademia_token';
const COOKIE_REFRESH_NAME = 'akademia_refresh_token';
const API_URL = process.env.API_URL ?? 'http://localhost:3000';

/** Shared helper: set both access and refresh tokens as HttpOnly cookies */
function setAuthCookies(cookieStore: ReturnType<typeof cookies>, data: TokenPair) {
  cookieStore.set(COOKIE_NAME, data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15, // 15 min – matches backend JWT_ACCESS_EXPIRY
  });

  if (data.refreshToken) {
    cookieStore.set(COOKIE_REFRESH_NAME, data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days – matches backend JWT_REFRESH_EXPIRY
    });
  }
}

/**
 * Login server action.
 *
 * Calls NestJS POST /api/v1/auth/login, then sets the access token
 * as an HttpOnly cookie — the browser never sees the raw JWT.
 *
 * Returns null on success (redirects to /dashboard server-side),
 * or an error string to display in the form.
 */
export async function loginAction(payload: LoginPayload): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.message ?? 'Aanmelding het misluk.';
      return typeof msg === 'string' ? msg : (msg.join?.(', ') ?? 'Aanmelding het misluk.');
    }

    const data: TokenPair = await res.json();
    setAuthCookies(cookies(), data);
  } catch {
    return 'Kan nie aan die bediener koppel nie. Probeer later.';
  }

  // Redirect only after cookie is set and outside the try/catch
  redirect('/dashboard');
}

/**
 * Register server action.
 *
 * Calls NestJS POST /api/v1/auth/register, then sets cookies just like
 * loginAction — registration auto-logs the user in.
 *
 * Returns null on success (redirects to /dashboard server-side),
 * or an error string to display in the form.
 */
export async function registerAction(payload: {
  name: string;
  surname: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'DOSENT' | 'GAS';
  studyCenter: string;
}): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.message ?? 'Registrasie het misluk.';
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
 * Clears both cookies and redirects to the login page.
 */
export async function logoutAction(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(COOKIE_REFRESH_NAME);
  redirect('/login');
}
