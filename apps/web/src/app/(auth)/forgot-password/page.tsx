'use client';

// ========== Imports: ==========
import { useState, useTransition } from 'react';
import { Loader2, AlertCircle, MailCheck } from 'lucide-react';
import { forgotPasswordAction } from '@/lib/actions/auth.actions';

export default function ForgotPasswordPage() {
    const [ email, setEmail ]            = useState('');
    const [ sentTo, setSentTo ]          = useState<string | null>(null);
    const [ error, setError ]            = useState<string | null>(null);
    const [ isPending, startTransition ] = useTransition();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = email.trim();
        if (!trimmed) return;
        setError(null);

        startTransition(async () => {
            const err = await forgotPasswordAction(trimmed);
            if (err) setError(err);
            else setSentTo(trimmed);
        });
    };

    const inputStyle = {
        background:  'var(--color-bg)',
        borderColor: 'var(--color-border)',
        color:       'var(--color-text)',
    };
    const onFocus = (e: React.FocusEvent<HTMLInputElement>) =>
        (e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary)');
    const onBlur = (e: React.FocusEvent<HTMLInputElement>) =>
        (e.currentTarget.style.boxShadow = '');

    return (
        <div className="w-full max-w-sm">

            <div className="flex flex-col items-center mb-6">
                <h1 className="text-[28px] font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                    Wagwoord Vergeet
                </h1>
                <p className="text-[16px] mt-1 text-center" style={{ color: 'var(--color-text-subtle)' }}>
                    Vul jou e-posadres in, dan stuur ons vir jou &apos;n skakel om &apos;n nuwe wagwoord te stel.
                </p>
            </div>

            <div
                className="rounded-[16px] border p-6"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
                {sentTo ? (
                    // Die backend sê nie of die adres bestaan nie, so ons ook nie
                    <div className="flex flex-col items-center text-center gap-3">
                        <MailCheck size={32} style={{ color: 'var(--color-primary)' }} />
                        <p className="text-[16px] font-semibold" style={{ color: 'var(--color-text)' }}>
                            As daar &apos;n rekening vir {sentTo} bestaan, het ons &apos;n e-pos gestuur.
                        </p>
                        <p className="text-[16px]" style={{ color: 'var(--color-text-subtle)' }}>
                            Die skakel verval oor 30 minute. Kry jy niks nie? Kyk in jou gemorspos, of probeer weer.
                        </p>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div
                                className="mb-4 px-4 py-3 rounded-[12px] border text-[16px] font-semibold"
                                style={{ background: 'var(--color-bg)', borderColor: 'var(--color-red)' }}
                            >
                                <p className="flex items-center gap-1.5" style={{ color: 'var(--color-red)' }}>
                                    <AlertCircle size={13} className="shrink-0" />
                                    {error}
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate>
                            <label className="block mb-5">
                                <span className="text-[16px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
                                    E-pos adres <span style={{ color: 'var(--color-primary)' }}>*</span>
                                </span>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    placeholder="naam@akademia.ac.za"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isPending}
                                    required
                                    className="mt-1 w-full rounded-[10px] px-[14px] py-3 text-[16px] border focus:outline-none transition disabled:opacity-60"
                                    style={inputStyle}
                                    onFocus={onFocus}
                                    onBlur={onBlur}
                                />
                            </label>

                            <button
                                type="submit"
                                disabled={isPending || !email.trim()}
                                className="w-full rounded-[12px] py-[14px] text-[16px] font-black tracking-wide flex items-center justify-center gap-2 transition disabled:opacity-60"
                                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-text)' }}
                            >
                                {isPending ? (
                                    <><Loader2 size={16} className="animate-spin" /> Besig…</>
                                ) : (
                                    'Stuur Herstelskakel'
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>

            <a
                href="/login"
                className="mt-5 block text-center text-[16px] font-bold"
                style={{ color: 'var(--color-primary)' }}
            >
                Terug na aanmelding
            </a>
        </div>
    );
}
