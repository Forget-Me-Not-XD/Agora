import { create } from 'zustand';
import { apiClient, TokenPair, UserResponse } from '../api/client';

/**
 * Authentication state store.
 * Powered by Zustand — no providers, no context, just hooks.
 */

interface AuthState {
    user: UserResponse | null;
    isLoading: boolean;
    error: string | null;

    // Actions:
    initialize: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    register: (data: RegisterPayload) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
}

export interface RegisterPayload {
name: string;
surname: string;
email: string;
password: string;
role: 'ADMIN' | 'DOSENT' | 'GAS';
studyCenter: string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
user: null,
isLoading: false,
error: null,

/**
 * Called once on app start. If we have a stored token,
 * fetch the user profile to populate the dashboard.
 */

initialize: async () => {
  set({ isLoading: true });
  try {
    const hasToken = await apiClient.hasToken();
    if (!hasToken) {
      set({ user: null, isLoading: false });
      return;
    }
    const user = await apiClient.get<UserResponse>('/users/me');
    set({ user, isLoading: false });
  } catch {
    // Token expired or invalid — clear it
    await apiClient.clearTokens();
    set({ user: null, isLoading: false });
  }
},

login: async (email, password) => {
  set({ isLoading: true, error: null });
  try {
    const result = await apiClient.post<TokenPair>('/auth/login', { email, password });
    await apiClient.setTokens(result.accessToken, result.refreshToken);
    set({ user: result.user, isLoading: false });
  } catch (err: any) {
    const msg = err?.response?.data?.message ?? 'Login failed';
    set({ error: typeof msg === 'string' ? msg : msg.join?.(', ') ?? 'Login failed', isLoading: false });
    throw err;
  }
},

register: async (payload) => {
  set({ isLoading: true, error: null });
  try {
    const result = await apiClient.post<TokenPair>('/auth/register', payload);
    await apiClient.setTokens(result.accessToken, result.refreshToken);
    set({ user: result.user, isLoading: false });
  } catch (err: any) {
    const msg = err?.response?.data?.message ?? 'Registration failed';
    set({ error: typeof msg === 'string' ? msg : msg.join?.(', ') ?? 'Registration failed', isLoading: false });
    throw err;
  }
},

logout: async () => {
  await apiClient.clearTokens();
  set({ user: null, error: null });
},

clearError: () => set({ error: null }),
}));