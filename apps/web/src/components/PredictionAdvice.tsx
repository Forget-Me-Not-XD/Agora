'use client';

// ========== Imports: ==========
import { CheckCircle2, TrendingUp } from 'lucide-react';
import { Pill } from '@/components/ui/Pill';
import type { Tone } from '@/components/ui/Pill';
import type { AlternativeKind, AlternativePrediction, PredictionResult, RecommendationSeverity } from '@/lib/api/analytics';

const SEVERITY_META: Record<RecommendationSeverity, { label: string; tone: Tone }> = {
    high:   { label: 'Belangrik', tone: 'red' },
    medium: { label: 'Oorweeg',   tone: 'orange' },
    low:    { label: 'Inligting', tone: 'neutral' },
};

const KIND_LABELS: Record<AlternativeKind, string> = {
    sameWeek:            'Dieselfde week',
    laterWeek:           'Later',
    recommendedCapacity: 'Ander kapasiteit',
};

const AFRIKAANS_DAYS = ['Sondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrydag', 'Saterdag'];
const AFRIKAANS_MONTHS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

const GREEN_TINT = 'color-mix(in srgb, var(--color-green) 10%, transparent)';
const GREEN_RING = 'color-mix(in srgb, var(--color-green) 35%, transparent)';

interface PredictionAdviceProps {
    prediction:           PredictionResult;
    onChooseAlternative?: (alternative: AlternativePrediction) => void;
}

export default function PredictionAdvice({ prediction, onChooseAlternative }: PredictionAdviceProps) {
    const [best, ...others] = prediction.alternatives.filter(alternative =>
        Number.isFinite(alternative.estimatedAttendees) && alternative.estimatedAttendees > prediction.estimatedAttendees,
    );

    return (
        <div className="space-y-4">
            {prediction.recommendations.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-[var(--color-text-subtle)] mb-2">
                        Aanbevelings
                    </p>
                    <ul className="space-y-2">
                        {prediction.recommendations.map((recommendation) => (
                            <li
                                key={recommendation.type}
                                className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 space-y-1.5"
                            >
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <Pill tone={SEVERITY_META[recommendation.severity].tone}>
                                        {SEVERITY_META[recommendation.severity].label}
                                    </Pill>
                                    <span className="text-xs font-semibold text-[var(--color-text-subtle)]">
                                        {recommendation.expectedImpact}
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--color-text)]">{recommendation.message}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div>
                <p className="text-xs font-medium text-[var(--color-text-subtle)] mb-2">
                    Beter opsies volgens die model
                </p>

                {best ? (
                    <div className="space-y-2">
                        <div
                            className="rounded-xl p-4 space-y-3"
                            style={{ backgroundColor: GREEN_TINT, boxShadow: `inset 0 0 0 1px ${GREEN_RING}` }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-[var(--color-green)] flex items-center gap-1.5">
                                        <TrendingUp size={14} />
                                        Beste opsie
                                    </p>
                                    <p className="text-base font-bold text-[var(--color-text)] mt-1">
                                        {formatAlternativeDay(best)}
                                    </p>
                                    <p className="text-xs text-[var(--color-text-subtle)]">
                                        {KIND_LABELS[best.kind]} · {best.capacity} sitplekke
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-2xl font-black text-[var(--color-green)] leading-none">
                                        +{attendeeGain(best, prediction)}
                                    </p>
                                    <p className="text-xs text-[var(--color-text-subtle)] mt-1">bywoners</p>
                                </div>
                            </div>

                            <p className="text-xs text-[var(--color-text)]">
                                Die model verwag {best.estimatedAttendees} bywoners in plaas van {prediction.estimatedAttendees} ({Math.round(best.predictedFillRate * 100)}% vol).
                            </p>

                            {onChooseAlternative && (
                                <button
                                    type="button"
                                    onClick={() => onChooseAlternative(best)}
                                    className="w-full py-2 rounded-xl text-sm font-semibold bg-[var(--color-primary)] text-[var(--color-primary-text)] hover:opacity-90 transition-opacity"
                                >
                                    Kies hierdie opsie
                                </button>
                            )}
                        </div>

                        {others.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                                {others.map((alternative) => (
                                    <OptionTile
                                        key={`${alternative.kind}-${alternative.date}-${alternative.capacity}`}
                                        alternative={alternative}
                                        gain={attendeeGain(alternative, prediction)}
                                        onChoose={onChooseAlternative}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        className="flex items-start gap-2 rounded-xl p-3"
                        style={{ backgroundColor: GREEN_TINT, boxShadow: `inset 0 0 0 1px ${GREEN_RING}` }}
                    >
                        <CheckCircle2 size={16} className="text-[var(--color-green)] shrink-0 mt-0.5" />
                        <p className="text-xs text-[var(--color-text)]">
                            Die model het geen ander dag in die komende drie weke gevind waarop meer mense sal opdaag nie. Jou huidige keuse is reeds die beste opsie.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

interface OptionTileProps {
    alternative: AlternativePrediction;
    gain:        number;
    onChoose?:   (alternative: AlternativePrediction) => void;
}

function OptionTile({ alternative, gain, onChoose }: OptionTileProps) {
    const content = (
        <>
            <p className="text-xs font-semibold text-[var(--color-text)]">{formatAlternativeDay(alternative)}</p>
            <p className="text-sm font-bold text-[var(--color-green)] mt-0.5">+{gain} bywoners</p>
            <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                {KIND_LABELS[alternative.kind]} · {alternative.capacity} sitplekke
            </p>
        </>
    );

    const tileClass = 'w-full text-left bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3';

    if (!onChoose) {
        return <div className={tileClass}>{content}</div>;
    }

    return (
        <button
            type="button"
            onClick={() => onChoose(alternative)}
            title="Kies hierdie opsie"
            className={`${tileClass} hover:border-[var(--color-primary)] transition-colors`}
        >
            {content}
        </button>
    );
}

function attendeeGain(alternative: AlternativePrediction, prediction: PredictionResult): number {
    return alternative.estimatedAttendees - prediction.estimatedAttendees;
}

function formatAlternativeDay(alternative: AlternativePrediction): string {
    return `${AFRIKAANS_DAYS[alternative.dayOfWeek]} ${alternative.dayOfMonth} ${AFRIKAANS_MONTHS[alternative.month - 1]}`;
}
