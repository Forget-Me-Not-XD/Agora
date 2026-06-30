import { AlertCircle, Star, Users, TrendingUp, Calendar, MessageSquare } from 'lucide-react';
import { MOCK_EVENTS, MOCK_INSIGHTS } from '@/lib/mock-data';
import { canViewInsights } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/get-current-user';
import InfoModal from '@/components/InfoModal';
import ExportCsvButton from '@/components/ExportCsvButton';

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

function StarRow({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    size={13}
                    className={n <= Math.round(rating) ? 'text-orange-400' : 'text-[var(--color-border)]'}
                    fill={n <= Math.round(rating) ? 'currentColor' : 'none'}
                />
            ))}
            <span className="text-xs font-semibold text-[var(--color-text)] ml-1">
                {rating.toFixed(1)}
            </span>
        </div>
    );
}

export default function InsightsPage() {
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

    const relevantInsights = MOCK_INSIGHTS.filter((insight) => {
        if (user.role === 'ADMIN') return true;
        const event = MOCK_EVENTS.find((e) => e.id === insight.eventId);
        return event?.createdBy === user.id;
    });

    const completedInsights = relevantInsights.filter((i) => i.totalAttended > 0);
    const totalAttended = relevantInsights.reduce((sum, i) => sum + i.totalAttended, 0);
    const totalRegistered = relevantInsights.reduce((sum, i) => sum + i.totalRegistered, 0);
    const overallRate = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;
    const ratedInsights = relevantInsights.filter((i) => i.averageRating > 0);
    const avgRating =
        ratedInsights.length > 0
            ? ratedInsights.reduce((sum, i) => sum + i.averageRating, 0) / ratedInsights.length
            : 0;

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
                        bywoning en deelnemer terugvoer.
                    </p>

                    <div className="space-y-3">
                        <InfoRow
                            label="Bywoning %"
                            body="Die persentasie geregistreerdes wat werklik opgedaag het. Slegs beskikbaar vir geleenthede wat reeds plaasgevind het."
                        />
                        <InfoRow
                            label="Gem. Gradering"
                            body="Deelnemers beoordeel geleenthede uit 5 nadat dit plaasgevind het. 'n Nul beteken nog geen graderings ontvang nie."
                        />
                        <InfoRow
                            label="Terugvoer"
                            body="Kommentaar wat deelnemers nagelaat het. Gebruik dit om toekomstige geleenthede te verbeter."
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

            {/* ── Summary KPI cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                    icon={<Users size={20} />}
                    iconBg="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    label="Totaal Bygewoon"
                    value={String(totalAttended)}
                    sub={`van ${totalRegistered} geregistreer`}
                />
                <KpiCard
                    icon={<TrendingUp size={20} />}
                    iconBg="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    label="Gem. Bywoning"
                    value={`${overallRate}%`}
                    sub={`${completedInsights.length} geleenthede voltooi`}
                />
                <KpiCard
                    icon={<Star size={20} />}
                    iconBg="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                    label="Gem. Gradering"
                    value={avgRating > 0 ? `${avgRating.toFixed(1)} / 5` : 'N/B'}
                    sub={avgRating > 0 ? `${ratedInsights.length} geleenthede beoordeel` : 'Nog geen graderings'}
                />
            </div>

            {/* ── Per-event cards ── */}
            <div className="space-y-3">
                <h2 className="text-base font-semibold text-[var(--color-text)]">
                    Per Geleentheid
                </h2>

                {relevantInsights.length === 0 ? (
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-10 text-center">
                        <p className="text-[var(--color-text-subtle)] text-sm">
                            Geen insigte beskikbaar nie.
                        </p>
                    </div>
                ) : (
                    relevantInsights.map((insight) => {
                        const event = MOCK_EVENTS.find((e) => e.id === insight.eventId);
                        if (!event) return null;

                        const isPast = insight.totalAttended > 0 || (insight.totalRegistered > 0 && event.status === 'past');
                        const colors = attendanceColors(insight.attendanceRate);

                        return (
                            <div
                                key={insight.eventId}
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
                                                {event.date}
                                            </span>
                                        </div>
                                    </div>
                                    {insight.averageRating > 0 && (
                                        <StarRow rating={insight.averageRating} />
                                    )}
                                </div>

                                {/* Card body */}
                                <div className="px-5 py-4 space-y-4">
                                    {isPast ? (
                                        <>
                                            {/* Attendance metric */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-medium text-[var(--color-text-subtle)]">
                                                        Bywoning
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-[var(--color-text-subtle)]">
                                                            {insight.totalAttended} / {insight.totalRegistered}
                                                        </span>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.pill}`}>
                                                            {insight.attendanceRate}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${colors.bar}`}
                                                        style={{ width: `${insight.attendanceRate}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Feedback */}
                                            {insight.feedback.length > 0 && (
                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <MessageSquare size={12} className="text-[var(--color-text-subtle)]" />
                                                        <span className="text-xs font-medium text-[var(--color-text-subtle)]">
                                                            Terugvoer ({insight.feedback.length})
                                                        </span>
                                                    </div>
                                                    <ul className="space-y-2">
                                                        {insight.feedback.map((fb, i) => (
                                                            <li
                                                                key={i}
                                                                className="text-xs text-[var(--color-text)] bg-[var(--color-bg)] border-l-2 border-[var(--color-primary)] rounded-r-lg pl-3 pr-3 py-2 leading-relaxed"
                                                            >
                                                                {fb}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </>
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