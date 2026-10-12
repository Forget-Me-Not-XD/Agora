'use client';

import { useCallback, useState } from 'react';
import { UserProvider } from './UserContext';
import Sidebar from './Sidebar';
import Header from './Header';
import type { MockUser } from '@/lib/mock-data';

export default function DashboardShell({
    user,
    children,
}: {
    user: MockUser;
    children: React.ReactNode;
}) {
    // Op smal skerms is die sybalk 'n laai wat die kopstuk se menu-knoppie oopmaak
    const [navOpen, setNavOpen] = useState(false);
    const closeNav = useCallback(() => setNavOpen(false), []);

    return (
        <UserProvider user={user}>
            <div className="flex h-screen bg-[var(--color-bg)] overflow-hidden">
                <Sidebar open={navOpen} onClose={closeNav} />
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                    <Header navOpen={navOpen} onMenuClick={() => setNavOpen(true)} />
                    <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
                </div>
            </div>
        </UserProvider>
    );
}
