import { AlertCircle, Users, TrendingUp, TrendingDown, CheckCircle, Trophy } from 'lucide-react';
import { canViewInsights } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/get-current-user';
import { getEvents, type Event, type EventType } from '@/lib/api/events';
import { formatDateShort } from '@/lib/format-date';
import { TYPE_LABELS, TYPE_TONE } from '@/lib/event-view';
import { Pill, type Tone } from '@/components/ui/Pill';
import { IconChip } from '@/components/ui/IconChip';
import InfoModal from '@/components/InfoModal';
import ExportCsvButton from '@/components/ExportCsvButton';
import PredictedAttendanceCard from '@/components/PredictedAttendanceCard';
import PredictionAccuracyPanel from '@/components/PredictionAccuracyPanel';

function attendanceColors(rate: number): { tone: Tone; bar: string } {
    if (rate >= 80) return { tone: 'green', bar: 'bg-green-500' };
    if (rate >= 50) return { tone: 'orange', bar: 'bg-orange-400' };
    return { tone: 'red', bar: 'bg-red-500' };
}

// 'n Geleentheid is "verby" sodra sy einde (of, as daar geen einde is nie, sy begin) reeds verby is
function isEventPast(event: Event): boolean {
    const now = Date.now();
    const start = new Date(event.date).getTime();
    const end = event.endDate ? new Date(event.endDate).getTime() : start;
    return now > end;
}

function fillRateOf(event: Event): number {
    return event.maxCapacity > 0 ? event.confirmedAttendees / event.maxCapacity : 0;
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

    // Slegs geleenthede met 'n kapasiteit gee 'n betekenisvolle bywoningskoers
    const rankedEvents = completedEvents
        .filter((e) => e.maxCapacity > 0)
        .slice()
        .sort((a, b) => fillRateOf(b) - fillRateOf(a));
    const topPerformers    = rankedEvents.slice(0, 3);
    const bottomPerformers = rankedEvents.length > 3
        ? rankedEvents.slice(-3).reverse()
        : [];

    // Gemiddelde bywoning per tipe geleentheid — wys watter soort geleenthede werklik trek
    const typeBreakdown = (Object.keys(TYPE_LABELS) as EventType[])
        .map((type) => {
            const events = completedEvents.filter((e) => e.type === type && e.maxCapacity > 0);
            const avgRate = events.length > 0
                ? Math.round((events.reduce((sum, e) => sum + fillRateOf(e), 0) / events.length) * 100)
                : null;
            return { type, count: events.length, avgRate };
        })
        .filter((t) => t.count > 0)
        .sort((a, b) => (b.avgRate ?? 0) - (a.avgRate ?? 0));

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">KI Insigte</h1>
                    <p className="text-sm text-[var(--color-text-subtle)] mt-1">
                        {user.role === 'ADMIN'
                            ? 'Prestasie oorsig vir alle voltooide geleenthede'
                            : 'Prestasie oorsig vir jou voltooide geleenthede'}
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
                    tone="blue"
                    label="Totaal Bygewoon"
                    value={String(totalAttended)}
                    sub={`oor ${completedEvents.length} voltooide geleentheid${completedEvents.length !== 1 ? 'e' : ''}`}
                />
                <KpiCard
                    icon={<TrendingUp size={20} />}
                    tone="green"
                    label="Gem. Bywoning"
                    value={`${overallRate}%`}
                    sub="teenoor kapasiteit"
                />
                <KpiCard
                    icon={<CheckCircle size={20} />}
                    tone="orange"
                    label="Geleenthede Voltooi"
                    value={String(completedEvents.length)}
                    sub={`van ${relevantEvents.length} in totaal`}
                />
            </div>

            {/* ── Modelakkuraatheid: kies geleenthede, vergelyk voorspelling teenoor werklikheid ── */}
            <PredictionAccuracyPanel events={completedEvents.map((e) => ({ id: e.id, title: e.title, date: e.date }))} />

            {/* ── Beste & swakste presterende geleenthede ── */}
            {rankedEvents.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <PerformerList
                        title="Beste presterende geleenthede"
                        icon={<Trophy size={16} />}
                        tone="green"
                        events={topPerformers}
                    />
                    {bottomPerformers.length > 0 && (
                        <PerformerList
                            title="Swakste presterende geleenthede"
                            icon={<TrendingDown size={16} />}
                            tone="red"
                            events={bottomPerformers}
                        />
                    )}
                </div>
            )}

            {/* ── Gemiddelde bywoning per tipe geleentheid ── */}
            {typeBreakdown.length > 0 && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                    <h2 className="text-base font-semibold text-[var(--color-text)] mb-3">
                        Bywoning per Tipe Geleentheid
                    </h2>
                    <div className="space-y-3">
                        {typeBreakdown.map(({ type, count, avgRate }) => (
                            <div key={type} className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Pill tone={TYPE_TONE[type]}>{TYPE_LABELS[type]}</Pill>
                                        <span className="text-xs text-[var(--color-text-subtle)]">
                                            {count} geleentheid{count !== 1 ? 'e' : ''}
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-[var(--color-text)]">{avgRate}%</span>
                                </div>
                                <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${attendanceColors(avgRate ?? 0).bar}`}
                                        style={{ width: `${avgRate}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {completedEvents.length === 0 && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-10 text-center">
                    <p className="text-[var(--color-text-subtle)] text-sm">
                        Geen voltooide geleenthede om insigte oor te wys nie.
                    </p>
                </div>
            )}
        </div>
    );
}

/* ── Small sub-components ── */

function PerformerList({
    title,
    icon,
    tone,
    events,
}: {
    title: string;
    icon: React.ReactNode;
    tone: Tone;
    events: Event[];
}) {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
                <IconChip tone={tone} size="sm">{icon}</IconChip>
                <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
            </div>
            <div className="space-y-3">
                {events.map((event) => {
                    const rate = Math.round(fillRateOf(event) * 100);
                    return (
                        <div key={event.id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-[var(--color-text)] truncate">{event.title}</p>
                                <p className="text-xs text-[var(--color-text-subtle)]">
                                    {formatDateShort(event.date)} · {event.confirmedAttendees} / {event.maxCapacity}
                                </p>
                            </div>
                            <Pill tone={attendanceColors(rate).tone} className="shrink-0 font-bold">{rate}%</Pill>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function KpiCard({
    icon,
    tone,
    label,
    value,
    sub,
}: {
    icon: React.ReactNode;
    tone: Tone;
    label: string;
    value: string;
    sub: string;
}) {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex items-start gap-4">
            <IconChip tone={tone}>{icon}</IconChip>
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