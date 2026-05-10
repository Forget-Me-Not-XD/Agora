import { cookies } from 'next/headers';
import type { UserResponse } from '@/lib/types';

const COOKIE_NAME      = 'akademia_token';
const COOKIE_USER_NAME = 'akademia_user';

export function getToken(): string | undefined {
  return cookies().get(COOKIE_NAME)?.value;
}

/**
 * Returns the logged-in user profile.
 * Prefers the dedicated user cookie (set at login from the backend response)
 * because the JWT payload may only carry minimal claims (sub, role).
 * Falls back to decoding the JWT payload if the user cookie is absent.
 */
export function getSession(): UserResponse | null {
  // Primary: explicit user cookie stored at login time
  const userCookie = cookies().get(COOKIE_USER_NAME)?.value;
  if (userCookie) {
    try {
      return JSON.parse(userCookie) as UserResponse;
    } catch { /* fall through */ }
  }

  // Fallback: decode the JWT payload
  const token = getToken();
  if (!token) return null;

  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const decoded = JSON.parse(Buffer.from(segment, 'base64url').toString('utf-8'));
    return decoded.user ?? decoded ?? null;
  } catch {
    return null;
  }
}
