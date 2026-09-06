'use client';

import { useMemo, useState } from 'react';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { getPredictionAccuracyAction } from '@/lib/actions/analytics.actions';
import type { PredictionAccuracyItem } from '@/lib/api/analytics';
import { Pill, type Tone } from '@/components/ui/Pill';
import EventPickerModal, { type SelectableEvent } from '@/components/EventPickerModal';
import PredictionAccuracyChart from '@/components/charts/PredictionAccuracyChart';

function accuracyTone(accuracyPct: number): Tone {
    if (accuracyPct >= 80) return 'green';
    if (accuracyPct >= 50) return 'orange';
    return 'red';
}

export default function PredictionAccuracyPanel({ events }: { events: SelectableEvent[] }) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [results, setResults]   = useState<PredictionAccuracyItem[] | null>(null);

    async function analyze() {
        setLoading(true);
        setError(null);
        setResults(null);
        const res = await getPredictionAccuracyAction([...selected]);
        setLoading(false);
        if (res.error) setError(res.error);
        else setResults(res.items ?? []);
    }

    const avgAccuracy = useMemo(() => {
        if (!results || results.length === 0) return null;
        const total = results.reduce((sum, r) => sum + Math.max(0, 100 - Math.abs(r.predictedFillRate - r.actualFillRate) * 100), 0);
        return Math.round(total / results.length);
    }, [results]);

    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
                <div
                    className="inline-flex items-center justify-center shrink-0 p-2.5 rounded-xl"
                    style={{ color: 'var(--color-primary)', backgroundColor: 'color-mix(in srgb, var(--color-primary) 14%, transparent)' }}
                >
                    <BrainCircuit size={18} />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-[var(--color-text)]">Modelakkuraatheid</h2>
                    <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                        Kies voltooide geleenthede om te sien hoe naby die KI-model se voorspelling (voor die tyd gemaak) aan die werklike bywoning was.
                    </p>
                </div>
            </div>

            {events.length === 0 ? (
                <p className="text-sm text-[var(--color-text-subtle)] py-4 text-center">
                    Geen voltooide geleenthede beskikbaar om te analiseer nie.
                </p>
            ) : (
                <>
                    <div className="flex flex-wrap items-center gap-3">
                        <EventPickerModal events={events} selected={selected} onChange={setSelected} />
                        <button
                            type="button"
                            onClick={analyze}
                            disabled={selected.size === 0 || loading}
                            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-text)] text-sm font-medium py-2 px-4 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                            {loading && <Loader2 size={14} className="animate-spin" />}
                            {loading ? 'Analiseer…' : `Analiseer geselekteerde (${selected.size})`}
                        </button>
                    </div>

                    {error && <p className="text-xs text-[var(--color-red)]">{error}</p>}

                    {results && results.length === 0 && !error && (
                        <p className="text-sm text-[var(--color-text-subtle)]">
                            Geen voorspellings beskikbaar vir die gekose geleenthede nie.
                        </p>
                    )}

                    {results && results.length > 0 && (
                        <div className="space-y-3 pt-1">
                            {avgAccuracy !== null && (
                                <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                                    <span className="text-sm font-medium text-[var(--color-text)]">
                                        Gemiddelde akkuraatheid oor {results.length} geleentheid{results.length !== 1 ? 'e' : ''}
                                    </span>
                                    <Pill tone={accuracyTone(avgAccuracy)} size="md" className="font-bold">{avgAccuracy}%</Pill>
                                </div>
                            )}

                            <PredictionAccuracyChart items={results} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
