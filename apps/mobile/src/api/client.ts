import axios, { AxiosError, AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

/**
 * Centralised HTTP client.
 * Single source of truth for all backend communication.
 *
 * - Reads API URL from app.json or EXPO_PUBLIC_API_URL
 * - Attaches JWT to every request via interceptor
 * - Handles 401 by clearing tokens (refresh logic added in later commits)
 */

const API_URL =
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    'http://10.0.2.2:3000/api/v1';

const ACCESS_TOKEN_KEY = 'akademia.accessToken';
const REFRESH_TOKEN_KEY = 'akademia.refreshToken';

class ApiClient {
    private readonly axios: AxiosInstance;

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
        this.axios.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                if (error.response?.status === 401) {
                    await this.clearTokens();
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