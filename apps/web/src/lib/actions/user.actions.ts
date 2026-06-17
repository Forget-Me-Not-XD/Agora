'use server';

// ========== Imports: ==========
import { updateUser, UserTitle } from '@/lib/api/users';

export async function updateUserTitleAction(
    userId: string,
    title:  UserTitle,
): Promise<{ error?: string }> {
    try {
        await updateUser(userId, { title });
        return {};
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Stoor het misluk.' };
    }
}