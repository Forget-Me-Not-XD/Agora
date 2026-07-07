// ========== Imports: ==========
import { apiClient } from './client';
import type { UserResponse } from './client';

// Mirror backend: UserTitle enumeration:
export enum UserTitle {
    DR = 'Dr.',
    PROF = 'Prof.',
    LEC = 'Lec.',
    MNR = 'Mnr.',
    MEV = 'Mev.',
    MX = 'Mx.',
    NONE = '',
}

export interface UpdateUserDto {
    title ?: UserTitle;
}

// Update users's profile, Self or admin - enforced by the backend:
export async function updateUser(id: string, payload: UpdateUserDto): Promise<UserResponse> {
    return apiClient.patch<UserResponse>(`/users/${id}`, payload);
}