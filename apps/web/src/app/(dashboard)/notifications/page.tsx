import { AlertCircle, Bell } from 'lucide-react';
import { getMyNotifications } from '@/lib/api/notifications';
import type { NotificationItem } from '@/lib/api/notifications';
import NotificationsList, { NotificationsUnreadSummary } from '@/components/NotificationsList';
import { IconChip } from '@/components/ui/IconChip';

// Geen AutoRefresh hier nie: die klokkie in die header poll reeds, en die lys lees uit dieselfde store
export default async function NotificationsPage() {
    let notifications: NotificationItem[] = [];
    let loadError: string | null = null;
    try {
        notifications = await getMyNotifications();
    } catch (err) {
        // 'n Leë lys sou hier "Alles gelees" wys, terwyl ons eintlik niks kon laai nie
        loadError = err instanceof Error ? err.message : 'Kon nie kennisgewings laai nie.';
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <IconChip tone="blue">
                    <Bell size={20} />
                </IconChip>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">Kennisgewings</h1>
                    {!loadError && (
                        <p className="text-sm text-[var(--color-text-subtle)] mt-1">
                            <NotificationsUnreadSummary initial={notifications} />
                        </p>
                    )}
                </div>
            </div>

            {loadError ? (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-10 flex flex-col items-center text-center">
                    <AlertCircle size={32} className="text-[var(--color-red)] mb-3" />
                    <p className="text-sm font-semibold text-[var(--color-text)]">Kon nie kennisgewings laai nie</p>
                    <p className="text-xs text-[var(--color-text-subtle)] mt-1">{loadError}</p>
                </div>
            ) : (
                <NotificationsList initial={notifications} />
            )}
        </div>
    );
}
