// ========== Imports: ==========
import { Suspense } from 'react';
import { AlertCircle, Wallet, Users2, Banknote } from 'lucide-react';
import { getBudgetPerMonth } from '@/lib/api/analytics';
import { getEvents, type Event, type EventType } from '@/lib/api/events';
import { mergeSingleMonthlySeries } from '@/lib/chart-utils';
import { canViewBudget } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/get-current-user';
import { formatDateShort } from '@/lib/format-date';
import { deriveStatus } from '@/lib/event-view';
import { METRICS, formatRand, metricHelp, monthlyTrendInsight, type HelpContent, eventWord } from '@/lib/metrics';
import { ChartHelpButton } from '@/components/charts/ChartHelp';
import ChartCard from '@/components/charts/ChartCard';
import { TYPE_LABELS, TYPE_TONE } from '@/lib/event-view';
import { Pill, type Tone } from '@/components/ui/Pill';
import { IconChip } from '@/components/ui/IconChip';
import BudgetTrendChart from '@/components/charts/BudgetTrendChart';
import AutoRefresh from '@/components/AutoRefresh';

function fmtRand(v: number): string {
    return `R${Math.round(v).toLocaleString('af-ZA')}`;
}

function KpiSkeleton() {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex items-start gap-4 animate-pulse">
            <div className="w-11 h-11 rounded-xl bg-[var(--color-border)] shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-[var(--color-border)] rounded" />
                <div className="h-7 w-16 bg-[var(--color-border)] rounded" />
                <div className="h-3 w-32 bg-[var(--color-border)] rounded" />
            </div>
        </div>
    );
}

function BudgetSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
            </div>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl h-64 animate-pulse" />
        </div>
    );
}

function BudgetError({ message }: { message: string }) {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-10 text-center space-y-3">
            <AlertCircle size={36} className="mx-auto text-[var(--color-red)]" />
            <p className="text-sm font-semibold text-[var(--color-text)]">Data kon nie gelaai word nie</p>
            <p className="text-xs text-[var(--color-text-subtle)]">{message}</p>
        </div>
    );
}

