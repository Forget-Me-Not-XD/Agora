// ========== Imports: ==========
import { Lightbulb } from 'lucide-react';
import InfoModal from '@/components/InfoModal';
import type { HelpContent } from '@/lib/metrics';

export type ChartHelpContent = HelpContent;

export function ChartHelpButton({ help }: { help: HelpContent }) {
    return (
        <InfoModal title={help.title}>
            <HelpSection label="Wat wys dit?" body={help.what} />
            {help.how && <HelpSection label="Hoe word dit bereken?" body={help.how} />}
            {help.good && <HelpSection label="Wat is goed?" body={help.good} />}
        </InfoModal>
    );
}

function HelpSection({ label, body }: { label: string; body: string }) {
    return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
            <p className="text-xs font-semibold text-[var(--color-text)] mb-0.5">{label}</p>
            <p className="text-sm text-[var(--color-text-subtle)] leading-relaxed">{body}</p>
        </div>
    );
}

const INSIGHT_TINT = 'color-mix(in srgb, var(--color-primary) 10%, transparent)';

/** Die een sin wat sê wat die grafiek beteken, in dieselfde styl as die sleutelbevindinge se aksies. */
export function ChartInsight({ text }: { text: string }) {
    return (
        <p
            className="flex items-start gap-2 rounded-lg p-2.5 text-sm text-[var(--color-text)] leading-relaxed"
            style={{ backgroundColor: INSIGHT_TINT }}
        >
            <Lightbulb size={15} className="text-[var(--color-primary)] shrink-0 mt-0.5" aria-hidden="true" />
            <span className="min-w-0">{text}</span>
        </p>
    );
}
