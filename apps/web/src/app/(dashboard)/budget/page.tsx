// ========== Imports: ==========
import { Suspense } from 'react';
import { AlertCircle, Calendar, BarChart2, TrendingUp } from 'lucide-react';
import { getEventsSummary } from '@/lib/api/analytics';
import { canViewBudget } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/get-current-user';

const MAAND_NAME = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

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
            <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl h-16 animate-pulse"
                    />
                ))}
            </div>
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

async function BudgetData() {
    try {
        const { eventsPerMonth, top5Events } = await getEventsSummary();

        const totalEvents = eventsPerMonth.reduce((sum, m) => sum + m.count, 0);
        const topEvent    = top5Events[0] ?? null;
        const maxCount    = Math.max(...eventsPerMonth.map((m) => m.count), 1);
        const maxRsvps    = Math.max(...top5Events.map((e) => e.totalRsvps), 1);

        return (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <KpiCard
                        icon={<Calendar size={20} />}
                        iconBg="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        label="Totale Geleenthede"
                        value={String(totalEvents)}
                        sub={`oor ${eventsPerMonth.length} maand(e)`}
                    />
                    <KpiCard
                        icon={<TrendingUp size={20} />}
                        iconBg="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        label="Top Geleentheid RSVP's"
                        value={topEvent ? String(topEvent.totalRsvps) : 'N/B'}
                        sub={topEvent ? topEvent.eventTitle : 'Geen data beskikbaar'}
                    />
                    <KpiCard
                        icon={<BarChart2 size={20} />}
                        iconBg="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                        label="Aktiewe Maande"
                        value={String(eventsPerMonth.length)}
                        sub="met geleenthedsaktiwiteit"
                    />
                </div>

                <div className="space-y-4">
                    <h2 className="text-base font-semibold text-[var(--color-text)]">Geleenthede per Maand</h2>

                    {eventsPerMonth.length === 0 ? (
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-10 text-center">
                            <p className="text-[var(--color-text-subtle)] text-sm">
                                Geen maandelikse data beskikbaar nie.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl divide-y divide-[var(--color-border)]">
                            {eventsPerMonth.map((item) => (
                                <div key={`${item.year}-${item.month}`} className="px-5 py-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-[var(--color-text)]">
                                            {MAAND_NAME[item.month - 1]} {item.year}
                                        </span>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                            {item.count} geleentheid{item.count !== 1 ? 'e' : ''}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                                            style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h2 className="text-base font-semibold text-[var(--color-text)]">Top 5 Geleenthede (RSVP&apos;s)</h2>

                    {top5Events.length === 0 ? (
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-10 text-center">
                            <p className="text-[var(--color-text-subtle)] text-sm">
                                Geen RSVP-data beskikbaar nie.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl divide-y divide-[var(--color-border)]">
                            {top5Events.map((item, index) => (
                                <div key={item.eventTitle} className="px-5 py-4 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-sm font-bold text-[var(--color-text-subtle)] shrink-0">
                                                #{index + 1}
                                            </span>
                                            <span className="text-sm font-medium text-[var(--color-text)] truncate">
                                                {item.eventTitle}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                                            {item.totalRsvps} RSVP&apos;s
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-green-500 transition-all"
                                            style={{ width: `${Math.round((item.totalRsvps / maxRsvps) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </>
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Onbekende fout het voorgekom';
        return <BudgetError message={message} />;
    }
}

export default function BudgetPage() {
    const user = getCurrentUser();

    if (!canViewBudget(user.role)) {
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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[var(--color-text)]">Begroting</h1>
                <p className="text-sm text-[var(--color-text-subtle)] mt-1">
                    {user.role === 'ADMIN'
                        ? 'Finansiele oorsig vir alle geleenthede'
                        : 'Finansiele oorsig vir jou geleenthede'}
                </p>
            </div>

            <Suspense fallback={<BudgetSkeleton />}>
                <BudgetData />
            </Suspense>
        </div>
    );
}

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