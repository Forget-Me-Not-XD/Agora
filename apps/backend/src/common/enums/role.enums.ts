/**
 * RBAC roles supported by the system.
 *
 * ADMIN  — Full system access (system administrators)
 * DOSENT — Lecturers; can manage their own events only
 * GAS    — Guests/students; can RSVP and check in
 */

export enum Role {
    ADMIN = 'ADMIN',
    DOSENT = 'DOSENT',
    GAS = 'GAS',
}