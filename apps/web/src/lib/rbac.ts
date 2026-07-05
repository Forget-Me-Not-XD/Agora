import type { MockEvent, MockUser, UserRole } from './mock-data';

export function canCreateEvents(role: UserRole): boolean {
    return role === 'DOSENT' || role === 'ADMIN';
}

export function canViewInsights(role: UserRole): boolean {
    return role === 'DOSENT' || role === 'ADMIN';
}

export function canViewBudget(role: UserRole): boolean {
    return role === 'DOSENT' || role === 'ADMIN';
}

export function canManageUsers(role: UserRole): boolean {
    return role === 'ADMIN';
}

export function filterEventsForUser(events: MockEvent[], user: MockUser): MockEvent[] {
    switch (user.role) {
        case 'ADMIN':
            return events;

        case 'DOSENT':
            return events.filter(
            (e) => e.status === 'upcoming' || e.status === 'ongoing' || e.createdBy === user.id
            );

        case 'STUDENT':
            return events.filter((e) => {
        const isActive = e.status === 'upcoming' || e.status === 'ongoing';
        const isVisible =
            e.type === 'public' ||
            e.type === 'internal_student' ||
            e.invitedUsers.includes(user.id);
        return isActive && isVisible;
        });

    case 'GAS':
        return events.filter((e) => {
        const isActive = e.status === 'upcoming' || e.status === 'ongoing';
        const isVisible = e.type === 'public' || e.invitedUsers.includes(user.id);
        return isActive && isVisible;
        });

    default:
        return [];
    }
}

export function getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
    ADMIN: 'Administrateur',
    DOSENT: 'Dosent',
    STUDENT: 'Student',
    GAS: 'GAS Lid',
    PHOTOGRAPHER: 'Fotograaf',
    };
    return labels[role] ?? role;
}

export function getRoleBadgeColor(role: UserRole): string {
    const colors: Record<UserRole, string> = {
    ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    DOSENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    STUDENT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    GAS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    PHOTOGRAPHER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return colors[role] ?? '';
}
