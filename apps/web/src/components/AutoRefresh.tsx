'use client';

import { useRouter } from 'next/navigation';
import { usePollWhileActive } from '@/lib/user-activity';

const REFRESH_INTERVAL = 60000; // ms

// Auto refresh does not require a new API-request layer, uses Next.js existing server side fetching logic.
// It only refreshes while the user is actually using the page, otherwise it would keep an idle session alive.

export default function AutoRefresh() {
    const router = useRouter();

    usePollWhileActive(() => router.refresh(), REFRESH_INTERVAL);

    return null;
}