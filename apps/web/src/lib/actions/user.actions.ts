'use server';

// ========== Imports: ==========
import { updateUser, UserTitle } from '@/lib/api/users';
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