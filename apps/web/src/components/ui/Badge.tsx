export function DeltaBadge({ value }: { value: number | null }) {
    if (value === null) {
        return (
            <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-border)] text-[var(--color-text-subtle)]">
                --
            </span>
        );
    }

    const positive = value >= 0;
    return (
        <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                positive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
        >
            {positive ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
        </span>
    );
}