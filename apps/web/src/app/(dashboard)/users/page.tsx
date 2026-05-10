import { AlertCircle } from 'lucide-react';
import { MOCK_USERS } from '@/lib/mock-data';
import { canManageUsers, getRoleLabel, getRoleBadgeColor } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/get-current-user';

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
                    {MOCK_USERS.length} geregistreerde gebruikers
                </p>
            </div>

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

                <div className="divide-y divide-[var(--color-border)]">
                    {MOCK_USERS.map((u) => (
                        <div
                            key={u.id}
                            className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4 px-5 py-4 items-center hover:bg-[var(--color-bg)] transition-colors"
                        >
                            <p className="text-sm font-medium text-[var(--color-text)]">
                                {u.name} {u.surname}
                            </p>
                            <p className="text-sm text-[var(--color-text-subtle)] truncate">
                                {u.email}
                            </p>
                            <div>
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(u.role)}`}
                                >
                                    {getRoleLabel(u.role)}
                                </span>
                            </div>
                            <p className="text-sm text-[var(--color-text-subtle)]">
                                {u.studyCenter}
                            </p>
                            <div>
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        u.isActive
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                    }`}
                                >
                                    {u.isActive ? 'Aktief' : 'Onaktief'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}