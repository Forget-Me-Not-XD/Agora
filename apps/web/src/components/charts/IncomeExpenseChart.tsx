'use client';

export interface IncomeExpenseItem {
    label: string;
    income: number;
    expense: number;
}

function fmt(v: number) {
    if (v >= 1000) return `R${(v / 1000).toFixed(0)}k`;
    return `R${v}`;
}

export default function IncomeExpenseChart({ data }: { data: IncomeExpenseItem[] }) {
    if (data.length === 0) {
        return (
            <p className="text-xs text-[var(--color-text-subtle)] text-center py-8">
                Geen begrotingsdata beskikbaar nie.
            </p>
        );
    }

    const max = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);
    const CHART_H = 160;

    function barH(val: number) {
        return Math.max(Math.round((val / max) * CHART_H), val > 0 ? 4 : 0);
    }

    const totalIncome = data.reduce((s, d) => s + d.income, 0);
    const totalExpense = data.reduce((s, d) => s + d.expense, 0);
    const net = totalIncome - totalExpense;

    return (
        <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)]">
                        <span className="w-3 h-3 rounded-sm bg-emerald-500 shrink-0" />
                        Inkomste
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)]">
                        <span className="w-3 h-3 rounded-sm bg-rose-500 shrink-0" />
                        Uitgawes
                    </span>
                </div>
                <span className={`text-xs font-semibold ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    Netto: {net >= 0 ? '+' : ''}{fmt(net)}
                </span>
            </div>

            {/* Bars */}
            <div className="flex items-end gap-3" style={{ height: `${CHART_H + 28}px` }}>
                {data.map((item, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                        <div
                            className="w-full flex items-end justify-center gap-1"
                            style={{ height: `${CHART_H}px` }}
                        >
                            {/* Income bar */}
                            <div className="flex-1 flex flex-col justify-end group relative">
                                <div
                                    className="w-full bg-emerald-500 rounded-t-md transition-all cursor-default"
                                    style={{ height: `${barH(item.income)}px` }}
                                />
                                {item.income > 0 && (
                                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                        {fmt(item.income)}
                                    </span>
                                )}
                            </div>

                            {/* Expense bar */}
                            <div className="flex-1 flex flex-col justify-end group relative">
                                <div
                                    className="w-full bg-rose-500 rounded-t-md transition-all cursor-default"
                                    style={{ height: `${barH(item.expense)}px` }}
                                />
                                {item.expense > 0 && (
                                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                        {fmt(item.expense)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* X-axis label */}
                        <span className="text-[10px] text-[var(--color-text-subtle)] text-center truncate w-full leading-tight">
                            {item.label.length > 14 ? item.label.slice(0, 12) + '…' : item.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Totals row */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--color-border)]">
                <div className="text-center">
                    <p className="text-[10px] text-[var(--color-text-subtle)]">Totale Inkomste</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalIncome)}</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-[var(--color-text-subtle)]">Totale Uitgawes</p>
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{fmt(totalExpense)}</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-[var(--color-text-subtle)]">Netto Balans</p>
                    <p className={`text-sm font-bold ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {net >= 0 ? '+' : ''}{fmt(net)}
                    </p>
                </div>
            </div>
        </div>
    );
}