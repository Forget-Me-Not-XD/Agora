import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';
import type { ModelStatus, ModelHealth } from '@/lib/api/analytics';
import { Pill, type Tone } from '@/components/ui/Pill';
import { IconChip } from '@/components/ui/IconChip';
import { formatDateShort } from '@/lib/format-date';

const HEALTH_META: Record<ModelHealth, { label: string; tone: Tone; icon: typeof CheckCircle2 }> = {
    good:    { label: 'Gesond',   tone: 'green',   icon: CheckCircle2 },
    fair:    { label: 'Redelik',  tone: 'orange',  icon: AlertTriangle },
    poor:    { label: 'Swak',     tone: 'red',     icon: AlertOctagon },
    unknown: { label: 'Onbekend', tone: 'neutral', icon: HelpCircle },
};

export default function ModelStatusBanner({ status }: { status: ModelStatus | null }) {
    if (!status || !status.available) {
        return (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center gap-3">
                <IconChip tone="neutral" size="sm"><HelpCircle size={16} /></IconChip>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text)]">KI-model tans onbeskikbaar</p>
                    <p className="text-xs text-[var(--color-text-subtle)]">
                        Geen opgeleide model gevind nie — voorspellings sal nie werk nie.
                    </p>
                </div>
            </div>
        );
    }

    const meta = HEALTH_META[status.health];
    const Icon = meta.icon;
    const accuracyPct = status.fillRateMae !== null ? Math.round((1 - status.fillRateMae) * 100) : null;

    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-3">
                <IconChip tone={meta.tone} size="sm"><Icon size={16} /></IconChip>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--color-text)]">KI-model status</p>
                        <Pill tone={meta.tone} dot>{meta.label}</Pill>
                    </div>
                    {status.trainedAt && (
                        <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                            Laas opgelei op {formatDateShort(status.trainedAt)} · {status.eventsUsed ?? 0} geleenthede gebruik
                        </p>
                    )}
                </div>
            </div>

            {accuracyPct !== null && (
                <div className="flex items-center gap-4 ml-auto text-xs">
                    <span className="text-[var(--color-text-subtle)]">
                        Gem. akkuraatheid <strong className="text-[var(--color-text)]">{accuracyPct}%</strong>
                    </span>
                    {status.noShowMae !== null && (
                        <span className="text-[var(--color-text-subtle)]">
                            Nie-opdaag fout <strong className="text-[var(--color-text)]">±{Math.round(status.noShowMae * 100)}%</strong>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
