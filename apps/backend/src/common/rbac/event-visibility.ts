import { Role } from '../enums/role.enums';

/**
 * Rol-hierargie vir geleentheid-sigbaarheid (1 laagste, 4 hoogste)
 * 'n Gebruiker sien 'n geleentheid as sy vlak >= die geleentheid se intendedAttendance-vlak
 * PHOTOGRAPHER kry vlak 2, en geleenthede waar hulle toegewys is
 */

export const ROLE_LEVEL: Record<Role, number> = {
    [Role.GAS]:          1,
    [Role.STUDENT]:      2,
    [Role.DOSENT]:       3,
    [Role.ADMIN]:        4,
    [Role.PHOTOGRAPHER]: 2,
};

// Geldige intendedAttendance-waardes (sluit PHOTOGRAPHER uit)
export const ATTENDANCE_ROLES: Role[] = [Role.GAS, Role.STUDENT, Role.DOSENT, Role.ADMIN];

// Die intendedAttendance-waardes wat 'n gegewe rol mag sien (sy vlak en laer)
export function visibleAttendanceRoles(role: Role): Role[] {
    const level = ROLE_LEVEL[role];
    return ATTENDANCE_ROLES.filter((r) => ROLE_LEVEL[r] <= level);
}