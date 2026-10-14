'use client';

// ========== Imports: ==========
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { deleteEventAction } from '@/lib/actions/event.actions';

interface DeleteEventButtonProps {
    eventId:    string;
    eventTitle: string;
    /** Aktiewe RSVPs, sodat die admin weet hoeveel mense se RSVP saam verdwyn */
    rsvpCount:  number;
    /** Waarheen ná die skrap: dieselfde plek as die bladsy se "Terug"-skakel */
    afterDeleteHref: string;
}

/**
 * Net vir admins. Skrap is permanent en vee ook die RSVPs uit, so dit vra eers bevestiging in 'n
 * venster wat sê wat alles verdwyn. Die backend weier 'n geleentheid met betaalde kaartjies; daardie
 * boodskap word in die venster gewys.
 */
export default function DeleteEventButton({ eventId, eventTitle, rsvpCount, afterDeleteHref }: DeleteEventButtonProps) {
    const router = useRouter();
    const [open, setOpen]   = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function close() {
        if (isPending) return;
        setOpen(false);
        setError(null);
    }

    function handleDelete() {
        setError(null);
        startTransition(async () => {
            const err = await deleteEventAction(eventId);
            if (err) {
                setError(err.replace(/^\[\d+\]\s*/, ''));
                return;
            }
            router.push(afterDeleteHref);
            router.refresh();
        });
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-red)] rounded-xl text-sm font-medium hover:border-[var(--color-red)] transition-colors"
            >
                <Trash2 size={14} /> Skrap
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={close}
                >
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="skrap-titel"
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={18} className="text-[var(--color-red)] shrink-0" />
                                <h3 id="skrap-titel" className="text-base font-bold text-[var(--color-text)]">Skrap geleentheid?</h3>
                            </div>
                            <button
                                type="button"
                                onClick={close}
                                aria-label="Maak toe"
                                className="p-1.5 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] transition-colors"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="space-y-2 text-sm text-[var(--color-text-subtle)] leading-relaxed">
                            <p>
                                <strong className="text-[var(--color-text)] [overflow-wrap:anywhere]">{eventTitle}</strong> word permanent geskrap.
                            </p>
                            <p>
                                {rsvpCount > 0
                                    ? `Die ${rsvpCount} ${rsvpCount === 1 ? 'RSVP' : 'RSVPs'} en die resensies word ook verwyder, en die geleentheid verdwyn uit gekoppelde Google- en Outlook-kalenders.`
                                    : 'Die geleentheid se resensies word ook verwyder.'}
                            </p>
                            <p className="font-medium text-[var(--color-text)]">Dit kan nie ongedaan gemaak word nie.</p>
                        </div>

                        {error && (
                            <p className="text-sm text-[var(--color-red)] rounded-xl border border-[var(--color-red)] px-3 py-2">{error}</p>
                        )}

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={close}
                                disabled={isPending}
                                className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
                            >
                                Kanselleer
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isPending}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-red)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                            >
                                {isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                {isPending ? 'Besig om te skrap…' : 'Ja, skrap'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
