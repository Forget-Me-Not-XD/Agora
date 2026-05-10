import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import type { MockEvent } from '@/lib/mock-data';

interface EventCardProps {
    event: MockEvent;
}

export const TYPE_LABELS: Record<string, string> = {
    public: 'Publiek',
    internal_student: 'Intern - Student',
    private: 'Privaat',
    department: 'Departement',
};

export const STATUS_LABELS: Record<string, string> = {
    upcoming: 'Aanstaande',
    ongoing: 'Aan die gang',
    past: 'Verby',
    cancelled: 'Gekanselleer',
};

export const STATUS_COLORS: Record<string, string> = {
    upcoming:  'bg-blue-600 text-white dark:bg-blue-500',
    ongoing:   'bg-emerald-600 text-white dark:bg-emerald-500',
    past:      'bg-slate-500 text-white dark:bg-slate-600',
    cancelled: 'bg-red-600 text-white dark:bg-red-500',
};

export const TYPE_COLORS: Record<string, string> = {
    public:          'bg-cyan-600 text-white dark:bg-cyan-500',
    internal_student:'bg-violet-600 text-white dark:bg-violet-500',
    private:         'bg-amber-500 text-white dark:bg-amber-500',
    department:      'bg-indigo-600 text-white dark:bg-indigo-500',
};

export default function EventCard({ event }: EventCardProps) {
    const fillPercentage = Math.round((event.registered / event.capacity) * 100);
    const isFull = fillPercentage >= 100;
    const isAlmostFull = fillPercentage >= 80 && !isFull;

    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden flex flex-col hover:shadow-md hover:border-[var(--color-primary)] transition-all duration-200">

            {/* Coloured top accent */}
            <div className={`h-1 w-full ${STATUS_COLORS[event.status]}`} />

            <div className="p-5 flex flex-col gap-3 flex-1">
                {/* Title + badges */}
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[var(--color-text)] leading-snug flex-1">
                        {event.title}
                    </h3>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[event.status]}`}>
                            {STATUS_LABELS[event.status]}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[event.type]}`}>
                            {TYPE_LABELS[event.type]}
                        </span>
                    </div>
                </div>

                {/* Description */}
                <p className="text-xs text-[var(--color-text-subtle)] line-clamp-2 leading-relaxed">
                    {event.description}
                </p>

                {/* Meta */}
                <div className="space-y-1.5 mt-auto">
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                        <Calendar size={12} className="shrink-0" />
                        <span>{event.date}</span>
                        <Clock size={12} className="ml-1 shrink-0" />
                        <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                        <Users size={12} className="shrink-0" />
                        <span>{event.registered} / {event.capacity} geregistreer</span>
                    </div>
                </div>

                {/* Capacity bar */}
                <div>
                    <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${
                                isFull ? 'bg-red-500' : isAlmostFull ? 'bg-amber-500' : 'bg-[var(--color-primary)]'
                            }`}
                            style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-[var(--color-text-subtle)]">{fillPercentage}% vol</p>
                        {isFull && <span className="text-xs font-semibold text-red-600 dark:text-red-400">Vol</span>}
                        {isAlmostFull && <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Byna vol</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
