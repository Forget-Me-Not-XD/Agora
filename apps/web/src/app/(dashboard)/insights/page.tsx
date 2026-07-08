import { AlertCircle, Users, TrendingUp, CheckCircle, Calendar } from 'lucide-react';
import { canViewInsights } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/get-current-user';
import { getEvents, type Event } from '@/lib/api/events';
import { formatDateShort } from '@/lib/format-date';
import InfoModal from '@/components/InfoModal';
import ExportCsvButton from '@/components/ExportCsvButton';
import PredictedAttendanceCard from '@/components/PredictedAttendanceCard';

const TYPE_LABELS: Record<string, string> = {
    public: 'Publiek',
    internal_student: 'Intern - Student',
    private: 'Privaat',
    department: 'Departement',
};

const TYPE_COLORS: Record<string, string> = {
    public: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    internal_student: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    private: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    department: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

function attendanceColors(rate: number) {
    if (rate >= 80) return { pill: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', bar: 'bg-green-500' };
    if (rate >= 50) return { pill: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', bar: 'bg-orange-400' };
    return { pill: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', bar: 'bg-red-500' };
}

// 'n Geleentheid is "verby" sodra sy einde (of, as daar geen einde is nie, sy begin) reeds verby is
function isEventPast(event: Event): boolean {
    const now = Date.now();
    const start = new Date(event.date).getTime();
    const end = event.endDate ? new Date(event.endDate).getTime() : start;
    return now > end;
}

export default async function InsightsPage() {
    const user = getCurrentUser();

    if (!canViewInsights(user.role)) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center py-24">
                <AlertCircle size={48} className="text-[var(--color-red)] mb-4" />
                <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">Toegang Geweier</h2>
                <p className="text-sm text-[var(--color-text-subtle)]">
                    Jy het nie toegang tot KI Insigte nie.
                </p>
            </div>
        );
    }

    const allEvents = await getEvents().catch(() => [] as Event[]);
    const relevantEvents = (user.role === 'ADMIN' ? allEvents : allEvents.filter((e) => e.createdBy === user.id))
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date));

    const completedEvents = relevantEvents.filter(isEventPast);
    const totalAttended = completedEvents.reduce((sum, e) => sum + e.confirmedAttendees, 0);
    const totalCapacity = completedEvents.reduce((sum, e) => sum + e.maxCapacity, 0);
    const overallRate = totalCapacity > 0 ? Math.round((totalAttended / totalCapacity) * 100) : 0;

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">KI Insigte</h1>
                    <p className="text-sm text-[var(--color-text-subtle)] mt-1">
                        {user.role === 'ADMIN'
                            ? 'Prestasie oorsig vir alle geleenthede'
                            : 'Prestasie oorsig vir jou geleenthede'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportCsvButton type="events-summary" />
                </div>
                <InfoModal title="Oor KI Insigte">
                    <p className="text-sm text-[var(--color-text-subtle)] leading-relaxed">
                        Hierdie bladsy wys hoe goed jou geleenthede presteer het op grond van
                        werklike bywoning teenoor kapasiteit.
                    </p>

                    <div className="space-y-3">
                        <InfoRow
                            label="Bywoning %"
                            body="Die aantal ingecheckte gaste teenoor die geleentheid se maksimum kapasiteit. Slegs beskikbaar vir geleenthede wat reeds plaasgevind het."
                        />
                    </div>

                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 space-y-1.5">
                        <p className="text-xs font-semibold text-[var(--color-text)]">Kleur kode — Bywoning</p>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-[var(--color-text-subtle)] flex items-center gap-2">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                                80% of meer — Uitstekend
                            </span>
                            <span className="text-xs text-[var(--color-text-subtle)] flex items-center gap-2">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400 shrink-0" />
                                50 – 79% — Redelik
                            </span>
                            <span className="text-xs text-[var(--color-text-subtle)] flex items-center gap-2">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                                Onder 50% — Lae opkoms
                            </span>
                        </div>
                    </div>
                </InfoModal>
            </div>
            {/* ── Predicted Attendance Card ── */}
            <PredictedAttendanceCard />
            {/* ── Summary KPI cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                    icon={<Users size={20} />}
                    iconBg="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    label="Totaal Bygewoon"
                    value={String(totalAttended)}
                    sub={`oor ${completedEvents.length} voltooide geleentheid${completedEvents.length !== 1 ? 'e' : ''}`}
                />
                <KpiCard
                    icon={<TrendingUp size={20} />}
                    iconBg="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    label="Gem. Bywoning"
                    value={`${overallRate}%`}
                    sub="teenoor kapasiteit"
                />
                <KpiCard
                    icon={<CheckCircle size={20} />}
                    iconBg="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                    label="Geleenthede Voltooi"
                    value={String(completedEvents.length)}
                    sub={`van ${relevantEvents.length} in totaal`}
                />
            </div>

            {/* ── Per-event cards ── */}
            <div className="space-y-3">
                <h2 className="text-base font-semibold text-[var(--color-text)]">
                    Per Geleentheid
                </h2>

                {relevantEvents.length === 0 ? (
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-10 text-center">
                        <p className="text-[var(--color-text-subtle)] text-sm">
                            Geen insigte beskikbaar nie.
                        </p>
                    </div>
                ) : (
                    relevantEvents.map((event) => {
                        const isPast = isEventPast(event);
                        const attendanceRate = event.maxCapacity > 0
                            ? Math.round((event.confirmedAttendees / event.maxCapacity) * 100)
                            : 0;
                        const colors = attendanceColors(attendanceRate);

                        return (
                            <div
                                key={event.id}
                                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden"
                            >
                                {/* Card header */}
                                <div className="px-5 pt-4 pb-3 border-b border-[var(--color-border)] flex flex-wrap items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">
                                            {event.title}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[event.type]}`}>
                                                {TYPE_LABELS[event.type]}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-[var(--color-text-subtle)]">
                                                <Calendar size={11} />
                                                {formatDateShort(event.date)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card body */}
                                <div className="px-5 py-4 space-y-4">
                                    {isPast ? (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-medium text-[var(--color-text-subtle)]">
                                                    Bywoning
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-[var(--color-text-subtle)]">
                                                        {event.confirmedAttendees} / {event.maxCapacity}
                                                    </span>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.pill}`}>
                                                        {attendanceRate}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${colors.bar}`}
                                                    style={{ width: `${attendanceRate}%` }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 py-1">
                                            <div className="w-8 h-8 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                                                <Calendar size={14} className="text-[var(--color-text-subtle)]" />
                                            </div>
                                            <p className="text-xs text-[var(--color-text-subtle)] leading-relaxed">
                                                Hierdie geleentheid het nog nie plaasgevind nie. Statistieke sal
                                                outomaties hier verskyn nadat dit plaasgevind het.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

/* ── Small sub-components ── */

function KpiCard({
    icon,
    iconBg,
    label,
    value,
    sub,
}: {
    icon: React.ReactNode;
    iconBg: string;
    label: string;
    value: string;
    sub: string;
}) {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${iconBg}`}>{icon}</div>
            <div className="min-w-0">
                <p className="text-xs text-[var(--color-text-subtle)] mb-0.5">{label}</p>
                <p className="text-2xl font-bold text-[var(--color-text)] leading-none">{value}</p>
                <p className="text-xs text-[var(--color-text-subtle)] mt-1 leading-snug">{sub}</p>
            </div>
        </div>
    );
}

function InfoRow({ label, body }: { label: string; body: string }) {
    return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
            <p className="text-xs font-semibold text-[var(--color-text)] mb-0.5">{label}</p>
            <p className="text-xs text-[var(--color-text-subtle)] leading-relaxed">{body}</p>
        </div>
    );
}