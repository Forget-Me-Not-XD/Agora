// ========== Imports: ==========
import type { TokenPair } from '@/lib/types';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

// 'n Refresh is normaalweg vinnig. Sonder 'n limiet wag Node se fetch tot 300 s as die backend
// onder druk stadig is, en so lank hang die gebruiker se bladsy dan ook.
const REFRESH_TIMEOUT_MS = 5_000;

/**
 * ok          → nuwe tokens
 * invalid     → sessie is regtig dood (token verval, rekening gedeaktiveer of gesluit), log uit
 * unavailable → backend is besig of af (429, 5xx, netwerk), hou die sessie en probeer later weer
 */
export type RefreshResult =
  | { status: 'ok'; tokens: TokenPair }
  | { status: 'invalid' }
  | { status: 'unavailable' };

/** Vra die backend vir nuwe tokens met die refresh token. */
export async function refreshTokenPair(refreshToken: string): Promise<RefreshResult> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken }),
      cache:   'no-store',
      signal:  AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });

    if (res.ok) {
      return { status: 'ok', tokens: (await res.json()) as TokenPair };
    }

    // 429 is net die throttler. Enige ander 4xx (400 ongeldige versoek, 401, 403) beteken dat
    // hierdie token nie meer gaan werk nie. Sou ons dit as 'unavailable' hanteer, probeer ons vir altyd weer.
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      return { status: 'invalid' };
    }

    return { status: 'unavailable' };
  } catch {
    // Die backend is af of te stadig (timeout). Moenie die gebruiker daarvoor uitlog nie.
    return { status: 'unavailable' };
  }
}
