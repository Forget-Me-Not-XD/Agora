'use client';

// ========== Imports: ==========
import { useMemo, useState } from 'react';
import { Eye, EyeOff, CheckCircle2, Circle, UserPlus, Loader2 } from 'lucide-react';
import { adminCreateUserAction } from '@/lib/actions/auth.actions';
import type { CreateUserPayload } from '@/lib/api/auth';

const ROLE_OPTIONS: { value: CreateUserPayload['role']; label: string }[] = [
    { value: 'GAS',          label: 'GAS'            },
    { value: 'STUDENT',      label: 'Student'        },
    { value: 'DOSENT',       label: 'Dosent'         },
    { value: 'ADMIN',        label: 'Administrateur' },
    { value: 'PHOTOGRAPHER', label: 'Fotograaf'      },
];

const STUDY_CENTERS = [
    'Centurion - Leriba',
    'Centurion - Gerhard straat',
    'Paarl',
    'George',
    'Somerset Wes',
] as const;

// Slegs ADMIN, DOSENT en STUDENT is aan 'n studiesentrum gekoppel — GAS en Fotograaf nie
const ROLES_WITH_STUDY_CENTER: ReadonlySet<CreateUserPayload['role']> = new Set(['ADMIN', 'DOSENT', 'STUDENT']);

const EMPTY_FORM: CreateUserPayload = {
    name: '', surname: '', email: '', password: '', role: 'DOSENT', studyCenter: '',
};

const fieldClass =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-shadow';

export default function CreateUserForm() {
    const [form, setForm]               = useState<CreateUserPayload>(EMPTY_FORM);
    const [saving, setSaving]           = useState(false);
    const [error, setError]             = useState<string | null>(null);
    const [success, setSuccess]         = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    const update = <K extends keyof CreateUserPayload>(key: K, value: CreateUserPayload[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const showStudyCenter = ROLES_WITH_STUDY_CENTER.has(form.role);

    const passwordRules = useMemo(() => ({
        minLength: form.password.length >= 8,
        hasUpper:  /[A-Z]/.test(form.password),
        hasLower:  /[a-z]/.test(form.password),
        hasNumber: /[0-9]/.test(form.password),
        hasSymbol: /[^a-zA-Z0-9\s]/.test(form.password),
    }), [form.password]);

    const allPasswordRulesPass = Object.values(passwordRules).every(Boolean);
    const showValidation       = passwordFocused || form.password.length > 0;

    const formComplete =
        form.name.trim()    !== '' &&
        form.surname.trim() !== '' &&
        form.email.trim()   !== '' &&
        allPasswordRulesPass &&
        (!showStudyCenter || form.studyCenter !== '');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formComplete) return;

        setSaving(true);
        setError(null);
        setSuccess(false);

        const result = await adminCreateUserAction({
            ...form,
            studyCenter: showStudyCenter ? form.studyCenter : '',
        });

        setSaving(false);
        if (result.error) {
            setError(result.error);
        } else {
            setSuccess(true);
            setPasswordVisible(false);
            setForm(EMPTY_FORM);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-5"
        >
            <div className="flex items-center gap-3">
                <div
                    className="inline-flex items-center justify-center shrink-0 p-2.5 rounded-xl"
                    style={{ color: 'var(--color-primary)', backgroundColor: 'color-mix(in srgb, var(--color-primary) 14%, transparent)' }}
                >
                    <UserPlus size={18} />
                </div>
                <div>
                    <h2 className="text-base font-bold text-[var(--color-text)]">Nuwe gebruiker skep</h2>
                    <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                        Skep DOSENT-, ADMIN-, STUDENT-, GAS- of FOTOGRAAF-rekeninge. Die gebruiker meld self later aan met hierdie wagwoord.
                    </p>
                </div>
            </div>

            <div className="h-px bg-[var(--color-border)]" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label htmlFor="cu-name" className="text-xs font-medium text-[var(--color-text-subtle)]">Naam</label>
                    <input
                        id="cu-name"
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        className={fieldClass}
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="cu-surname" className="text-xs font-medium text-[var(--color-text-subtle)]">Van</label>
                    <input
                        id="cu-surname"
                        value={form.surname}
                        onChange={(e) => update('surname', e.target.value)}
                        className={fieldClass}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label htmlFor="cu-email" className="text-xs font-medium text-[var(--color-text-subtle)]">E-pos</label>
                <input
                    id="cu-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className={fieldClass}
                />
            </div>

            <div className="space-y-1.5">
                <label htmlFor="cu-password" className="text-xs font-medium text-[var(--color-text-subtle)]">Tydelike wagwoord</label>
                <div className="relative">
                    <input
                        id="cu-password"
                        type={passwordVisible ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={(e) => update('password', e.target.value)}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        className={`${fieldClass} pr-10`}
                    />
                    <button
                        type="button"
                        aria-label={passwordVisible ? 'Versteek wagwoord' : 'Wys wagwoord'}
                        onClick={() => setPasswordVisible((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
                    >
                        {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>

                {/* Wagwoord-sterkte checklist */}
                <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ maxHeight: showValidation ? '150px' : '0px', opacity: showValidation ? 1 : 0 }}
                >
                    <div className="mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
                        {([
                            { ok: passwordRules.minLength, label: 'Minstens 8 karakters'   },
                            { ok: passwordRules.hasUpper,  label: 'Minstens 1 hoofletter'  },
                            { ok: passwordRules.hasLower,  label: 'Minstens 1 kleinletter' },
                            { ok: passwordRules.hasNumber, label: 'Minstens 1 syfer'       },
                            { ok: passwordRules.hasSymbol, label: 'Minstens 1 simbool'     },
                        ] as const).map((rule) => (
                            <div key={rule.label} className="flex items-center gap-2 py-0.5">
                                {rule.ok
                                    ? <CheckCircle2 size={13} className="shrink-0" style={{ color: 'var(--color-green)' }} />
                                    : <Circle size={13} className="shrink-0 text-[var(--color-text-subtle)]" />
                                }
                                <span
                                    className="text-xs"
                                    style={{ color: rule.ok ? 'var(--color-green)' : 'var(--color-text-subtle)', fontWeight: rule.ok ? 600 : 400 }}
                                >
                                    {rule.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label htmlFor="cu-role" className="text-xs font-medium text-[var(--color-text-subtle)]">Rol</label>
                    <select
                        id="cu-role"
                        value={form.role}
                        onChange={(e) => {
                            const role = e.target.value as CreateUserPayload['role'];
                            update('role', role);
                            if (!ROLES_WITH_STUDY_CENTER.has(role)) update('studyCenter', '');
                        }}
                        className={fieldClass}
                    >
                        {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {showStudyCenter && (
                    <div className="space-y-1.5">
                        <label htmlFor="cu-center" className="text-xs font-medium text-[var(--color-text-subtle)]">Studiesentrum</label>
                        <select
                            id="cu-center"
                            value={form.studyCenter}
                            onChange={(e) => update('studyCenter', e.target.value)}
                            className={fieldClass}
                        >
                            <option value="">Kies...</option>
                            {STUDY_CENTERS.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {error && <p className="text-xs text-[var(--color-red)]">{error}</p>}
            {success && <p className="text-xs text-[var(--color-green)]">Gebruiker suksesvol geskep.</p>}

            <button
                type="submit"
                disabled={saving || !formComplete}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-text)] text-sm font-medium py-2 px-4 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Besig om te skep…' : 'Skep gebruiker'}
            </button>
        </form>
    );
}
