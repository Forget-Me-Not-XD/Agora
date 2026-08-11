export type UserRole = 'ADMIN' | 'DOSENT' | 'STUDENT' | 'GAS' | 'PHOTOGRAPHER';
export type UserTag  = 'FINANCE';

export interface MockUser {
    id: string;
    name: string;
    surname: string;
    email: string;
    role: UserRole;
    studyCenter: string;
    isActive: boolean;
    title?: string;
    tags?: UserTag[];
}

// Fallback used only when there is no valid session (see get-current-user.ts) --
// middleware prevents unauthenticated access before this can be reached in practice.
export const MOCK_CURRENT_USER: MockUser = {
    id: 'user-1',
    name: 'Admin',
    surname: 'Gebruiker',
    email: 'admin@span.ac.za',
    role: 'ADMIN',
    studyCenter: 'Centurion - Leriba',
    isActive: true,
    tags: [],
};
