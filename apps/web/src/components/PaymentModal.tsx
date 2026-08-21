'use client';

// ========== Imports: ==========
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { X, ShieldCheck } from 'lucide-react';
import type { Event } from '@/lib/api/events';
import type { InitiatePaymentResponse } from '@/lib/api/payments';
import { initiatePaymentAction, confirmPaymentAction } from '@/lib/actions/payments.actions';
import successAnim from '@/assets/Success.json';
import errorAnim   from '@/assets/Tomato_Error.json';
import loadingAnim from '@/assets/loading.json';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface PaymentModalProps {
    event: Event;
}

type Step = 'processing' | 'gateway' | 'redirecting' | 'success' | 'error';

function PayFastMark({ size = 'sm' }: { size?: 'sm' | 'md' }) {
    const textSize = size === 'md' ? 'text-lg' : 'text-sm';
    return (
        <span className={`inline-flex items-baseline font-black ${textSize} leading-none whitespace-nowrap`}>
            <span style={{ color: '#0a2540' }}>Pay</span>
            <span style={{ color: '#00b451' }}>Fast</span>
        </span>
    );
}

function redirectToPayFast(payment: InitiatePaymentResponse): void {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = payment.checkoutUrl;

    Object.entries(payment.checkout).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
}

export default function PaymentModal({ event }: PaymentModalProps) {
    const [open, setOpen]       = useState(false);
    const [step, setStep]       = useState<Step>('processing');
    const [payment, setPayment] = useState<InitiatePaymentResponse | null>(null);
    const [error, setError]     = useState<string | null>(null);

    const soldOut = event.ticketsAvailable !== null && event.ticketsAvailable <= 0;

    function close() {
        setOpen(false);
        setStep('processing');
        setPayment(null);
        setError(null);
    }

    async function startCheckout() {
        setOpen(true);
        setStep('processing');
        setError(null);
        const result = await initiatePaymentAction(event.id);
        if (result.error || !result.payment) {
            setError(result.error ?? 'Kon nie betaling begin nie.');
            setStep('error');
            return;
        }
        setPayment(result.payment);
        if (result.payment.simulation) {
            setStep('gateway');
        } else {
            setStep('redirecting');
            redirectToPayFast(result.payment);
        }
    }

    async function finishCheckout(outcome: 'success' | 'failed') {
        if (!payment?.simulation) return;
        setStep('processing');
        const result = await confirmPaymentAction(payment.simulation[outcome]);
        if (result.error) {
            setError(result.error);
            setStep('error');
            return;
        }
        if (result.success) {
            setStep('success');
        } else {
            setError('Die betaling is gekanselleer of het misluk.');
            setStep('error');
        }
    }

    return (
        <>
            <button
                onClick={() => void startCheckout()}
                disabled={soldOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {soldOut ? (
                    'Uitverkoop'
                ) : (
                    <>
                        <span className="bg-white rounded-md px-2 py-1 shadow-sm">
                            <PayFastMark />
                        </span>
                        Koop Kaartjie — R{event.ticketPrice ?? 0}
                    </>
                )}
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
                                <div className="rounded-md bg-white flex items-center justify-center shrink-0 border border-[var(--color-border)] px-2 py-1">
                                    <PayFastMark />
                                </div>
                                <h3 className="text-sm font-bold text-[var(--color-text)]">Koop Kaartjie</h3>
                            </div>
                            <button
                                onClick={close}
                                className="p-1.5 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] transition-colors"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            {step === 'processing' && (
                                <div className="flex flex-col items-center text-center space-y-3 py-6">
                                    <Lottie animationData={loadingAnim} loop style={{ width: 64, height: 64 }} />
                                    <p className="text-sm text-[var(--color-text-subtle)]">Besig...</p>
                                </div>
                            )}

                            {step === 'redirecting' && (
                                <div className="flex flex-col items-center text-center space-y-3 py-6">
                                    <Lottie animationData={loadingAnim} loop style={{ width: 64, height: 64 }} />
                                    <p className="text-sm text-[var(--color-text-subtle)]">Word na PayFast herlei...</p>
                                </div>
                            )}


                            {step === 'gateway' && payment && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                                        <ShieldCheck size={13} className="shrink-0" />
                                        <span>Gesimuleerde PayFast-omgewing (sandbox)</span>
                                    </div>
                                    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[var(--color-text-subtle)]">Item</span>
                                            <span className="font-medium text-[var(--color-text)]">{payment.itemName}</span>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <span className="text-[var(--color-text-subtle)]">Verwysing</span>
                                            <p className="font-mono text-xs text-[var(--color-text)] break-all">{payment.reference}</p>
                                        </div>
                                        <div className="flex items-center justify-between text-base font-semibold">
                                            <span className="text-[var(--color-text)]">Bedrag</span>
                                            <span className="text-[var(--color-text)]">R{payment.amount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => void finishCheckout('failed')}
                                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
                                        >
                                            Kanselleer
                                        </button>
                                        <button
                                            onClick={() => void finishCheckout('success')}
                                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-primary)] text-[var(--color-primary-text)] hover:opacity-90 transition-opacity"
                                        >
                                            Voltooi Betaling
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === 'success' && (
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <Lottie animationData={successAnim} loop={false} style={{ width: 96, height: 96 }} />
                                    <p className="text-sm font-medium text-[var(--color-text)]">Jou kaartjie is bevestig</p>
                                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-subtle)]">
                                        <ShieldCheck size={12} className="shrink-0" />
                                        Verwerk deur PayFast se sandbox-omgewing — toetsmodus, geen regte geld nie
                                    </div>
                                    <p className="text-xs text-[var(--color-text-subtle)]">Kyk by &quot;My RSVPs&quot; vir jou QR-kode.</p>
                                    <button
                                        onClick={close}
                                        className="w-full px-4 py-2 rounded-xl text-sm font-medium border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
                                    >
                                        Maak toe
                                    </button>
                                </div>
                            )}

                            {step === 'error' && (
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <Lottie animationData={errorAnim} loop={false} style={{ width: 96, height: 96 }} />
                                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                        {error ?? 'Iets het verkeerd geloop.'}
                                    </p>
                                    <button
                                        onClick={close}
                                        className="w-full px-4 py-2 rounded-xl text-sm font-medium border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
                                    >
                                        Maak toe
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
