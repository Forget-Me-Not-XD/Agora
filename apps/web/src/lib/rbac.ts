import type { UserRole, UserTag } from './mock-data';

export function canCreateEvents(role: UserRole): boolean {
    return role === 'DOSENT' || role === 'ADMIN';
}

export function canViewInsights(role: UserRole): boolean {
    return role === 'DOSENT' || role === 'ADMIN';
}

export function hasFinanceTag(tags?: UserTag[]): boolean {
    return (tags ?? []).includes('FINANCE');
}

export function canViewBudget(role: UserRole, tags?: UserTag[]): boolean {
    return role === 'ADMIN' || hasFinanceTag(tags);
}

export function canManageUsers(role: UserRole): boolean {
    return role === 'ADMIN';
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

export const ALL_USER_TAGS: { value: UserTag; label: string }[] = [
    { value: 'FINANCE', label: 'Finansies' },
];

export function getTagLabel(tag: UserTag): string {
    return ALL_USER_TAGS.find((t) => t.value === tag)?.label ?? tag;
}

export function getTagBadgeColor(tag: UserTag): string {
    const colors: Record<UserTag, string> = {
        FINANCE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return colors[tag] ?? '';
}
