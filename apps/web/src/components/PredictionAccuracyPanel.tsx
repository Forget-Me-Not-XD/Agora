'use client';

import { useMemo, useState } from 'react';
import { BrainCircuit, Loader2, CheckSquare, Square } from 'lucide-react';
import { getPredictionAccuracyAction } from '@/lib/actions/analytics.actions';
import type { PredictionAccuracyItem } from '@/lib/api/analytics';
import { formatDateShort } from '@/lib/format-date';
import { Pill, type Tone } from '@/components/ui/Pill';

interface SelectableEvent {
    id:    string;
    title: string;
    date:  string;
}

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

    const allSelected = events.length > 0 && selected.size === events.length;

    function toggle(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function toggleAll() {
        setSelected(allSelected ? new Set() : new Set(events.map((e) => e.id)));
    }

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
                    <div className="rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)] max-h-64 overflow-y-auto">
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--color-text-subtle)] hover:bg-[var(--color-bg)] transition-colors"
                        >
                            {allSelected ? <CheckSquare size={15} className="text-[var(--color-primary)]" /> : <Square size={15} />}
                            {allSelected ? 'Deselekteer almal' : 'Kies almal'}
                        </button>
                        {events.map((event) => {
                            const checked = selected.has(event.id);
                            return (
                                <button
                                    type="button"
                                    key={event.id}
                                    onClick={() => toggle(event.id)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[var(--color-bg)] transition-colors"
                                >
                                    {checked
                                        ? <CheckSquare size={15} className="shrink-0 text-[var(--color-primary)]" />
                                        : <Square size={15} className="shrink-0 text-[var(--color-text-subtle)]" />
                                    }
                                    <span className="text-sm text-[var(--color-text)] truncate flex-1">{event.title}</span>
                                    <span className="text-xs text-[var(--color-text-subtle)] shrink-0">{formatDateShort(event.date)}</span>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={analyze}
                        disabled={selected.size === 0 || loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-text)] text-sm font-medium py-2 px-4 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                        {loading && <Loader2 size={14} className="animate-spin" />}
                        {loading ? 'Analiseer…' : `Analiseer geselekteerde (${selected.size})`}
                    </button>

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

                            <div className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] overflow-hidden">
                                {results.map((r) => {
                                    const accuracyPct = Math.round(Math.max(0, 100 - Math.abs(r.predictedFillRate - r.actualFillRate) * 100));
                                    return (
                                        <div key={r.eventId} className="px-4 py-3 space-y-2">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="text-sm font-medium text-[var(--color-text)] truncate">{r.title}</p>
                                                <Pill tone={accuracyTone(accuracyPct)} className="shrink-0 font-bold">{accuracyPct}% akkuraat</Pill>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-xs text-[var(--color-text-subtle)]">
                                                <span>
                                                    Voorspel: <strong className="text-[var(--color-text)]">{r.predictedAttendees}</strong> ({Math.round(r.predictedFillRate * 100)}%)
                                                </span>
                                                <span>
                                                    Werklik: <strong className="text-[var(--color-text)]">{r.actualAttendees}</strong> ({Math.round(r.actualFillRate * 100)}%)
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
