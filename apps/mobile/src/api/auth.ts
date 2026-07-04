// ========== Imorts: ==========
import { apiClient, UserResponse } from './client'

export interface CreateUserPayload {
    name: string;
    surname: string;
    email: string;
    password: string;
    role: 'ADMIN' | 'DOSENT' | 'STUDENT' | 'GAS' | 'PHOTOGRAPHER';
    studyCenter: string;
}

export async function adminCreateUser(payload: CreateUserPayload): Promise <UserResponse> {
    return apiClient.post<UserResponse, CreateUserPayload>('/auth/admin/register', payload);
}