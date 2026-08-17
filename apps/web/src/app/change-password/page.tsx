'use client';

// ========== Imports: ==========
import { useMemo, useState, useTransition } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Circle } from 'lucide-react';
import { changePasswordAction } from '@/lib/actions/auth.actions';

export default function ChangePasswordPage() {
    const [ currentPassword, setCurrentPassword ]       = useState('');
    const [ newPassword, setNewPassword ]               = useState('');
    const [ confirmPassword, setConfirmPassword ]   = useState('');
    const [ currentVisible, setCurrentVisible ]         = useState(false);
    const [ newVisible, setNewVisible ]                 = useState(false);
    const [ confirmVisible, setConfirmVisible ]         = useState(false);
    const [ newFocused, setNewFocused ]                 = useState(false);
    const [ error, setError ]                           = useState<string | null>(null);
    const [ isPending, startTransition ]                = useTransition();

    const passwordRules = useMemo(() => ({
        minLength: newPassword.length >= 8,
        hasUpper:  /[A-Z]/.test(newPassword),
        hasLower:  /[a-z]/.test(newPassword),
        hasNumber: /[0-9]/.test(newPassword),
        hasSymbol: /[^a-zA-Z0-9\s]/.test(newPassword),
    }), [newPassword]);

    const allPasswordRulesPass = Object.values(passwordRules).every(Boolean);
    const showValidation       = newFocused || newPassword.length > 0;
    const passwordMatch        = newPassword === confirmPassword

    const formComplete =
    currentPassword !== '' &&
    newPassword      !== '' &&
    confirmPassword  !== '' &&
    passwordMatch &&
    allPasswordRulesPass;

    const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formComplete) return;
    if (!passwordMatch) {
        setError('Wagwoorde stem nie ooreen nie.');
        return;
    }
    setError(null);
    startTransition(async () => {
        const err = await changePasswordAction({ currentPassword, newPassword });
        if (err) setError(err);
    });
    };

    const inputStyle = {
    background:  'var(--color-bg)',
    borderColor: 'var(--color-border)',
    };
    const onFocus = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary)');
    const onBlur = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.boxShadow = '');
    const inputClass =
    'w-full rounded-[10px] px-[14px] py-3 text-[16px] border focus:outline-none transition disabled:opacity-60';

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-6">
            <h1 className="text-[28px] font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
                Stel Nuwe Wagwoord
            </h1>
            <p className="text-[16px] mt-1 text-center" style={{ color: 'var(--color-text-subtle)' }}>
                Jou wagwoord is deur &apos;n administrateur geskep. Stel &apos;n nuwe wagwoord voordat jy voortgaan.
            </p>
        </div>

        <div
            className="rounded-[16px] border p-6"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
            {error && (
            <div
                className="mb-4 px-4 py-3 rounded-[12px] border text-[16px] font-semibold space-y-1"
                style={{ background: 'var(--color-bg)', borderColor: 'var(--color-red)' }}
            >
                {error.split(', ').map((msg, i) => (
                <p key={i} className="flex items-center gap-1.5" style={{ color: 'var(--color-red)' }}>
                    <AlertCircle size={13} className="shrink-0" />
                    {msg}
                </p>
                ))}
            </div>
            )}

            <form onSubmit={handleSubmit} noValidate>

            <label className="block mb-3">
                <span className="text-[16px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
                Tydelike Wagwoord <span style={{ color: 'var(--color-primary)' }}>*</span>
                </span>
                <div className="relative mt-1">
                <input
                    type={currentVisible ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`${inputClass} pr-11`}
                    style={{ ...inputStyle, color: 'var(--color-text)' }}
                    placeholder="Jou huidige (tydelike) wagwoord"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isPending}
                    onFocus={onFocus}
                    onBlur={onBlur}
                />
                <button
                    type="button"
                    aria-label={currentVisible ? 'Versteek wagwoord' : 'Wys wagwoord'}
                    onClick={() => setCurrentVisible((v) => !v)}
                    disabled={isPending}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition disabled:opacity-50"
                    style={{ color: 'var(--color-text-subtle)' }}
                >
                    {currentVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
                </div>
            </label>

            <label className="block mb-0">
                <span className="text-[16px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
                Nuwe Wagwoord <span style={{ color: 'var(--color-primary)' }}>*</span>
                </span>
                <div className="relative mt-1">
                <input
                    type={newVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`${inputClass} pr-11`}
                    style={{ ...inputStyle, color: 'var(--color-text)' }}
                    placeholder="Minimum 8 karakters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isPending}
                    onFocus={() => setNewFocused(true)}
                    onBlur={() => setNewFocused(false)}
                />
                <button
                    type="button"
                    aria-label={newVisible ? 'Versteek wagwoord' : 'Wys wagwoord'}
                    onClick={() => setNewVisible((v) => !v)}
                    disabled={isPending}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition disabled:opacity-50"
                    style={{ color: 'var(--color-text-subtle)' }}
                >
                    {newVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
                </div>
            </label>

            <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: showValidation ? '220px' : '0px', opacity: showValidation ? 1 : 0 }}
            >
                <div
                className="mt-2 rounded-[10px] px-3 py-2 border"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                >
                {([
                    { ok: passwordRules.minLength, label: 'Minstens 8 karakters'   },
                    { ok: passwordRules.hasUpper,  label: 'Minstens 1 hoofletter'  },
                    { ok: passwordRules.hasLower,  label: 'Minstens 1 kleinletter' },
                    { ok: passwordRules.hasNumber, label: 'Minstens 1 syfer'       },
                    { ok: passwordRules.hasSymbol, label: 'Minstens 1 simbool'     },
                ] as const).map((rule) => (
                    <div key={rule.label} className="flex items-center gap-2 py-1">
                    {rule.ok
                        ? <CheckCircle size={13} style={{ color: 'var(--color-green)' }} />
                        : <Circle      size={13} style={{ color: 'var(--color-text-subtle)' }} />
                    }
                    <span
                        className="text-[16px]"
                        style={{
                        color:      rule.ok ? 'var(--color-green)' : 'var(--color-text-subtle)',
                        fontWeight: rule.ok ? 700 : 500,
                        }}
                    >
                        {rule.label}
                    </span>
                    </div>
                ))}
                </div>
            </div>

            <label className="block mt-3 mb-5">
                <span className="text-[16px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
                Bevestig Nuwe Wagwoord <span style={{ color: 'var(--color-primary)' }}>*</span>
                </span>
                <div className="relative mt-1">
                <input
                    type={confirmVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`${inputClass} pr-11`}
                    style={{
                    ...inputStyle,
                    color:       'var(--color-text)',
                    borderColor: confirmPassword.length > 0 && !passwordMatch
                        ? 'var(--color-red)'
                        : 'var(--color-border)',
                    }}
                    placeholder="Herhaal nuwe wagwoord"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isPending}
                    onFocus={onFocus}
                    onBlur={onBlur}
                />
                <button
                    type="button"
                    aria-label={confirmVisible ? 'Versteek wagwoord' : 'Wys wagwoord'}
                    onClick={() => setConfirmVisible((v) => !v)}
                    disabled={isPending}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition disabled:opacity-50"
                    style={{ color: 'var(--color-text-subtle)' }}
                >
                    {confirmVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
                </div>
                {confirmPassword.length > 0 && !passwordMatch && (
                <p className="flex items-center gap-1.5 mt-1.5 text-[16px] font-semibold" style={{ color: 'var(--color-red)' }}>
                    <AlertCircle size={12} className="shrink-0" />
                    Wagwoorde stem nie ooreen nie.
                </p>
                )}
            </label>

            <button
                type="submit"
                disabled={isPending || !formComplete}
                className="w-full rounded-[12px] py-[14px] text-[16px] font-black tracking-wide flex items-center justify-center gap-2 transition disabled:opacity-60"
                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-text)' }}
            >
                {isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Besig…</>
                ) : (
                'Stel Wagwoord'
                )}
            </button>
            </form>
        </div>
        </div>
    </div>
    );
}