/**
 * RBAC roles supported by the system.
 *
 * ADMIN   — Full system access (system administrators)
 * DOSENT  — Lecturers; can manage their own events only
 * STUDENT — Students; can RSVP and check in
 * GAS     — Guests; can RSVP and check in
 */

export enum Role {
    ADMIN = 'ADMIN',
    DOSENT = 'DOSENT',
    STUDENT = 'STUDENT',
    GAS = 'GAS',
    PHOTOGRAPHER = 'PHOTOGRAPHER',
}