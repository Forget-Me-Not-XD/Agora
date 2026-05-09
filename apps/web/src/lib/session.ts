import { cookies } from 'next/headers';
import type { UserResponse } from '@/lib/types';

const COOKIE_NAME = 'akademia_token';

/**
 * Read the JWT from the HttpOnly cookie.
 * Used in Server Components and Server Actions.
 */
export function getToken(): string | undefined {
  return cookies().get(COOKIE_NAME)?.value;
}

/**
 * Decode the user payload from the JWT without signature verification.
 * Full JWT verification happens on every NestJS API call.
 * Used in SSR Server Components to avoid an extra round-trip.
 */
export function getSession(): UserResponse | null {
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
