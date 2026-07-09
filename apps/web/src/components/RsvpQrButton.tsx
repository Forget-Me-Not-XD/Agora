'use client';

import { useState } from 'react';
import { QrCode, X, Loader2, Download } from 'lucide-react';
import { getRsvpQrAction } from '@/lib/actions/rsvp.actions';

interface RsvpQrButtonProps {
    rsvpId: string;
    eventTitle: string;
    disabled?: boolean;
}

export default function RsvpQrButton({ rsvpId, eventTitle, disabled }: RsvpQrButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [qrDataUri, setQrDataUri] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleOpen() {
        setOpen(true);
        if (qrDataUri) return;
        setLoading(true);
        setError(null);
        const result = await getRsvpQrAction(rsvpId);
        if (result.error) setError(result.error);
        else setQrDataUri(result.qrDataUri ?? null);
        setLoading(false);
    }

    function close() {
        setOpen(false);
    }

    if (disabled) {
        return <span className="text-xs text-[var(--color-text-subtle)]">—</span>;
    }

    return (
        <>
            <button
                onClick={handleOpen}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
                <QrCode size={14} />
                QR-kode
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={close}
                >
                    <div
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-sm shadow-2xl p-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-[var(--color-text)] truncate pr-2">{eventTitle}</h3>
                            <button
                                onClick={close}
                                className="p-1.5 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] transition-colors shrink-0"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center py-10 gap-3">
                                <Loader2 size={28} className="animate-spin text-[var(--color-primary)]" />
                                <p className="text-xs text-[var(--color-text-subtle)]">Laai QR-kode...</p>
                            </div>
                        ) : error ? (
                            <p className="text-sm text-[var(--color-red)] text-center py-6">{error}</p>
                        ) : qrDataUri ? (
                            <div className="flex flex-col items-center gap-4">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={qrDataUri}
                                    alt={`QR-kode vir ${eventTitle}`}
                                    className="w-56 h-56 rounded-lg border border-[var(--color-border)]"
                                />
                                <p className="text-xs text-[var(--color-text-subtle)] text-center">
                                    Wys hierdie QR-kode by die deur
                                </p>
                                <a
                                    href={qrDataUri}
                                    download={`rsvp-qr-${rsvpId}.png`}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                                >
                                    <Download size={15} />
                                    Laai af
                                </a>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </>
    );
}
