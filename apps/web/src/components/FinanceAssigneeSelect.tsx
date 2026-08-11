'use client';

// ========== Imports: ==========
import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { searchFinanceUsersAction } from '@/lib/actions/user.actions';
import type { UserResponseDto } from '@/lib/api/users';

interface FinanceAssigneeSelectProps {
    value:     string;                              // gekose gebruiker-ID ('' = geen)
    valueName: string;                               // vertoonnaam vir die gekose gebruiker
    onChange:  (id: string, name: string) => void;
}

export default function FinanceAssigneeSelect({ value, valueName, onChange }: FinanceAssigneeSelectProps) {
    const [query, setQuery]         = useState(valueName);
    const [open, setOpen]           = useState(false);
    const [results, setResults]     = useState<UserResponseDto[]>([]);
    const [searching, setSearching] = useState(false);

    // lewende soek, stop na 300ms -- soek "leeg" wys die volle lys getagde gebruikers
    useEffect(() => {
        if (!open) return;

        setSearching(true);
        const t = setTimeout(async () => {
            const res = await searchFinanceUsersAction(query.trim() || undefined);
            setResults(res.users ?? []);
            setSearching(false);
        }, 300);

        return () => clearTimeout(t);
    }, [query, open]);

    function selectUser(u: UserResponseDto) {
        onChange(u.id, `${u.name} ${u.surname}`);
        setQuery(`${u.name} ${u.surname}`);
        setOpen(false);
    }

    function clearSelection() {
        onChange('', '');
        setQuery('');
    }

    return (
        <div className="relative">
            <div className="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 focus-within:border-[var(--color-primary)]">
                <Search size={15} className="text-[var(--color-text-subtle)] shrink-0" />
                <input
                    type="text"
                    placeholder="Soek 'n gebruiker met die Finansies-tag..."
                    value={query}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                        if (value) onChange('', '');
                    }}
                    className="bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none w-full"
                />
                {value && (
                    <button
                        type="button"
                        onClick={clearSelection}
                        className="text-[var(--color-text-subtle)] hover:text-[var(--color-red)] shrink-0"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {open && (
                <div className="absolute z-10 mt-1 w-full border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl divide-y divide-[var(--color-border)] max-h-48 overflow-y-auto shadow-lg">
                    {searching ? (
                        <p className="text-xs text-[var(--color-text-subtle)] px-3 py-2">Soek...</p>
                    ) : results.length === 0 ? (
                        <p className="text-xs text-[var(--color-text-subtle)] px-3 py-2">Geen gebruikers met die Finansies-tag gevind nie.</p>
                    ) : (
                        results.map((u) => (
                            <button
                                key={u.id}
                                type="button"
                                onClick={() => selectUser(u)}
                                className="w-full text-left px-3 py-2 hover:bg-[var(--color-bg)] transition-colors"
                            >
                                <span className="text-sm text-[var(--color-text)]">{u.name} {u.surname}</span>
                                <span className="text-xs text-[var(--color-text-subtle)] block">{u.email}</span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
