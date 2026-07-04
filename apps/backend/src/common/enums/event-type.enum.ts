/**
 * Geleentheid-tipe
 * 
 * PUBLIC           - Publiek: oop vir almal
 * INTERNAL_STUDENT - Intern-Student: gerig op studente
 * PRIVATE          - Privaat: net vir genooides
 * DEPARTMENT       - Departement: gerig op dosente/admins
 */

export enum EventType {
    PUBLIC = 'public',
    INTERNAL_STUDENT = 'internal_student',
    PRIVATE = 'private',
    DEPARTMENT = 'department',
}