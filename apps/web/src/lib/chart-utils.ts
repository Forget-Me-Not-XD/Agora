// ========== Imports: ==========
import type { EventsPerMonth, BudgetPerMonth } from './api/analytics';
import { AF_MONTHS_SHORT } from './format-date';

export interface MonthlyPoint {
    label: string;
    a: number;
    b: number;
}

export function mergeMonthlySeries(
    seriesA: EventsPerMonth[],
    seriesB: EventsPerMonth[],
    monthsBack = 12,
): MonthlyPoint[] {
    const now = new Date();
    const points: MonthlyPoint[] = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;

        const a = seriesA.find((s) => s.year === year && s.month === month)?.count ?? 0;
        const b = seriesB.find((s) => s.year === year && s.month === month)?.count ?? 0;

        points.push({ label: AF_MONTHS_SHORT[month - 1], a, b });
    }

    return points;
}

export interface SingleMonthlyPoint {
    label: string;
    value: number;
}

export function mergeSingleMonthlySeries(
    series: BudgetPerMonth[],
    monthsBack = 12,
): SingleMonthlyPoint[] {
    const now = new Date();
    const points: SingleMonthlyPoint[] = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;

        const value = series.find((s) => s.year === year && s.month === month)?.total ?? 0;

        points.push({ label: AF_MONTHS_SHORT[month - 1], value });
    }

    return points;
}