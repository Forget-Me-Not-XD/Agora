function healthOf(percent: number): { color: string; label: string } {
    if (percent >= 70) return { color: 'var(--color-green)', label: 'Uitstekend' };
    if (percent >= 40) return { color: 'var(--color-orange)', label: 'Gemiddeld' };
    return { color: 'var(--color-red)', label: 'Lae vulkoers' };
}

export default function FillRateDonut({ percent }: { percent: number }) {
    const clamped = Math.max(0, Math.min(100, percent));
    const { color, label } = healthOf(clamped);
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-full flex items-center justify-center py-2">
                <svg width={180} height={180} viewBox="0 0 180 180" className="-rotate-90">
                    <circle cx={90} cy={90} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={16} />
                    <circle
                        cx={90} cy={90} r={radius} fill="none"
                        stroke={color} strokeWidth={16}
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-bold text-[var(--color-text)]">{clamped.toFixed(0)}%</span>
                    <span className="text-xs text-[var(--color-text-subtle)]">Vulkoers</span>
                </div>
            </div>
            <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ color, backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
            >
                {label}
            </span>
            <p className="text-[11px] text-[var(--color-text-subtle)] mt-2 text-center">
                Gemiddelde kapasiteit gevul oor alle geleenthede
            </p>
        </div>
    );
}
