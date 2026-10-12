import type { UserRole, UserTag } from './mock-data';
import type { Tone } from '@/components/ui/Pill';

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

export function getRoleTone(role: UserRole): Tone {
    const tones: Record<UserRole, Tone> = {
        ADMIN: 'red',
        DOSENT: 'blue',
        STUDENT: 'green',
        GAS: 'yellow',
        PHOTOGRAPHER: 'purple',
    };
    return tones[role] ?? 'neutral';
}

export const ALL_USER_TAGS: { value: UserTag; label: string }[] = [
    { value: 'FINANCE', label: 'Finansies' },
];

export function getTagLabel(tag: UserTag): string {
    return ALL_USER_TAGS.find((t) => t.value === tag)?.label ?? tag;
}

export function getTagTone(tag: UserTag): Tone {
    const tones: Record<UserTag, Tone> = {
        FINANCE: 'purple',
    };
    return tones[tag] ?? 'neutral';
}
