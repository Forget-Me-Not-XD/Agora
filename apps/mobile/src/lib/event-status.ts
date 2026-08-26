export type EventStatus = 'upcoming' | 'ongoing' | 'past';

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000; // 3 uur, wanneer 'n geleentheid geen endDate het nie

export function getEventStatus(event: { date: string, endDate?: string }) : EventStatus {
    const now = Date.now();
    const start = new Date(event.date).getTime();
    const end = event.endDate ? new Date(event.endDate).getTime() : start + DEFAULT_DURATION_MS;

    if (now < start) return 'upcoming';
    if (now > end) return 'past';
    return 'ongoing';
}

export const STATUS_LABELS: Record<EventStatus, string> = {
    upcoming: 'Aankomend',
    ongoing: 'Aan die gang',
    past: 'Voltooi',
};

export const STATUS_PILL_COLORS: Record<EventStatus, { bg: string; text: string }> = {
    upcoming: { bg: '#E0F2FE', text: '#0369A1' },
    ongoing:  { bg: '#D1FAE5', text: '#065F46' },
    past:     { bg: '#F3F4F6', text: '#4B5563' },
};

export const STATUS_PILL_COLORS_DARK: Record<EventStatus, { bg: string; text: string }> = {
    upcoming: { bg: '#0C4A6E', text: '#7DD3FC' },
    ongoing:  { bg: '#064E3B', text: '#6EE7B7' },
    past:     { bg: '#1F2937', text: '#9CA3AF' },
};

export const TYPE_LABELS: Record<string, string> = {
    public: 'Publiek',
    internal_student: 'Intern - Student',
    private: 'Privaat',
    department: 'Departement',
};

export const MONTHS_SHORT_AF = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
export const MONTHS_AF = [
    'Januarie', 'Februarie', 'Maart', 'April', 'Mei', 'Junie',
    'Julie', 'Augustus', 'September', 'Oktober', 'November', 'Desember',
];

// Regte datums is volledige ISO-datetimes, nie 'YYYY-MM-DD' nie — ontleed met `new Date`.
export function formatEventDate(iso: string): { day: string; month: string } {
    const d = new Date(iso);
    return { day: String(d.getDate()), month: MONTHS_SHORT_AF[d.getMonth()] };
}

export function formatFullDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getDate()} ${MONTHS_AF[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatEventTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('af-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function getStatusPillColors(status: EventStatus, IsDark: boolean): { bg: string, text: string} {
    return IsDark ? STATUS_PILL_COLORS_DARK[status] : STATUS_PILL_COLORS[status];
}