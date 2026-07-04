import type { Event, EventType } from '@/lib/api/events';

export const TYPE_LABELS: Record<EventType, string> = {
    public:           'Publiek',
    internal_student: 'Intern - Student',
    private:          'Privaat',
    department:       'Departement',
};

export const TYPE_COLORS: Record<EventType, string> = {
    public:           'bg-cyan-600 text-white dark:bg-cyan-500',
    internal_student: 'bg-violet-600 text-white dark:bg-violet-500',
    private:          'bg-amber-500 text-white dark:bg-amber-500',
    department:       'bg-indigo-600 text-white dark:bg-indigo-500',
};

export type EventStatus = 'upcoming' | 'ongoing' | 'past' | 'cancelled';

export const STATUS_LABELS: Record<EventStatus, string> = {
    upcoming:  'Aanstaande',
    ongoing:   'Aan die gang',
    past:      'Verby',
    cancelled: 'Gekanselleer',
};

export const STATUS_COLORS: Record<EventStatus, string> = {
    upcoming:  'bg-blue-600 text-white dark:bg-blue-500',
    ongoing:   'bg-emerald-600 text-white dark:bg-emerald-500',
    past:      'bg-slate-500 text-white dark:bg-slate-600',
    cancelled: 'bg-red-600 text-white dark:bg-red-500',
};

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

export function deriveStatus(event: Event): EventStatus {
    const start = new Date(event.date).getTime();
    const now   = Date.now();

    if (now < start) return 'upcoming';

    const end = event.endDate
        ? new Date(event.endDate).getTime()
        : start + THREE_HOURS_MS;

    return now <= end ? 'ongoing' : 'past';
}

export function eventDateKey(event: Event): string {
    const d = new Date(event.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function eventTime(event: Event): string {
    const d = new Date(event.date);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fillPercentage(event: Event): number {
    return event.maxCapacity > 0
        ? Math.round((event.confirmedAttendees / event.maxCapacity) * 100)
        : 0;
}