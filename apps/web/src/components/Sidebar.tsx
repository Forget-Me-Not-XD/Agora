'use client';

import { useEffect, useState } from 'react';
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
    Ticket,
    Bell,
    X,
    Loader2,
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

interface SidebarProps {
    /** Net vir smal skerms: of die laai oop is */
    open: boolean;
    onClose: () => void;
}

// 'n Bladsy onder 'n afdeling (bv. /events/123) hou daardie afdeling se skakel aktief
function isActive(pathname: string, href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ open, onClose }: SidebarProps) {
    const pathname = usePathname();
    const user = useCurrentUser();
    const role = user.role;

    // Maak die laai toe sodra die gebruiker na 'n ander bladsy gaan
    useEffect(() => {
        onClose();
    }, [pathname, onClose]);

    // Die item waarop pas geklik is. Dit lig dadelik op, nog voor die nuwe bladsy (of sy laaiskerm)
    // daar is: 'n stadige bladsy soos KI Insigte het anders gelyk asof die klik niks gedoen het nie.
    const [pendingHref, setPendingHref] = useState<string | null>(null);

    // Sodra die adres verander het, is die klik verwerk en neem die gewone aktief-toets oor
    useEffect(() => {
        setPendingHref(null);
    }, [pathname]);

    function handleNavClick(event: React.MouseEvent, href: string) {
        // Ctrl/Cmd/Shift-klik of die middelste knoppie maak 'n nuwe oortjie oop; hierdie bladsy bly
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        if (isActive(pathname, href)) return;
        setPendingHref(href);
    }

    const mainItems: NavItem[] = [
        { href: '/dashboard', label: 'Oorsig', icon: LayoutDashboard },
        { href: '/events', label: 'Geleenthede', icon: Calendar },
        { href: '/calendar', label: 'Kalender', icon: CalendarDays },
        { href: '/rsvp', label: "My RSVP's", icon: Ticket },
        { href: '/notifications', label: 'Kennisgewings', icon: Bell },
    ];

    const manageItems: NavItem[] = [
        ...(canViewInsights(role) ? [{ href: '/insights', label: 'KI Insigte', icon: BarChart2 }] : []),
        ...(canViewBudget(role, user.tags) ? [{ href: '/budget', label: 'Begroting', icon: Wallet }] : []),
        ...(canManageUsers(role) ? [{ href: '/users', label: 'Gebruikers', icon: Users }] : []),
    ];

    const renderItem = (item: NavItem) => {
        const Icon = item.icon;
        const pending = pendingHref === item.href;
        // Terwyl 'n klik besig is, is net daardie item aktief, nie meer die bladsy wat ons verlaat nie
        const active = pendingHref ? pending : isActive(pathname, item.href);
        return (
            <Link
                key={item.href}
                href={item.href}
                onClick={(event) => handleNavClick(event, item.href)}
                aria-current={active ? 'page' : undefined}
                aria-busy={pending || undefined}
                className={[
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    active
                        ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)]'
                        : 'text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]',
                ].join(' ')}
            >
                <Icon size={18} />
                {item.label}
                {pending && <Loader2 size={14} className="ml-auto animate-spin" aria-hidden="true" />}
            </Link>
        );
    };

    return (
        <>
            {/* Agtergrond agter die laai op smal skerms */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            <aside
                id="hoofnavigasie"
                className={[
                    'w-64 flex flex-col shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border)]',
                    'fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:translate-x-0',
                    open ? 'translate-x-0' : '-translate-x-full',
                ].join(' ')}
            >
                <div className="p-5 border-b border-[var(--color-border)] flex items-start justify-between gap-2">
                    <div>
                        <p className="text-lg font-bold text-[var(--color-text)]">AGORA</p>
                        <p className="text-xs text-[var(--color-text-subtle)]">Akademia Portaal</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] lg:hidden"
                        aria-label="Maak menu toe"
                    >
                        <X size={18} />
                    </button>
                </div>

                {canCreateEvents(role) && (
                    <div className="px-4 pt-4">
                        <Link
                            href="/events/create"
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-text)] text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            <PlusCircle size={16} />
                            Skep Geleentheid
                        </Link>
                    </div>
                )}

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Hoofnavigasie">
                    {mainItems.map(renderItem)}

                    {manageItems.length > 0 && (
                        <>
                            <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">
                                Bestuur
                            </p>
                            {manageItems.map(renderItem)}
                        </>
                    )}
                </nav>

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
        </>
    );
}
