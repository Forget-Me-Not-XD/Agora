// ========== Imports: ==========
import type { TokenPair } from '@/lib/types';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

/**
 * Ruil 'n refresh token vir 'n vars token-paar by die backend in.
 *
 * Returns null as die token verwerp word (verval, geroteer, rekening gedeaktiveer) —
 * die oproeper moet dan die cookies verwyder en die gebruiker na /login stuur.
 */
export async function refreshTokenPair(refreshToken: string): Promise<TokenPair | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken }),
      cache:   'no-store',
    });

    if (!res.ok) return null;

    return (await res.json()) as TokenPair;
  } catch {
    // Backend onbereikbaar — behandel soos 'n mislukte refresh eerder as om die
    // gebruiker op 'n stukkende bladsy te los.
    return null;
  }
}
