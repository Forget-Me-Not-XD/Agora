import { Bell } from 'lucide-react';
import { getMyNotifications } from '@/lib/api/notifications';
import NotificationsList from '@/components/NotificationsList';
import { IconChip } from '@/components/ui/IconChip';
import AutoRefresh from '@/components/AutoRefresh';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
    const notifications = await getMyNotifications().catch(() => []);
    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <>
            <AutoRefresh />
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <IconChip tone="blue">
                        <Bell size={20} />
                    </IconChip>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-text)]">Kennisgewings</h1>
                        <p className="text-sm text-[var(--color-text-subtle)] mt-1">
                            {unreadCount > 0
                                ? `${unreadCount} ongelees`
                                : 'Alles gelees'}
                        </p>
                    </div>
                </div>

                <NotificationsList initial={notifications} />
            </div>
        </>
    );
}