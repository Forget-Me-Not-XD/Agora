'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Calendar,
    CalendarDays,
    PlusCircle,
    BarChart2,
    Wallet,
    Users,
    ChevronDown,
    Ticket,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCurrentUser } from './UserContext';
import { Pill } from '@/components/ui/Pill';
import {
    canCreateEvents,
    canViewInsights,
    canViewBudget,
    canManageUsers,
    getRoleLabel,
    getRoleTone,
} from '@/lib/rbac';

interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
}

export default function Sidebar() {
    const pathname = usePathname();
    const user = useCurrentUser();
    const role = user.role;
    const [dashboardOpen, setDashboardOpen] = useState(true);

    const dashboardGroup: NavItem[] = [
        { href: '/dashboard', label: 'Oorsig', icon: LayoutDashboard },
        { href: '/calendar', label: 'Kalender', icon: CalendarDays },
    ];

    const flatItems: NavItem[] = [
        { href: '/events', label: 'Geleenthede', icon: Calendar },
        { href: '/rsvp', label: "My RSVP's", icon: Ticket },
        ...(canCreateEvents(role)
            ? [{ href: '/events/create', label: 'Skep Geleentheid', icon: PlusCircle }]
            : []),
        ...(canViewInsights(role)
            ? [{ href: '/insights', label: 'KI Insigte', icon: BarChart2 }]
            : []),
        ...(canViewBudget(role, user.tags)
            ? [{ href: '/budget', label: 'Begroting', icon: Wallet }]
            : []),
        ...(canManageUsers(role)
            ? [{ href: '/users', label: 'Gebruikers', icon: Users }]
            : []),
    ];

    const isGroupActive = dashboardGroup.some((i) => i.href === pathname);

    return (
        <aside className="static inset-y-0 left-0 w-64 flex flex-col shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border)]">
            <div className="p-5 border-b border-[var(--color-border)]">
                <h1 className="text-lg font-bold text-[var(--color-text)]">SPAN</h1>
                <p className="text-xs text-[var(--color-text-subtle)]">Akademia Portaal</p>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <button
                    onClick={() => setDashboardOpen((v) => !v)}
                    className={[
                        'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        isGroupActive
                            ? 'text-[var(--color-primary)]'
                            : 'text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]',
                    ].join(' ')}
                >
                    <span className="flex items-center gap-3">
                        <LayoutDashboard size={18} />
                        Dashboard
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${dashboardOpen ? 'rotate-180' : ''}`} />
                </button>

                {dashboardOpen && (
                    <div className="pl-8 space-y-1">
                        {dashboardGroup.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={[
                                        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)]'
                                            : 'text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]',
                                    ].join(' ')}
                                >
                                    <Icon size={16} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                )}

                <div className="h-px bg-[var(--color-border)] my-2" />

                {flatItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={[
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)]'
                                    : 'text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]',
                            ].join(' ')}
                        >
                            <Icon size={18} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {canCreateEvents(role) && (
                <div className="px-4">
                    <Link
                        href="/events/create"
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-text)] text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                        <PlusCircle size={16} />
                        Skep Geleentheid
                    </Link>
                </div>
            )}

            <div className="p-4 border-t border-[var(--color-border)]">
                <div className="px-3 py-2.5">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">
                        {user.name} {user.surname}
                    </p>
                    <p className="text-xs text-[var(--color-text-subtle)] truncate mb-1.5">
                        {user.email}
                    </p>
                    <Pill tone={getRoleTone(role)}>{getRoleLabel(role)}</Pill>
                    <Link
                        href="/popia"
                        className="block mt-2 text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-primary)] hover:underline"
                    >
                        POPIA / Privaatheid
                    </Link>
                </div>
            </div>
        </aside>
    );
}
