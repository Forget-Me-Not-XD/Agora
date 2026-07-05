'use client';

// ========== Imports: ==========
import { useState }                      from 'react';
import { updateUserTitleAction }         from '@/lib/actions/user.actions';
import { UserTitle }                     from '@/lib/api/users';
import type { MockUser }                 from '@/lib/mock-data';

const TITLE_OPTIONS: { value: UserTitle; label: string }[] = [
    { value: UserTitle.NONE, label: '(Geen titel)'},
    { value: UserTitle.DR,   label: 'Dr.'},
    { value: UserTitle.PROF, label: 'Prof.'},
    { value: UserTitle.LEC,  label: 'Lec.'},
    { value: UserTitle.MNR,  label: 'Mnr.'},
    { value: UserTitle.MEV,  label: 'Mev.'},
    { value: UserTitle.MX,   label: 'Mx.'},
];

interface Props {
    user: MockUser;
}

export default function ProfileForm({ user }: Props) {
    const [title,   setTitle]   = useState<UserTitle>((user.title as UserTitle) ?? UserTitle.NONE);
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleSave() {
        setSaving(true);
        setError(null);
        setSuccess(false);

        const result = await updateUserTitleAction(user.id, title);

        setSaving(false);
        if (result.error) {
            setError(result.error);
        } else {
            setSuccess(true);
        }
    }

    return (
        <div className="space-y-5">

            {/* Lees velde */}
            <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--color-text-subtle)]">Naam</p>
                <p className="text-sm text-[var(--color-text)]">{user.name} {user.surname}</p>
            </div>
            <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--color-text-subtle)]">E-pos</p>
                <p className="text-sm text-[var(--color-text)]">{user.email}</p>
            </div>
            <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--color-text-subtle)]">Rol</p>
                <p className="text-sm text-[var(--color-text)]">{user.role}</p>
            </div>

            <hr className="border-[var(--color-border)]" />

            {/* Titel aftreklys */}
            <div className="space-y-1.5">
                <label
                    htmlFor="title-select"
                    className="text-xs font-medium text-[var(--color-text-subtle)]"
                >
                    Akademiese Titel
                </label>
                <select
                    id="title-select"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value as UserTitle);
                        setSuccess(false);
                    }}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                    {TITLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Foutboodskap */}
            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}

            {/* Suksesboodskap */}
            {success && (
                <p className="text-xs text-green-600">Titel suksesvol gestoor.</p>
            )}

            {/* Stoor knoppie */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-text)] text-sm font-medium py-2 px-4 hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
                {saving ? 'Besig om te stoor…' : 'Stoor'}
            </button>
        </div>
    );
}