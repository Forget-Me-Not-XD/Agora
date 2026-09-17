'use client';

// ========== Imports: ==========
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

export default function UserSearchBar() {
    const router       = useRouter();
    const pathname     = usePathname();
    const searchParams = useSearchParams();

    const [value, setValue] = useState(searchParams.get('search') ?? '');

    // Wag 300ms na die laaste sleuteldruk voor die soekterm na die URL geskryf word,
    // sodat elke letter nie 'n aparte bediener-navraag veroorsaak nie.
    useEffect(() => {
        const timeout = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (value.trim()) params.set('search', value.trim());
            else params.delete('search');

            const query = params.toString();
            router.push(query ? `${pathname}?${query}` : pathname);
        }, 300);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Soek volgens naam of van..."
                aria-label="Soek gebruikers"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm pl-9 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            {value && (
                <button
                    onClick={() => setValue('')}
                    aria-label="Maak soekveld skoon"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}