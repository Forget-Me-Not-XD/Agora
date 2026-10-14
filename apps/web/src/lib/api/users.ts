// ========== Imports: ==========
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// Mirror backend: UserTitle enumerator
export enum UserTitle {
    DR   = 'Dr.',
    PROF = 'Prof.',
    LEC  = 'Lec.',
    MNR  = 'Mnr.',
    MEV  = 'Mev.',
    MX   = 'Mx.',
    NONE = '',
}

// Mirror backend: UserTag enumerator
export type UserTag = 'FINANCE';

// Mirror backend: UserResponseDto
export interface UserResponseDto {
    id:          string;
    name:        string;
    surname:     string;
    email:       string;
    role:        string;
    studyCenter: string;
    isActive:    boolean;
    createdAt:   string;
    title:       string;
    tags:        UserTag[];
}

// Mirror backend: UpdateUserDto
export interface UpdateUserDto {
    name?:        string;
    surname?:     string;
    title?:       UserTitle;
    tags?:        UserTag[];
    role?:        string;
    studyCenter?: string;
    isActive?:    boolean;
}

export async function updateUser(id: string, payload: UpdateUserDto, token?: string): Promise<UserResponseDto> {
    const res = await fetch(`${BASE_URL}/api/v1/users/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body:  JSON.stringify(payload),
        cache: 'no-store',
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string | string[] };
        const msg  = body.message ?? res.statusText;
        throw new Error(typeof msg === 'string' ? msg : msg.join(', '));
    }

    return res.json() as Promise<UserResponseDto>;
}

export async function getUsers(token?: string): Promise<UserResponseDto[]> {
    const res = await fetch(`${BASE_URL}/api/v1/users/all`, {
        method: 'GET',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: 'no-store',
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string | string[] };
        const msg  = body.message ?? res.statusText;
        throw new Error(typeof msg === 'string' ? msg : msg.join(', '));
    }

    return res.json() as Promise<UserResponseDto[]>;
}

// GET /api/v1/users?tag=FINANCE&q=<soek> -- gebruikers met 'n gegewe tag, opsioneel gefilter op naam
export async function searchUsersByTag(tag: UserTag, q?: string, token?: string): Promise<UserResponseDto[]> {
    const params = new URLSearchParams({ tag });
    if (q && q.trim()) params.set('q', q.trim());

    const res = await fetch(`${BASE_URL}/api/v1/users?${params.toString()}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache:   'no-store',
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string | string[] };
        const msg  = body.message ?? res.statusText;
        throw new Error(typeof msg === 'string' ? msg : msg.join(', '));
    }

    return res.json() as Promise<UserResponseDto[]>;
}

// GET /api/v1/users?search=<teks> -- vrye-teks soek oor naam en van, vir die admin Gebruikers-bladsy
export async function searchUsers(search: string, token?: string): Promise<UserResponseDto[]> {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());

    const res = await fetch(`${BASE_URL}/api/v1/users?${params.toString()}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache:   'no-store',
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string | string[] };
        const msg  = body.message ?? res.statusText;
        throw new Error(typeof msg === 'string' ? msg : msg.join(', '));
    }

    return res.json() as Promise<UserResponseDto[]>;
}

// DELETE /api/v1/users/:id -- admin verwyder 'n ander gebruiker permanent (204 No Content)
export async function deleteUser(id: string, token?: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/v1/users/${id}`, {
        method:  'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache:   'no-store',
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string | string[] };
        const msg  = body.message ?? res.statusText;
        throw new Error(typeof msg === 'string' ? msg : msg.join(', '));
    }
}

// POST /api/v1/users/:id/reset-password -- admin herstel 'n gebruiker se wagwoord,
// die nuwe tydelike wagwoord kom eenmalig terug om vir die gebruiker oor te dra
export async function resetUserPassword(id: string, token?: string): Promise<string> {
    const res = await fetch(`${BASE_URL}/api/v1/users/${id}/reset-password`, {
        method:  'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache:   'no-store',
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string | string[] };
        const msg  = body.message ?? res.statusText;
        throw new Error(typeof msg === 'string' ? msg : msg.join(', '));
    }

    const data = await res.json() as { temporaryPassword: string };
    return data.temporaryPassword;
}

// DELETE /api/v1/users/me -- verwyder jou eie rekening (204 No Content)
export async function deleteAccount(token?: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/v1/users/me`, {
        method:  'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache:   'no-store',
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string | string[] };
        const msg  = body.message ?? res.statusText;
        throw new Error(typeof msg === 'string' ? msg : msg.join(', '));
    }
}

// GET /api/v1/users?ids=<id,id> -- gebruikers op ID opgelos, ongeag rol
export async function getUsersByIds(ids: string[], token?: string): Promise<UserResponseDto[]> {
    if (!ids.length) return [];
    const params = new URLSearchParams({ ids: ids.join(',') });

    const res = await fetch(`${BASE_URL}/api/v1/users?${params.toString()}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache:   'no-store',
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string | string[] };
        const msg  = body.message ?? res.statusText;
        throw new Error(typeof msg === 'string' ? msg : msg.join(', '));
    }

    return res.json() as Promise<UserResponseDto[]>;
}