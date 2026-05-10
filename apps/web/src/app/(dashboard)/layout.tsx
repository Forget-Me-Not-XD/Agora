import { getCurrentUser } from '@/lib/get-current-user';
import DashboardShell from '@/components/DashboardShell';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = getCurrentUser();
    return <DashboardShell user={user}>{children}</DashboardShell>;
}