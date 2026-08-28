'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_INTERVAL = 60000; // ms

// Auto refresh does not require a new API-request layer, uses Next.js existing server side fetching logic.

export default function AutoRefresh() {
    const router = useRouter();

    useEffect(() => {
        const interval = window.setInterval(() => {
            router.refresh();
        }, REFRESH_INTERVAL);

        return () => {
            window.clearInterval(interval);
        };
    }, [router]);

    return null;
}