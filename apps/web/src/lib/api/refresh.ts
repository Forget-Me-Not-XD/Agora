// ========== Imports: ==========
import type { TokenPair } from '@/lib/types';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

/**
 * Vra die backend vir nuwe tokens met die refresh token.
 * Returns null as dit nie werk nie (token verval, rekening gedeaktiveer, ens.),
 * dan moet die cookies verwyder word en die gebruiker na /login toe.
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
    // Backend is af, hanteer dit maar soos 'n mislukte refresh
    return null;
  }
}
