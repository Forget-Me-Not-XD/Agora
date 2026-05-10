import { AlertCircle, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { MOCK_EVENTS, MOCK_BUDGET_ITEMS } from '@/lib/mock-data';
import { canViewBudget } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/get-current-user';

function formatCurrency(amount: number) {
    return `R ${amount.toLocaleString('af-ZA')}`;
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

    const relevantEvents = MOCK_EVENTS.filter((e) =>
        user.role === 'ADMIN' ? true : e.createdBy === user.id
    );
    const relevantIds = new Set(relevantEvents.map((e) => e.id));
    const allItems = MOCK_BUDGET_ITEMS.filter((b) => relevantIds.has(b.eventId));

    const totalIncome = allItems
        .filter((b) => b.type === 'income')
        .reduce((sum, b) => sum + b.amount, 0);
    const totalExpenses = allItems
        .filter((b) => b.type === 'expense')
        .reduce((sum, b) => sum + b.amount, 0);
    const net = totalIncome - totalExpenses;

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex items-start gap-4">
                    <div className="p-3 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-xl">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-[var(--color-text-subtle)]">Totale Inkomste</p>
                        <p className="text-xl font-bold text-[var(--color-text)]">
                            {formatCurrency(totalIncome)}
                        </p>
                    </div>
                </div>

                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex items-start gap-4">
                    <div className="p-3 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl">
                        <TrendingDown size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-[var(--color-text-subtle)]">Totale Uitgawes</p>
                        <p className="text-xl font-bold text-[var(--color-text)]">
                            {formatCurrency(totalExpenses)}
                        </p>
                    </div>
                </div>

                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex items-start gap-4">
                    <div
                        className={`p-3 rounded-xl ${
                            net >= 0
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}
                    >
                        <Wallet size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-[var(--color-text-subtle)]">Netto Balans</p>
                        <p
                            className={`text-xl font-bold ${
                                net >= 0
                                    ? 'text-[var(--color-green)]'
                                    : 'text-[var(--color-red)]'
                            }`}
                        >
                            {formatCurrency(net)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-base font-semibold text-[var(--color-text)]">Per Geleentheid</h2>
                {relevantEvents.length === 0 ? (
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-10 text-center">
                        <p className="text-[var(--color-text-subtle)] text-sm">
                            Geen begrotingsdata beskikbaar nie.
                        </p>
                    </div>
                ) : (
                    relevantEvents.map((event) => {
                        const items = MOCK_BUDGET_ITEMS.filter((b) => b.eventId === event.id);
                        if (items.length === 0) return null;

                        const income = items
                            .filter((b) => b.type === 'income')
                            .reduce((sum, b) => sum + b.amount, 0);
                        const expenses = items
                            .filter((b) => b.type === 'expense')
                            .reduce((sum, b) => sum + b.amount, 0);
                        const eventNet = income - expenses;

                        return (
                            <div
                                key={event.id}
                                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden"
                            >
                                <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-2">
                                    <h3 className="text-sm font-semibold text-[var(--color-text)]">
                                        {event.title}
                                    </h3>
                                    <span
                                        className={`text-sm font-bold ${
                                            eventNet >= 0
                                                ? 'text-[var(--color-green)]'
                                                : 'text-[var(--color-red)]'
                                        }`}
                                    >
                                        Netto: {formatCurrency(eventNet)}
                                    </span>
                                </div>

                                <div className="divide-y divide-[var(--color-border)]">
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="px-5 py-3 flex items-center justify-between gap-4"
                                        >
                                            <div>
                                                <p className="text-xs font-medium text-[var(--color-text)]">
                                                    {item.description}
                                                </p>
                                                <p className="text-xs text-[var(--color-text-subtle)]">
                                                    {item.category}
                                                </p>
                                            </div>
                                            <span
                                                className={`text-sm font-semibold shrink-0 ${
                                                    item.type === 'income'
                                                        ? 'text-[var(--color-green)]'
                                                        : 'text-[var(--color-red)]'
                                                }`}
                                            >
                                                {item.type === 'income' ? '+' : '-'}
                                                {formatCurrency(item.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="px-5 py-3 bg-[var(--color-bg)] flex justify-end gap-6 text-xs text-[var(--color-text-subtle)]">
                                    <span>
                                        Inkomste:{' '}
                                        <strong className="text-[var(--color-green)]">
                                            {formatCurrency(income)}
                                        </strong>
                                    </span>
                                    <span>
                                        Uitgawes:{' '}
                                        <strong className="text-[var(--color-red)]">
                                            {formatCurrency(expenses)}
                                        </strong>
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
