'use client';

// ========== Imports: ==========
import { useState } from 'react';
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

const EMPTY_FORM: CreateUserPayload = {
    name: '', surname: '', email: '', password: '', role: 'DOSENT', studyCenter: '',
};

export default function CreateUserForm() {
    const [form, setForm]       = useState<CreateUserPayload>(EMPTY_FORM);
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const update = <K extends keyof CreateUserPayload>(key: K, value: CreateUserPayload[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const showStudyCenter = form.role !== 'GAS';

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
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
            setForm(EMPTY_FORM);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4"
        >
            <div>
                <h2 className="text-lg font-bold text-[var(--color-text)]">Nuwe gebruiker skep</h2>
                <p className="text-sm text-[var(--color-text-subtle)] mt-1">
                    Skep DOSENT-, ADMIN- of FOTOGRAAF-rekeninge. Die gebruiker meld self later aan met hierdie wagwoord.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label htmlFor="cu-name" className="text-xs font-medium text-[var(--color-text-subtle)]">Naam</label>
                    <input
                        id="cu-name"
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="cu-surname" className="text-xs font-medium text-[var(--color-text-subtle)]">Van</label>
                    <input
                        id="cu-surname"
                        value={form.surname}
                        onChange={(e) => update('surname', e.target.value)}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
            </div>

            <div className="space-y-1.5">
                <label htmlFor="cu-password" className="text-xs font-medium text-[var(--color-text-subtle)]">Tydelike wagwoord</label>
                <input
                    id="cu-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label htmlFor="cu-role" className="text-xs font-medium text-[var(--color-text-subtle)]">Rol</label>
                    <select
                        id="cu-role"
                        value={form.role}
                        onChange={(e) => update('role', e.target.value as CreateUserPayload['role'])}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
                            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                            <option value="">Kies...</option>
                            {STUDY_CENTERS.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
            {success && <p className="text-xs text-green-600">Gebruiker suksesvol geskep.</p>}

            <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-text)] text-sm font-medium py-2 px-4 hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
                {saving ? 'Besig om te skep…' : 'Skep gebruiker'}
            </button>
        </form>
    );
}
