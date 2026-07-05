// ========== Imports: ==========
import type { EventsPerMonth } from './api/analytics';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

        points.push({ label: MONTH_LABELS[month - 1], a, b});
    }

    return points;
}