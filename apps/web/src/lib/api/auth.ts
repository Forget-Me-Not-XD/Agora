// ========== Imports: ==========
import type { UserResponseDto } from "./users";
import type { TokenPair } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface CreateUserPayload {
    name:           string;
    surname:        string;
    email:          string;
    password:       string;
    role:           'ADMIN' | 'DOSENT' | 'STUDENT' | 'GAS' | 'PHOTOGRAPHER';
    studyCenter:    string;
}

export interface ChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
    rememberMe?: boolean;
}

export async function createUser(payload: CreateUserPayload, token?: string): Promise<UserResponseDto> {
    const res = await fetch(`${BASE_URL}/api/v1/auth/admin/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as {message?: string | string[] };
        const msg = body.message ?? res.statusText;
        throw new Error(typeof msg === 'string' ? msg: msg.join(', '));
    }

    return res.json() as Promise<UserResponseDto>;
}

/**
 * Die backend meld ná 'n wagwoordverandering alle sessies uit, hierdie een ook, en gee 'n nuwe
 * token-paar terug wat die aanroeper moet stoor.
 */
export async function changePassword(payload: ChangePasswordPayload, token?: string): Promise<TokenPair> {
    const res = await fetch(`${BASE_URL}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string | string[] };
        const msg = body.message ?? res.statusText;
        throw new Error(typeof msg === 'string' ? msg : msg.join(', '));
    }

    return res.json() as Promise<TokenPair>;
}