export const AF_MONTHS_LONG = [
    'Januarie', 'Februarie', 'Maart', 'April', 'Mei', 'Junie',
    'Julie', 'Augustus', 'September', 'Oktober', 'November', 'Desember',
];

export const AF_MONTHS_SHORT = [
    'Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des',
];

// Suid-Afrika het geen somertyd nie, so die verskil met UTC is die hele jaar deur twee uur
const SA_UTC_OFFSET = '+02:00';

/**
 * "2026-10-12" + "14:00" → "2026-10-12T14:00:00+02:00": 'n oomblik wat orals dieselfde beteken.
 * Sonder die verskil lees elke masjien dit in sy eie tydsone, en die backend se houer is UTC.
 */
export function toSastIso(date: string, time: string): string {
    return `${date}T${time}:00${SA_UTC_OFFSET}`;
}

export function formatDateShort(iso: string): string {
    const d = new Date(iso);
    return `${d.getDate()} ${AF_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateLong(iso: string): string {
    const d = new Date(iso);
    return `${d.getDate()} ${AF_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}, ${d.toTimeString().slice(0, 5)}`;
}
