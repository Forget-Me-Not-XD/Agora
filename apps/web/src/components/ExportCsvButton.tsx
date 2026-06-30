'use client';

// ========== Imports: ==========
import { useState }          from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useCurrentUser }    from './UserContext';
import { canManageUsers }    from '@/lib/rbac';

export type ExportType = 'kpis' | 'events-summary' | 'rsvp-summary';

interface Props {
    type:   ExportType;
    label?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function ExportCsvButton({ type, label }: Props) {
    const user                  = useCurrentUser();
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState<string | null>(null);

    if (!canManageUsers(user.role)) return null;

    async function handleExport() {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/export/${type}`, {
                cache: 'no-store',
            });

           if (!res.ok) {
                throw new Error('Uitvoer het misluk. Probeer asseblief weer.');
            }

            const blob     = await res.blob();
            const url      = URL.createObjectURL(blob);
            const date     = new Date().toISOString().slice(0, 10);
            const filename = `${type}-${date}.csv`;

            const anchor    = document.createElement('a');
            anchor.href     = url;
            anchor.download = filename;
            anchor.click();
            URL.revokeObjectURL(url);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Uitvoer het misluk.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleExport}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
                {loading
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Download size={16} />
                }
                {loading ? 'Besig met Uitvoer...' : (label ?? 'Uitvoer CSV')}
            </button>
            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}
        </div>
    );
}