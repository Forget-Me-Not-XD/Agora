'use client';

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
    return (
        <UserProvider user={user}>
            <div className="flex h-screen bg-[var(--color-bg)] overflow-hidden">
                <Sidebar />
                <div className="flex flex-col flex-1 overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto p-6">{children}</main>
                </div>
            </div>
        </UserProvider>
    );
}