'use server';

// ========== Imports: ==========
import { updateUser, UserTitle, searchUsersByTag, type UserTag, type UserResponseDto } from '@/lib/api/users';
import { getToken }              from '@/lib/session';

export async function updateUserTitleAction(
    userId: string,
    title:  UserTitle,
): Promise<{ error?: string }> {
    try {
        const token = getToken();
        await updateUser(userId, { title }, token);
        return {};
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Stoor het misluk.' };
    }
}

export async function updateUserTagsAction(
    userId: string,
    tags:   UserTag[],
): Promise<{ error?: string }> {
    try {
        const token = getToken();
        await updateUser(userId, { tags }, token);
        return {};
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Stoor het misluk.' };
    }
}

export async function searchFinanceUsersAction(
    q?: string,
): Promise<{ users?: UserResponseDto[]; error?: string }> {
    try {
        const token = getToken();
        const users = await searchUsersByTag('FINANCE', q, token);
        return { users };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Kon nie gebruikers soek nie.' };
    }
}
