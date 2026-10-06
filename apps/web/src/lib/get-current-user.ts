import { redirect } from 'next/navigation';
import { getSession } from './session';
import type { MockUser } from './mock-data';

/**
 * Server-only helper. Reads the JWT cookie and returns a MockUser.
 * Redirects to /api/auth/clear if there is no valid session, which refreshes or clears the
 * auth cookies before /login, so the middleware cannot bounce back to the dashboard.
 */
export function getCurrentUser(): MockUser {
    const session = getSession();
    if (!session) redirect('/api/auth/clear');

    return {
        id: session.id ?? 'unknown',
        name: session.name ?? 'Gebruiker',
        surname: session.surname ?? '',
        email: session.email ?? '',
        role: (session.role as MockUser['role']) ?? 'GAS',
        studyCenter: session.studyCenter ?? 'Onbekend',
        isActive: session.isActive ?? true,
        title: session.title ?? '',
        tags: (session.tags as MockUser['tags']) ?? [],
    };
}
