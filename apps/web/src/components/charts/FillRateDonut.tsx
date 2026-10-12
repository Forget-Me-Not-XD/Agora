import { Pill, TONE_VAR } from '@/components/ui/Pill';
import { fillRateBand } from '@/lib/metrics';

export default function FillRateDonut({ percent }: { percent: number }) {
    const clamped = Math.max(0, Math.min(100, percent));
    const band = fillRateBand(clamped);
    const color = TONE_VAR[band.tone];
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-full flex items-center justify-center py-2">
                <svg width={180} height={180} viewBox="0 0 180 180" className="-rotate-90" aria-hidden="true">
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
                    <span className="text-xs text-[var(--color-text-subtle)]">vulkoers</span>
                </div>
            </div>
            <Pill tone={band.tone}>{band.label}</Pill>

            {/* Die drempels self, sodat die kleur iets beteken */}
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-3 text-xs text-[var(--color-text-subtle)]">
                <Threshold tone="green" label="70%+ uitstekend" />
                <Threshold tone="orange" label="40–69% gemiddeld" />
                <Threshold tone="red" label="onder 40% laag" />
            </div>
        </div>
    );
}

function Threshold({ tone, label }: { tone: 'green' | 'orange' | 'red'; label: string }) {
    return (
        <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TONE_VAR[tone] }} />
            {label}
        </span>
    );
}
