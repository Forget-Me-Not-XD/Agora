'use server';

// ========== Imports: ==========
import { cookies }                from 'next/headers';
import { revalidatePath }         from 'next/cache';
import {
    updateUser,
    UserTitle,
    searchUsersByTag,
    deleteUser,
    resetUserPassword,
    type UserTag,
    type UserResponseDto,
} from '@/lib/api/users';
import { getSession, getToken }    from '@/lib/session';
import { COOKIE_NAME, COOKIE_REFRESH_NAME, COOKIE_USER_NAME, remainingSessionSeconds, setUserCookie } from '@/lib/auth-cookies';
import type { UserResponse }      from '@/lib/types';

/**
 * Skryf die vars gestoorde velde terug na die akademia_user cookie.
 *
 * Server components (Header, Sidebar, /profile) lees hul gebruikersnaam uit
 * hierdie cookie, nie uit die JWT nie. Sonder hierdie sinchronisasie sou 'n
 * naamverandering eers na 'n nuwe aanmelding sigbaar wees.
 *
 * Die cookie hou so lank as wat die sessie nog oor het, soos met aanmelding.
 */
function syncUserCookie(patch: Partial<UserResponse>) {
    const cookieStore = cookies();
    const raw = cookieStore.get(COOKIE_USER_NAME)?.value;
    if (!raw) return;

    try {
        const user   = JSON.parse(raw) as UserResponse;
        const maxAge = remainingSessionSeconds(
            cookieStore.get(COOKIE_REFRESH_NAME)?.value,
            cookieStore.get(COOKIE_NAME)?.value,
        );
        setUserCookie(cookieStore, { ...user, ...patch }, maxAge);
    } catch {
        // Korrupte cookie -- die volgende aanmelding skryf dit oor.
    }
}

/**
 * Die ingetekende gebruiker se ID, soos die bediener dit sien.
 *
 * Die JWT-terugvalpad dra 'sub' eerder as 'id'
 */
function getSessionUserId(): string | undefined {
    const session = getSession() as (UserResponse & { sub?: string }) | null;
    return session?.id ?? session?.sub;
}

/**
 * Stoor die ingetekende gebruiker se eie profielvelde (naam, van en titel).
 *
 * Die ID kom uit die sessie en NIE uit die kliÃ«nt nie: 'n aksie wat 'n ID as
 * parameter aanvaar, laat die blaaier kies wie se rekening geskryf word. Die
 * backend keer wel 'n vreemde ID vir gewone gebruikers, maar 'n administrateur
 * sou so per ongeluk iemand anders se naam in sy eie sessie-cookie kon skryf.
 */
export async function updateProfileAction(
    profile: { name: string; surname: string; title: UserTitle },
): Promise<{ error?: string }> {
    const userId = getSessionUserId();
    if (!userId) return { error: 'Jou sessie het verval. Meld asseblief weer aan.' };

    const name    = profile.name.trim();
    const surname = profile.surname.trim();

    if (!name)    return { error: 'Naam mag nie leeg wees nie.' };
    if (!surname) return { error: 'Van mag nie leeg wees nie.' };

    try {
        const token   = getToken();
        const updated = await updateUser(userId, { name, surname, title: profile.title }, token);

        syncUserCookie({ name: updated.name, surname: updated.surname, title: updated.title });
        revalidatePath('/', 'layout');
        return {};
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Stoor het misluk.' };
    }
}

/**
 * ADMIN-pad: verander 'n ander gebruiker se naam vanaf die Gebruikers-skerm.
 *
 * Hier is die ID wel 'n parameter -- anders as updateProfileAction wys dit
 * doelbewus na iemand anders. Die backend bly die gesag: dit keer enigeen wat
 * nie die eienaar of 'n administrateur is nie met 'n 403.
 */
export async function updateUserNameAction(
    userId:  string,
    profile: { name: string; surname: string },
): Promise<{ error?: string; user?: UserResponseDto }> {
    const name    = profile.name.trim();
    const surname = profile.surname.trim();

    if (!name)    return { error: 'Naam mag nie leeg wees nie.' };
    if (!surname) return { error: 'Van mag nie leeg wees nie.' };

    try {
        const token   = getToken();
        const updated = await updateUser(userId, { name, surname }, token);

        // 'n Admin wat sy eie ry wysig, moet sy eie sessie-kas ook sien verander,
        // anders wys die kopstuk die ou naam tot die volgende aanmelding.
        if (userId === getSessionUserId()) {
            syncUserCookie({ name: updated.name, surname: updated.surname });
            revalidatePath('/', 'layout');
        }

        revalidatePath('/users');
        return { user: updated };
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

/**
 * ADMIN-pad: verander 'n gebruiker se rol, studiesentrum of aktief-status.
 *
 * Die backend keer hierdie velde vir enigeen wat nie ADMIN is nie met 'n 403 --
 * hierdie aksie bestaan net vir die admin-Gebruikers-bladsy.
 */
export async function updateUserAdminAction(
    userId: string,
    patch:  { role?: string; studyCenter?: string; isActive?: boolean },
): Promise<{ error?: string; user?: UserResponseDto }> {
    try {
        const token   = getToken();
        const updated = await updateUser(userId, patch, token);
        revalidatePath('/users');
        return { user: updated };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Stoor het misluk.' };
    }
}

// ADMIN-pad: verwyder 'n gebruiker permanent
export async function deleteUserAction(userId: string): Promise<{ error?: string }> {
    try {
        const token = getToken();
        await deleteUser(userId, token);
        revalidatePath('/users');
        return {};
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Verwydering het misluk.' };
    }
}

// ADMIN-pad: herstel 'n gebruiker se wagwoord na 'n nuwe tydelike wagwoord
export async function resetPasswordAction(
    userId: string,
): Promise<{ error?: string; temporaryPassword?: string }> {
    try {
        const token = getToken();
        const temporaryPassword = await resetUserPassword(userId, token);
        return { temporaryPassword };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Wagwoordherstel het misluk.' };
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