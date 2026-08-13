import { Pill } from './Pill';

export function DeltaBadge({ value }: { value: number | null }) {
    if (value === null) {
        return <Pill tone="neutral">--</Pill>;
    }

    const positive = value >= 0;
    return (
        <Pill tone={positive ? 'green' : 'red'} className="gap-0.5">
            {positive ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
        </Pill>
    );
}
