// Wie 'n geleentheid mag sien
export type AttendanceRole = 'GAS' | 'STUDENT' | 'DOSENT' | 'ADMIN' | 'PRIVATE';

// Opsies vir sigbaarheid
export const ATTENDANCE_OPTIONS: { value: AttendanceRole; label: string; desc: string }[] = [
    { value: 'GAS',     label: 'Publiek',       desc: 'Almal kan die geleentheid sien en bywoon' },
    { value: 'STUDENT', label: 'Student',       desc: 'Slegs studente en hoër kan die geleentheid sien en bywoon' },
    { value: 'PRIVATE', label: 'Privaat',       desc: 'Slegs persone wat genooi is kan die geleentheid bywoon' },
    { value: 'DOSENT',  label: 'Dosente',       desc: 'Dosente en hoër kan die geleentheid sien en bywoon' },
    { value: 'ADMIN',   label: 'Administrasie', desc: 'Slegs administrasie kan die geleentheid sien en bywoon' },
];