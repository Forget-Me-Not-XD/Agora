'use client';

import { useState, useEffect } from 'react';
import { Camera, Search, ChevronDown, X, Check } from 'lucide-react';
import { searchPhotographersAction, assignPhotographerAction } from '@/lib/actions/photographer.actions';
import type { Photographer } from '@/lib/api/photographer';

interface PhotographerSectionProps {
    eventId: string;
    initialAssigned: Photographer[];
    initialInstructions: string;
}

export default function PhotographerSection({ eventId, initialAssigned, initialInstructions }: PhotographerSectionProps) {
    const [open, setOpen] = useState(false);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Photographer[]>([]);
    const [searching, setSearching] = useState(false);

    const [selected, setSelected] = useState<Photographer | null>(null);
    const [brief, setBrief] = useState(initialInstructions ?? '');

    const [assigned, setAssigned] = useState<Photographer[]>(initialAssigned);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // lewende soek, stop na 300ms
    useEffect(() => {
        const q = query.trim();
        if (!q) { setResults([]); return; }

        setSearching(true);
        const t = setTimeout(async () => {
            const res = await searchPhotographersAction(q);
            if (res.error) setError(res.error);
            else setResults(res.photographers ?? []);
            setSearching(false);
        }, 300);

        return () => clearTimeout(t);
    }, [query]);

    const handleSave = async () => {
        if (!selected) return;
        setSaving(true);
        setError(null);

        const res = await assignPhotographerAction(eventId, selected.id, brief);
        setSaving(false);
        if (res.error) { setError(res.error); return; }

        // Voeg die toegewysde lys sonder 'n herlaai
        setAssigned((prev) => (prev.some((p) => p.id === selected.id) ? prev : [...prev, selected]));
        setSelected(null);
        setQuery('');
        setResults([]);
    };

    const inputClass =
        'w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] rounded-xl px-3 py-2 outline-none';

    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--color-bg)] transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Camera size={16} className="text-[var(--color-primary)]" />
                    <span className="text-sm font-semibold text-[var(--color-text)]">Fotograaf</span>
                </div>
                <ChevronDown size={16} className={`text-[var(--color-text-subtle)] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="px-5 pb-5 pt-1 space-y-4 border-t border-[var(--color-border)]">
                    {/* Soek */}
                    <div>
                        <label className="text-xs font-medium text-[var(--color-text-subtle)] block mb-1.5">Soek 'n fotograaf</label>
                        <div className="flex items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2">
                            <Search size={15} className="text-[var(--color-text-subtle)] shrink-0" />
                            <input
                                type="text"
                                placeholder="Tik 'n naam..."
                                value={query}
                                onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                                className="bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none w-full"
                            />
                        </div>

                        {query.trim() && !selected && (
                            <div className="mt-2 border border-[var(--color-border)] rounded-xl divide-y divide-[var(--color-border)] max-h-48 overflow-y-auto">
                                {searching ? (
                                    <p className="text-xs text-[var(--color-text-subtle)] px-3 py-2">Soek...</p>
                                ) : results.length === 0 ? (
                                    <p className="text-xs text-[var(--color-text-subtle)] px-3 py-2">Geen fotograwe gevind nie.</p>
                                ) : (
                                    results.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelected(p)}
                                            className="w-full text-left px-3 py-2 hover:bg-[var(--color-bg)] transition-colors"
                                        >
                                            <span className="text-sm text-[var(--color-text)]">{p.name} {p.surname}</span>
                                            <span className="text-xs text-[var(--color-text-subtle)] block">{p.email}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Gekose fotograaf + instruksies */}
                    {selected && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2">
                                <div>
                                    <span className="text-sm font-medium text-[var(--color-text)]">{selected.name} {selected.surname}</span>
                                    <span className="text-xs text-[var(--color-text-subtle)] block">{selected.email}</span>
                                </div>
                                <button onClick={() => setSelected(null)} className="p-1 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)]">
                                    <X size={15} />
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-[var(--color-text-subtle)] block mb-1.5">Instruksies</label>
                                <textarea
                                    value={brief}
                                    onChange={(e) => setBrief(e.target.value)}
                                    rows={3}
                                    placeholder="Bv. Vermy fotos wat gaste met pers armbande insluit"
                                    className={inputClass + ' resize-none'}
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving || !brief.trim()}
                                className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                {saving ? 'Besig om te stoor...' : 'Stoor toewysing'}
                            </button>
                        </div>
                    )}

                    {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

                    {/* Toegewysde fotograwe */}
                    <div>
                        <p className="text-xs font-medium text-[var(--color-text-subtle)] mb-2">Toegewysde fotograwe</p>
                        {assigned.length === 0 ? (
                            <p className="text-xs text-[var(--color-text-subtle)]">Nog geen fotograwe toegewys nie.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {assigned.map((p) => (
                                    <div key={p.id} className="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2">
                                        <Check size={14} className="text-[var(--color-primary)] shrink-0" />
                                        <span className="text-sm text-[var(--color-text)]">{p.name} {p.surname}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}