async function BudgetData({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
    try {
        const [budgetPerMonth, allEvents] = await Promise.all([
            getBudgetPerMonth(),
            getEvents(),
        ]);
        const monthly = mergeSingleMonthlySeries(budgetPerMonth);

        // Dieselfde omvang as die backend se budget-per-month: ADMIN sien alles,
        // enigeen anders sien slegs geleenthede waaraan hulle (as Finansies) toegeken is.
        const events = isAdmin ? allEvents : allEvents.filter((e) => e.assignedTo === userId);
        const budgetedEvents = events.filter((e) => e.budget > 0);

        const totalBudget = budgetPerMonth.reduce((sum, m) => sum + m.total, 0);
        const avgPerEvent = budgetedEvents.length > 0 ? totalBudget / budgetedEvents.length : 0;

        // Soos die sleutelbevindinge: net afgelope geleenthede waar mense ingeteken is, en gedeel
        // deur wie werklik opgedaag het, nie deur die RSVPs nie
        const measured = budgetedEvents.filter((e) => deriveStatus(e) === 'past' && e.checkedInCount > 0);
        const measuredBudget = measured.reduce((sum, e) => sum + e.budget, 0);
        const totalAttendees = measured.reduce((sum, e) => sum + e.checkedInCount, 0);
        const costPerAttendee = totalAttendees > 0 ? measuredBudget / totalAttendees : null;

        const byType = (Object.keys(TYPE_LABELS) as EventType[])
            .map((type) => {
                const typeEvents = budgetedEvents.filter((e) => e.type === type);
                const sum = typeEvents.reduce((s, e) => s + e.budget, 0);
                return { type, sum, count: typeEvents.length };
            })
            .filter((t) => t.count > 0)
            .sort((a, b) => b.sum - a.sum);

        const topSpenders = budgetedEvents
            .slice()
            .sort((a, b) => b.budget - a.budget)
            .slice(0, 5);

        return (
            <>
                <AutoRefresh />
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <KpiCard
                        icon={<Wallet size={20} />}
                        tone="blue"
                        label="Totale Begroting"
                        value={fmtRand(totalBudget)}
                        sub={`oor ${budgetedEvents.length} ${eventWord(budgetedEvents.length)}`}
                        help={{
                            title: 'Totale Begroting',
                            what: 'Die som van die begrotings wat aan geleenthede toegeken is. Dit is wat toegeken is, nie wat werklik spandeer is nie.',
                        }}
                    />
                    <KpiCard
                        icon={<Banknote size={20} />}
                        tone="green"
                        label="Gemiddeld per Geleentheid"
                        value={budgetedEvents.length > 0 ? fmtRand(avgPerEvent) : 'N/B'}
                        sub="gemiddelde toekenning"
                        help={{
                            title: 'Gemiddeld per Geleentheid',
                            what: 'Die totale begroting gedeel deur die aantal geleenthede wat \'n begroting het. Geleenthede sonder begroting tel nie.',
                        }}
                    />
                    <KpiCard
                        icon={<Users2 size={20} />}
                        tone="orange"
                        label="Begroting per Bywoner"
                        value={costPerAttendee !== null ? fmtRand(costPerAttendee) : 'N/B'}
                        sub={totalAttendees > 0
                            ? `${totalAttendees} bywoners oor ${measured.length} afgelope ${eventWord(measured.length)}`
                            : 'nog geen bywoning aangeteken nie'}
                        help={metricHelp(METRICS.costPerAttendee)}
                    />
                </div>

                <ChartCard
                    title="Begroting per Maand"
                    subtitle="Totale toegekende begroting van die geleenthede in elke maand"
                    insight={monthlyTrendInsight(monthly, formatRand, 'begroting')}
                    help={{
                        title: 'Begroting per Maand',
                        what: 'Die som van die begrotings wat aan geleenthede toegeken is, volgens die maand waarin die geleentheid plaasvind.',
                    }}
                >
                    <BudgetTrendChart data={monthly} />
                </ChartCard>

                {byType.length > 0 && (
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                        <h2 className="text-base font-semibold text-[var(--color-text)] mb-3">
                            Begroting volgens Tipe Geleentheid
                        </h2>
                        <div className="space-y-3">
                            {byType.map(({ type, sum, count }) => {
                                const pct = totalBudget > 0 ? Math.round((sum / totalBudget) * 100) : 0;
                                return (
                                    <div key={type} className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Pill tone={TYPE_TONE[type]}>{TYPE_LABELS[type]}</Pill>
                                                <span className="text-xs text-[var(--color-text-subtle)]">
                                                    {count} {eventWord(count)}
                                                </span>
                                            </div>
                                            <span className="text-sm font-bold text-[var(--color-text)]">
                                                {fmtRand(sum)} <span className="text-xs font-normal text-[var(--color-text-subtle)]">({pct}%)</span>
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {topSpenders.length > 0 && (
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                        <div className="px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
                            <h2 className="text-base font-semibold text-[var(--color-text)]">Top Geleenthede volgens Begroting</h2>
                            <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                                Die grootste toekennings. Per bywoner vir afgelope geleenthede; per RSVP vir dié wat nog kom.
                            </p>
                        </div>
                        <div className="divide-y divide-[var(--color-border)]">
                            {topSpenders.map((event) => (
                                <TopSpenderRow key={event.id} event={event} />
                            ))}
                        </div>
                    </div>
                )}
            </>
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Onbekende fout het voorgekom';
        return <BudgetError message={message} />;
    }
}

function TopSpenderRow({ event }: { event: Event }) {
    // Ná die geleentheid deel ons deur wie opgedaag het; daarvoor is RSVPs die beste wat ons het
    const isPast = deriveStatus(event) === 'past';
    const people = isPast ? event.checkedInCount : event.confirmedAttendees;
    const perPerson = people > 0 ? event.budget / people : null;
    const unit = isPast ? 'bywoner' : 'RSVP';

    return (
        <div className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--color-text)] truncate">{event.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Pill tone={TYPE_TONE[event.type]}>{TYPE_LABELS[event.type]}</Pill>
                    <span className="text-xs text-[var(--color-text-subtle)]">{formatDateShort(event.date)}</span>
                    <span className="text-xs text-[var(--color-text-subtle)]">
                        · {people} {isPast ? (people === 1 ? 'bywoner' : 'bywoners') : (people === 1 ? 'RSVP' : 'RSVPs')}
                    </span>
                </div>
            </div>
            <div className="text-right shrink-0">
                <p className="text-sm font-bold text-[var(--color-text)]">{fmtRand(event.budget)}</p>
                <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                    {perPerson !== null ? `${fmtRand(perPerson)} per ${unit}` : isPast ? 'geen bywoning aangeteken nie' : 'nog geen RSVPs nie'}
                </p>
            </div>
        </div>
    );
}

export default function BudgetPage() {
    const user = getCurrentUser();

    if (!canViewBudget(user.role, user.tags)) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center py-24">
                <AlertCircle size={48} className="text-[var(--color-red)] mb-4" />
                <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">Toegang Geweier</h2>
                <p className="text-[var(--color-text-subtle)] text-sm">
                    Jy het nie toegang tot die Begroting nie.
                </p>
            </div>
        );
    }

    const scoped = user.role !== 'ADMIN';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[var(--color-text)]">Begroting</h1>
                <p className="text-sm text-[var(--color-text-subtle)] mt-1">
                    {scoped
                        ? 'Toegekende begroting vir geleenthede waaraan jy toegeken is'
                        : 'Toegekende begroting oor alle geleenthede'}
                </p>
            </div>

            <Suspense fallback={<BudgetSkeleton />}>
                <BudgetData userId={user.id} isAdmin={user.role === 'ADMIN'} />
            </Suspense>
        </div>
    );
}

function KpiCard({
    icon,
    tone,
    label,
    value,
    sub,
    help,
}: {
    icon: React.ReactNode;
    tone: Tone;
    label: string;
    value: string;
    sub: string;
    help?: HelpContent;
}) {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex items-start gap-4">
            <IconChip tone={tone}>{icon}</IconChip>
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                    <p className="text-xs text-[var(--color-text-subtle)] mb-0.5">{label}</p>
                    {help && <ChartHelpButton help={help} />}
                </div>
                <p className="text-2xl font-bold text-[var(--color-text)] leading-none">{value}</p>
                <p className="text-xs text-[var(--color-text-subtle)] mt-1 leading-snug">{sub}</p>
            </div>
        </div>
    );
}
