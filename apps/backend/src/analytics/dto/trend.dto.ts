export type TrendDirection = 'up' | 'down' | 'stable';

export interface Trend {
    deltaPct: number | null;
    direction: TrendDirection;
}