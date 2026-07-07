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

// Privaat is nie 'n rol-vlak nie — dis 'n aparte "genooi-net"-waarde
export const PRIVATE_ATTENDANCE = 'PRIVATE' as const;

// Alle geldige intendedAttendance-waardes (rol-vlakke + PRIVATE)
export type IntendedAttendance = Role | typeof PRIVATE_ATTENDANCE;
export const INTENDED_ATTENDANCE_VALUES: IntendedAttendance[] = [...ATTENDANCE_ROLES, PRIVATE_ATTENDANCE];

// Die intendedAttendance-waardes wat 'n gegewe rol mag sien (sy vlak en laer)
export function visibleAttendanceRoles(role: Role): Role[] {
    const level = ROLE_LEVEL[role];
    return ATTENDANCE_ROLES.filter((r) => ROLE_LEVEL[r] <= level);
}