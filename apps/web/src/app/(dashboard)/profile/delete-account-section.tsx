'use client';

// ========== Imports: ==========
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { deleteAccountAction } from '@/lib/actions/auth.actions';

export default function DeleteAccountSection() {
    const router = useRouter();
    const [open, setOpen]       = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    function close() {
        if (loading) return;
        setOpen(false);
        setError(null);
    }

    async function handleDelete() {
        setLoading(true);
        setError(null);
        const result = await deleteAccountAction();
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push('/login?deleted=true');
        }
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="text-sm font-medium text-red-600 dark:text-red-400 hover:opacity-80 transition-opacity"
            >
                Verwyder my rekening
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={close}
                >
                    <div
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-sm shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                                    <AlertTriangle size={13} className="text-white" />
                                </div>
                                <h3 className="text-sm font-bold text-[var(--color-text)]">Is jy seker?</h3>
                            </div>
                            <button
                                onClick={close}
                                disabled={loading}
                                className="p-1.5 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            <p className="text-sm text-[var(--color-text)] leading-relaxed">
                                Jou rekening en persoonlike data word permanent verwyder. Enige
                                aktiewe RSVP&apos;s word gekanselleer en verwyder van gekoppelde
                                Google/Outlook-kalenders. Hierdie aksie kan nie ongedaan gemaak
                                word nie.
                            </p>

                            {error && (
                                <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
                            )}

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={close}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-60"
                                >
                                    Kanselleer
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Verwyder rekening'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
