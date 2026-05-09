import { create } from 'zustand';
import type { UserResponse } from '@/lib/types';

/**
 * Client-side auth state store.
 *
 * Mirrors apps/mobile/src/stores/auth.store.ts.
 * Key difference: the JWT itself lives in an HttpOnly cookie managed by
 * the server. This store only holds the decoded user object for the UI.
 */

interface AuthState {
  user: UserResponse | null;
  isLoading: boolean;
  error: string | null;

  setUser: (user: UserResponse | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),
  clearError: () => set({ error: null }),
  reset: () => set({ user: null, error: null, isLoading: false }),
}));
