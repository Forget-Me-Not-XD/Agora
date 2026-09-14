import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/get-current-user';
import DashboardShell from '@/components/DashboardShell';
import SessionKeepAlive from '@/components/SessionKeepAlive';

const API_URL      = process.env.API_URL ?? 'http://localhost:3000';
const COOKIE_NAME  = 'akademia_token';

// As die backend nie binne 5 s antwoord nie, wys ons eerder die bladsy as om langer te wag
const AUTH_CHECK_TIMEOUT_MS = 5_000;

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const token = cookies().get(COOKIE_NAME)?.value;
    if (!token) redirect('/api/auth/clear');

    // Net 'n 401 of 403 beteken die backend het die token verwerp, en dan probeer
    // /api/auth/clear eers refresh voordat dit uitlog. Is die backend af, stadig of gee dit
    // 'n 5xx, wys ons die bladsy gewoon. Anders word almal uitgelog elke keer as die backend
    // 'n hik het.
    let tokenRejected = false;
    try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache:   'no-store',
        signal:  AbortSignal.timeout(AUTH_CHECK_TIMEOUT_MS),
    });
    tokenRejected = res.status === 401 || res.status === 403;
    } catch {
    tokenRejected = false;
    }

    if (tokenRejected) redirect('/api/auth/clear');

    const user = getCurrentUser();
    return (
        <DashboardShell user={user}>
            <SessionKeepAlive />
            {children}
        </DashboardShell>
    );
}
