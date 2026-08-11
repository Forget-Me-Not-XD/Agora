import { Suspense } from 'react';
import { AlertCircle } from 'lucide-react';
import { canManageUsers } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/get-current-user';
import { getToken } from '@/lib/session';
import { getUsers } from '@/lib/api/users';
import CreateUserForm from './create-user-form';
import UserRow from './user-row';

export default function UsersPage() {
    const user = getCurrentUser();

    if (!canManageUsers(user.role)) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center py-24">
                <AlertCircle size={48} className="text-[var(--color-red)] mb-4" />
                <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">Toegang Geweier</h2>
                <p className="text-[var(--color-text-subtle)] text-sm">
                    Slegs administrateurs het toegang tot hierdie bladsy.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[var(--color-text)]">Gebruikersbestuur</h1>
                <p className="text-sm text-[var(--color-text-subtle)] mt-1">
                    Bestuur alle geregistreerde gebruikers in die stelsel
                </p>
            </div>

            <CreateUserForm />

            <Suspense fallback={<UsersTableSkeleton />}>
                <UsersTable />
            </Suspense>
        </div>
    );
}

// Haal en wys alle gebruikers (slegs bereikbaar vir admins via die bladsy-hek)
async function UsersTable() {
    const token = getToken();

    let users;
    try {
        users = await getUsers(token);
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Onbekende fout';
        return (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-12 text-center">
                <p className="text-red-600 dark:text-red-400 text-sm">
                    Kon nie gebruikers laai nie: {msg.replace(/^\[\d+\]\s*/, '')}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-subtle)]">
                {users.length} geregistreerde gebruikers
            </p>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                <div className="hidden md:grid md:grid-cols-5 gap-4 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                    {['Naam', 'E-pos', 'Rol', 'Studiesentrum', 'Status'].map((h) => (
                        <p
                            key={h}
                            className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide"
                        >
                            {h}
                        </p>
                    ))}
                </div>

                {users.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                        <p className="text-[var(--color-text-subtle)] text-sm">Geen gebruikers gevind nie.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--color-border)]">
                        {users.map((u) => (
                            <UserRow key={u.id} user={u} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Grys geraamte terwyl die gebruikers laai
function UsersTableSkeleton() {
    return (
        <div className="space-y-3">
            <div className="h-4 w-40 rounded bg-[var(--color-border)] animate-pulse" />
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                <div className="hidden md:grid md:grid-cols-5 gap-4 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                    {['Naam', 'E-pos', 'Rol', 'Studiesentrum', 'Status'].map((h) => (
                        <p key={h} className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide">
                            {h}
                        </p>
                    ))}
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4 px-5 py-4 items-center animate-pulse">
                            <div className="h-4 w-32 rounded bg-[var(--color-border)]" />
                            <div className="h-4 w-40 rounded bg-[var(--color-border)]" />
                            <div className="h-5 w-20 rounded-full bg-[var(--color-border)]" />
                            <div className="h-4 w-28 rounded bg-[var(--color-border)]" />
                            <div className="h-5 w-16 rounded-full bg-[var(--color-border)]" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}