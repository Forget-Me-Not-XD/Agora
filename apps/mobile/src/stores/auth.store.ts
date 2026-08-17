import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { apiClient, TokenPair, UserResponse } from '../api/client';

/**
 * Authentication state store.
 * Powered by Zustand — no providers, no context, just hooks.
 */

const BIOMETRICS_ENABLED_KEY = 'akademia.biometricsEnabled';

interface AuthState {
    user: UserResponse | null;
    isLoading: boolean;
    error: string | null;
    biometricsAvailable: boolean;
    biometricsEnabled: boolean;

    // Actions:
    initialize: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    register: (data: RegisterPayload) => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
    checkBiometricsAvailability: () => Promise<void>;
    enableBiometrics: () => Promise<boolean>;
    disableBiometrics: () => Promise<void>;
    loginWithBiometrics: () => Promise<void>;
}

export interface RegisterPayload {
name: string;
surname: string;
email: string;
password: string;
role: 'GAS' | 'STUDENT';
studyCenter: string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
user: null,
isLoading: false,
error: null,
biometricsAvailable: false,
biometricsEnabled: false,

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

/**
 * Called form the change password screen. The user is already logged in
 * (mustChangePassword just gates which screens the navigator shows) - this swaps the temp password
 * for a real one and clears the flag so the navigator switches back to the normal authenticated stack
 */
changePassword: async (currentPassword, newPassword) => {
  set({ isLoading: true, error: null });
  try {
    await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    const { user } = get();
    if (user) {
      set({ user: { ...user, mustChangePassword: false }, isLoading: false });
    } else {
      set({ isLoading: false });
    }
    }catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Password change failed';
      set ({ error: typeof msg === 'string' ? msg : msg.join?.(', ') ?? 'Password change failed', isLoading: false});
      throw err;
  }
},

logout: async () => {
  const { biometricsEnabled } = get();
  if (!biometricsEnabled) {
    await apiClient.clearTokens();
  }
  set({ user: null, error: null });
},

clearError: () => set({ error: null }),

/**
 * Checks whether this device even has a fingerprint/Face ID
 * sensor with something enrolled on it, and whether the user
 * has previously switched biometric login on in Settings.
 */
checkBiometricsAvailability: async () => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const storedFlag = await SecureStore.getItemAsync(BIOMETRICS_ENABLED_KEY);
    set({
      biometricsAvailable: hasHardware && isEnrolled,
      biometricsEnabled: storedFlag === 'true',
    });
  } catch {
    set({ biometricsAvailable: false, biometricsEnabled: false });
  }
},

/**
 * Called from the Settings toggle. Confirms the person in
 * front of the device with a biometric prompt before turning
 * the feature on — never enable blind.
 */
enableBiometrics: async () => {
  const { biometricsAvailable } = get();
  if (!biometricsAvailable) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Bevestig jou identiteit om biometrie te aktiveer',
    cancelLabel: 'Kanselleer',
    disableDeviceFallback: true,
  });

  if (!result.success) return false;

  await SecureStore.setItemAsync(BIOMETRICS_ENABLED_KEY, 'true');
  set({ biometricsEnabled: true });
  return true;
},

disableBiometrics: async () => {
  await SecureStore.deleteItemAsync(BIOMETRICS_ENABLED_KEY);
  set({ biometricsEnabled: false });
},

/**
 * Called from the Login screen's biometric button. Reuses the
 * JWT already saved by a previous password login — biometrics
 * only gates access to it, it never replaces the token itself.
 */
loginWithBiometrics: async () => {
  const hasToken = await apiClient.hasToken();
  if (!hasToken) {
    throw new Error('Geen gestoorde sessie nie. Meld eers aan met jou wagwoord.');
  }

  set({ isLoading: true, error: null });
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Meld aan by Agora',
      cancelLabel: 'Kanselleer',
      disableDeviceFallback: true,
    });

    if (!result.success) {
      throw new Error('Biometriese verifikasie het misluk');
    }

    const user = await apiClient.get<UserResponse>('/users/me');
    set({ user, isLoading: false });
  } catch (err: any) {
    set({ isLoading: false });
    if (err?.response) {
      throw new Error('Jou sessie het verval. Meld asseblief weer aan met jou wagwoord.');
    }
    throw err;
  }
},
}));
