import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useAuthStore } from '../stores/auth.store';

// 'n 401 met een van hierdie boodskappe beteken die gebruiker het net 'n verkeerde
// wagwoord ingetik -- dis geen aanduiding dat hul huidige sessie ongeldig is nie,
// so dit moet NIE die globale afmeld-aksie afvuur nie (anders sou 'n tik-fout op
// die wagwoord-verander-skerm die hele gebruiker onverwags uitskop).
const CREDENTIAL_CHECK_MESSAGES = ['Invalid credentials', 'Current password is incorrect'];

/**
 * Centralised HTTP client.
 * Single source of truth for all backend communication.
 *
 * - Reads API URL from app.json or EXPO_PUBLIC_API_URL
 * - Attaches JWT to every request via interceptor
 * - On a 401 it refreshes the session once and retries, and only logs out if the session is really dead
 */

const API_URL =
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    'http://10.0.2.2:3000/api/v1';

const ACCESS_TOKEN_KEY = 'akademia.accessToken';
const REFRESH_TOKEN_KEY = 'akademia.refreshToken';

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// ok = nuwe tokens, invalid = sessie is dood, unavailable = backend besig of geen netwerk nie
type RefreshOutcome = 'ok' | 'invalid' | 'unavailable';

class ApiClient {
    private readonly axios: AxiosInstance;

    // Net een refresh op 'n slag. Kry 'n paar versoeke gelyk 'n 401, wag hulle almal vir dieselfde refresh.
    private refreshPromise: Promise<RefreshOutcome> | null = null;

    constructor() {
        this.axios = axios.create({
            baseURL: API_URL,
            timeout: 30_000,
            headers: {'Content-Type': 'application/json'},
        });

        // ========== Request Intercept: attach JWT ==========
        this.axios.interceptors.request.use(async (config) => {
            const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        // ========== Response Interceptor: handle 401 ==========
        // A 401 from a protected endpoint usually just means the access token has
        // expired, so we first try to refresh the session and retry the request.
        // Only when the refresh token is rejected too is the session really dead.
        // We then call logout() rather than only clearing the stored tokens: that
        // resets the Zustand `user` state, so AppNavigator falls back to the Login
        // screen immediately instead of leaving the UI stuck on the current screen
        // with every later request failing.
        this.axios.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                if (error.response?.status === 401) {
                    const data = error.response.data as { message?: string } | undefined;
                    const isCredentialCheck = data?.message !== undefined
                        && CREDENTIAL_CHECK_MESSAGES.includes(data.message);

                    if (isCredentialCheck) {
                        await this.clearTokens();
                        return Promise.reject(error);
                    }

                    // Probeer eers refresh voordat ons die gebruiker uitlog. _retry merk die herhaalde
                    // versoek: kry dit weer 'n 401, log ons uit in plaas van weer te refresh.
                    const config = error.config as RetryableConfig | undefined;

                    if (config && !config._retry) {
                        const outcome = await this.refreshSession();

                        if (outcome === 'ok') {
                            config._retry = true;
                            return this.axios.request(config);
                        }

                        // Die backend is besig of die foon het nie netwerk nie. Moenie uitlog nie:
                        // hierdie versoek misluk net, en die volgende een probeer weer refresh.
                        if (outcome === 'unavailable') {
                            return Promise.reject(error);
                        }
                    }

                    await useAuthStore.getState().logout();
                }
                return Promise.reject(error);
            },
        );
    }

    // ========== Token Storage: ==========
    async setTokens(access: string, refresh: string): Promise<void> {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
    }

    async clearTokens(): Promise<void> {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }

    async hasToken(): Promise<boolean> {
        const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        return !!token;
    }

    /**
     * Ruil die refresh token vir nuwe tokens.
     * Gebruik gewone axios en nie this.axios nie, anders loop die interceptor weer as dit 'n 401 kry.
     * 'ok' as ons nuwe tokens het, 'invalid' as die gebruiker weer moet aanmeld, en
     * 'unavailable' as die backend besig is of die foon nie netwerk het nie.
     */
    private async refreshSession(): Promise<RefreshOutcome> {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = (async (): Promise<RefreshOutcome> => {
            try {
                const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
                if (!refreshToken) return 'invalid';

                const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
                    `${API_URL}/auth/refresh`,
                    { refreshToken },
                    { timeout: 30_000, headers: { 'Content-Type': 'application/json' } },
                );

                await this.setTokens(data.accessToken, data.refreshToken);
                return 'ok';
            } catch (err) {
                const status = (err as AxiosError).response?.status;

                // 429 is net die throttler. Ander 4xx beteken die token sal nooit werk nie.
                if (status !== undefined && status >= 400 && status < 500 && status !== 429) {
                    return 'invalid';
                }
                return 'unavailable';
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    // ========== HTTP verbs ==========
    async get<T>(path: string): Promise<T> {
        const { data } = await this.axios.get<T>(path);
        return data;
    }

    async post<T, B = unknown>(path: string, body?: B): Promise<T> {
        const { data } = await this.axios.post<T>(path, body);
        return data;
    }

    async patch<T, B = unknown>(path: string, body?: B): Promise<T> {
        const { data } = await this.axios.patch<T>(path, body);
        return data;
    }

    async delete<T>(path: string): Promise<T> {
        const { data } = await this.axios.delete<T>(path);
        return data;
    }

    async getImageDataUri(path: string): Promise<string> {
        const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

        const res = await fetch(`${API_URL}${path}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
            throw new Error(`[${res.status}] Kon nie die beeld laai nie`);
        }

        const blob = await res.blob();
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror   = () => reject(new Error('Kon nie die beeld lees nie'));
            reader.readAsDataURL(blob);
        });
    }
}

export const apiClient = new ApiClient();
export { API_URL };

// ========== Shared response types: ==========
export type UserTag = 'FINANCE';

export interface UserResponse {
    id: string;
    name: string;
    surname: string;
    email: string;
    role: 'ADMIN' | 'DOSENT' | 'STUDENT' | 'GAS' | 'PHOTOGRAPHER';
    studyCenter: string;
    isActive: boolean;
    createdAt: string;
    title: string;
    mustChangePassword: boolean;
    tags: UserTag[];
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
    user: UserResponse;
}