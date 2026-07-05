const AF_MONTHS_LONG = [
    'Januarie', 'Februarie', 'Maart', 'April', 'Mei', 'Junie',
    'Julie', 'Augustus', 'September', 'Oktober', 'November', 'Desember',
];

export const AF_MONTHS_SHORT = [
    'Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des',
];

export function formatDateShort(iso: string): string {
    const d = new Date(iso);
    return `${d.getDate()} ${AF_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateLong(iso: string): string {
    const d = new Date(iso);
    return `${d.getDate()} ${AF_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}, ${d.toTimeString().slice(0, 5)}`;
}
