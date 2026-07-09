// ========== Imports: ==========
import { Suspense } from 'react';
import { AlertCircle, Wallet, TrendingUp, CalendarClock } from 'lucide-react';
import { getBudgetPerMonth } from '@/lib/api/analytics';
import { mergeSingleMonthlySeries } from '@/lib/chart-utils';
import { canViewBudget } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/get-current-user';
import BudgetTrendChart from '@/components/charts/BudgetTrendChart';

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

async function BudgetData() {
    try {
        const budgetPerMonth = await getBudgetPerMonth();
        const monthly = mergeSingleMonthlySeries(budgetPerMonth);

        const totalBudget = budgetPerMonth.reduce((sum, m) => sum + m.total, 0);
        const avgPerMonth = budgetPerMonth.length > 0 ? totalBudget / budgetPerMonth.length : 0;
        const peakMonth = budgetPerMonth.reduce<typeof budgetPerMonth[number] | null>(
            (best, m) => (!best || m.total > best.total ? m : best),
            null,
        );

        return (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <KpiCard
                        icon={<Wallet size={20} />}
                        iconBg="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        label="Totale Begroting"
                        value={fmtRand(totalBudget)}
                        sub={`oor ${budgetPerMonth.length} maand(e)`}
                    />
                    <KpiCard
                        icon={<TrendingUp size={20} />}
                        iconBg="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        label="Gemiddeld per Maand"
                        value={fmtRand(avgPerMonth)}
                        sub="toegeken oor die tydperk"
                    />
                    <KpiCard
                        icon={<CalendarClock size={20} />}
                        iconBg="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                        label="Hoogste Maand"
                        value={peakMonth ? fmtRand(peakMonth.total) : 'N/B'}
                        sub={peakMonth ? `${peakMonth.month}/${peakMonth.year}` : 'Geen data beskikbaar'}
                    />
                </div>

                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                    <div className="mb-2">
                        <h2 className="text-base font-semibold text-[var(--color-text)]">Begroting per Maand</h2>
                        <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                            Toegekende begroting per geleentheid · afgelope 12 maande
                        </p>
                    </div>
                    <BudgetTrendChart data={monthly} />
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
                    Toegekende begroting oor alle geleenthede
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