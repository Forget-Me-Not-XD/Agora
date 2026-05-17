import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/get-current-user';
import DashboardShell from '@/components/DashboardShell';

const API_URL      = process.env.API_URL ?? 'http://localhost:3000';
const COOKIE_NAME  = 'akademia_token';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const token = cookies().get(COOKIE_NAME)?.value;
    if (!token) redirect('/api/auth/clear');

    let sessionValid = false;
    try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache:   'no-store',
    });
    sessionValid = res.ok;
    } catch {
    sessionValid = false;
    }

    if (!sessionValid) redirect('/api/auth/clear');

    const user = getCurrentUser();
    return <DashboardShell user={user}>{children}</DashboardShell>;
}
