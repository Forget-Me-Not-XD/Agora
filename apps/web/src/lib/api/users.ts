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
}

// Mirror backend: UpdateUserDto
export interface UpdateUserDto {
    title?: UserTitle;
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