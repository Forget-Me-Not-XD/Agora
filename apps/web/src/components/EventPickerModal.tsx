'use client';

// ========== Imports: ==========
import { useMemo, useState } from 'react';
import { Search, X, ListChecks, CheckSquare, Square } from 'lucide-react';
import { formatDateShort } from '@/lib/format-date';

export interface SelectableEvent {
    id:    string;
    title: string;
    date:  string;
}

interface EventPickerModalProps {
    events:   SelectableEvent[];
    selected: Set<string>;
    onChange: (next: Set<string>) => void;
}

export default function EventPickerModal({ events, selected, onChange }: EventPickerModalProps) {
    const [open, setOpen]   = useState(false);
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return events;
        return events.filter((e) => e.title.toLowerCase().includes(term));
    }, [events, query]);

    const allFilteredSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id));

    function toggle(id: string) {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id); else next.add(id);
        onChange(next);
    }

    function toggleAllFiltered() {
        const next = new Set(selected);
        if (allFilteredSelected) {
            filtered.forEach((e) => next.delete(e.id));
        } else {
            filtered.forEach((e) => next.add(e.id));
        }
        onChange(next);
    }

    function close() {
        setOpen(false);
        setQuery('');
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm font-medium py-2 px-4 hover:bg-[var(--color-border)] transition-colors"
            >
                <ListChecks size={15} />
                {selected.size === 0 ? "Kies geleenthede..." : `${selected.size} geleentheid${selected.size !== 1 ? 'e' : ''} gekies`}
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={close}
                >
                    <div
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--color-border)] shrink-0">
                            <h3 className="text-sm font-bold text-[var(--color-text)]">Kies geleenthede vir analise</h3>
                            <button
                                onClick={close}
                                className="p-1.5 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] transition-colors"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="px-5 pt-4 shrink-0">
                            <div className="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 focus-within:border-[var(--color-primary)]">
                                <Search size={15} className="text-[var(--color-text-subtle)] shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Soek 'n geleentheid..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none w-full"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3">
                            <button
                                type="button"
                                onClick={toggleAllFiltered}
                                disabled={filtered.length === 0}
                                className="w-full flex items-center gap-2.5 px-1 py-2 text-xs font-semibold text-[var(--color-text-subtle)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-50"
                            >
                                {allFilteredSelected ? <CheckSquare size={15} className="text-[var(--color-primary)]" /> : <Square size={15} />}
                                {allFilteredSelected ? 'Deselekteer almal' : 'Kies almal (gefiltreer)'}
                            </button>

                            {filtered.length === 0 ? (
                                <p className="text-sm text-[var(--color-text-subtle)] text-center py-6">
                                    Geen geleenthede pas by &quot;{query}&quot; nie.
                                </p>
                            ) : (
                                <div className="divide-y divide-[var(--color-border)]">
                                    {filtered.map((event) => {
                                        const checked = selected.has(event.id);
                                        return (
                                            <button
                                                type="button"
                                                key={event.id}
                                                onClick={() => toggle(event.id)}
                                                className="w-full flex items-center gap-2.5 px-1 py-2.5 text-left hover:bg-[var(--color-bg)] transition-colors"
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
                            )}
                        </div>

                        <div className="px-5 pt-3 pb-5 border-t border-[var(--color-border)] shrink-0">
                            <button
                                type="button"
                                onClick={close}
                                className="w-full py-2 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                            >
                                Klaar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
