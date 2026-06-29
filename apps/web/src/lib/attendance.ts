// Wie 'n geleentheid mag sien
export type AttendanceRole = 'GAS' | 'STUDENT' | 'DOSENT' | 'ADMIN';

// Opsies vir sigbaarheid
export const ATTENDANCE_OPTIONS: { value: AttendanceRole; label: string }[] = [
    { value: 'GAS',     label: 'Almal (gaste, studente, dosente, admins)' },
    { value: 'STUDENT', label: 'Studente en hoër' },
    { value: 'DOSENT',  label: 'Dosente en admins' },
    { value: 'ADMIN',   label: 'Slegs admins' },
];