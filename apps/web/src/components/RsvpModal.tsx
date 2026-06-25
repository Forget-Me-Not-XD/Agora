'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Ticket, X, Calendar, Clock, Users } from 'lucide-react';
import type { MockEvent } from '@/lib/mock-data';
import { rsvpToEventAction } from '@/lib/actions/rsvp.actions';
import successAnim from '@/assets/Success.json';
import warningAnim from '@/assets/Warning_Status.json';
import errorAnim   from '@/assets/Tomato_Error.json';
import loadingAnim from '@/assets/loading.json'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface RsvpModalProps {
    event: MockEvent;
}

export default function RsvpModal({ event }: RsvpModalProps) {
    const [open, setOpen]           = useState(false);
    const [loading, setLoading]     = useState(false);
    const [qrDataUri, setQrDataUri] = useState<string | null>(null);
    const [error, setError]         = useState<string | null>(null);

    const isFull = event.registered >= event.capacity;
    const availableSpots = Math.max(event.capacity - event.registered, 0);

    // Maak toe en herstel toestand
    function close() {
        setOpen(false);
        setLoading(false);
        setQrDataUri(null);
        setError(null);
    }

    async function handleConfirm() {
        setLoading(true);
        setError(null);
        const results = await rsvpToEventAction(event.id);
        if (results.error) {
            setError(results.error);
        } else {
            setQrDataUri(results.qrDataUri ?? null);
        }
        setLoading(false);
    }

    // asset volgens backend boodskap
    const isFullError  = error?.includes('vol bespreek') ?? false;      // oranje
    const errorMessage = error?.replace(/^\[\d+\]\s*/, '') ?? '';       // rooi

    return (
        <>
            {/* Skryf In-knoppie — gedeaktiveer (dowwer, nie klikbaar) as die geleentheid vol is */}
            <button
                onClick={() => setOpen(true)}
                disabled={isFull}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Ticket size={15} />
                Skryf In
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
                                <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center shrink-0">
                                    <Ticket size={13} className="text-white" />
                                </div>
                                <h3 className="text-sm font-bold text-[var(--color-text)]">Skryf In vir Geleentheid</h3>
                            </div>
                            <button
                                onClick={close}
                                className="p-1.5 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] transition-colors"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            {qrDataUri ? (
                                // sukses
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <Lottie animationData={successAnim} loop={false} style={{ width: 96, height: 96 }} />
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={qrDataUri} alt="RSVP QR-kode" className="w-44 h-44 rounded-lg border border-[var(--color-border)]" />
                                    <p className="text-sm font-medium text-[var(--color-text)]">Wys hierdie QR-kode by die deur</p>
                                    <button
                                        onClick={close}
                                        className="w-full px-4 py-2 rounded-xl text-sm font-medium border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
                                    >
                                        Maak toe
                                    </button>
                                </div>
                            ) : error ? (
                                // fout
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <Lottie animationData={isFullError ? warningAnim : errorAnim} loop={false} style={{ width: 96, height: 96 }} />
                                    <p className={`text-sm font-medium ${isFullError ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {errorMessage}
                                    </p>
                                    <button
                                        onClick={close}
                                        className="w-full px-4 py-2 rounded-xl text-sm font-medium border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
                                    >
                                        Maak toe
                                    </button>
                                </div>
                            ) : (
                                // inskryf form
                                <>
                                    <h4 className="text-sm font-semibold text-[var(--color-text)] leading-snug">
                                        {event.title}
                                    </h4>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                                            <Calendar size={13} className="shrink-0" />
                                            <span>{event.date}</span>
                                            <Clock size={13} className="ml-1 shrink-0" />
                                            <span>{event.time}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                                            <Users size={13} className="shrink-0" />
                                            <span>{availableSpots} plekke beskikbaar</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={close}
                                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
                                        >
                                            Kanselleer
                                        </button>
                                        <button
                                            onClick={handleConfirm}
                                            disabled={loading}
                                            className="flex-1 flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {loading ? <Lottie animationData={loadingAnim} loop style={{ width: 22, height: 22 }} /> : 'Bevestig'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}