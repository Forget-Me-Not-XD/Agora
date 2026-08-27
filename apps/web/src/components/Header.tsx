'use client';

import Link from 'next/link';

import { useState, useEffect, useRef, useTransition } from 'react';
import { Sun, Moon, LogOut, Loader2, Pencil } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCurrentUser } from './UserContext';
import { logoutAction } from '@/lib/actions/auth.actions';
import { getRoleLabel, getRoleTone } from '@/lib/rbac';
import { Pill } from '@/components/ui/Pill';
import type { UserRole } from '@/lib/mock-data';

export default function Header() {
    const { theme, setTheme } = useTheme();
    const user = useCurrentUser();
    const [isPending, startTransition] = useTransition();
    const [mounted, setMounted] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!profileOpen) return;

        function handlePointerDown(e: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setProfileOpen(false);
            }
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setProfileOpen(false);
        }

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [profileOpen]);

    function handleLogout() {
        startTransition(async () => {
            await logoutAction();
        });
    }

    return (
        <header className="h-16 flex items-center justify-end px-6 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-colors"
                >
                    {mounted ? (theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />) : <Moon size={18} />}
                </button>

                <div className="relative ml-1" ref={profileRef}>
                    <button
                        onClick={() => setProfileOpen((v) => !v)}
                        className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-[var(--color-primary-text)] text-sm font-semibold hover:opacity-80 transition-opacity"
                        title="My Profiel"
                        aria-haspopup="true"
                        aria-expanded={profileOpen}
                    >
                        {user.name.charAt(0)}{user.surname.charAt(0)}
                    </button>

                    {profileOpen && (
                        <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden">
                            <div className="px-4 py-4 space-y-2">
                                <p className="text-sm font-bold text-[var(--color-text)] truncate">
                                    {user.name} {user.surname}
                                </p>
                                <Pill tone={getRoleTone(user.role as UserRole)}>
                                    {getRoleLabel(user.role as UserRole)}
                                </Pill>
                                <p className="text-xs text-[var(--color-text-subtle)] truncate">
                                    {user.email}
                                </p>
                            </div>

                            <Link
                                href="/profile"
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-[var(--color-primary)] border-t border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
                            >
                                <Pencil size={14} />
                                Redigeer Profiel
                            </Link>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleLogout}
                    disabled={isPending}
                    className="p-2 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] hover:text-[var(--color-red)] transition-colors disabled:opacity-50"
                    title="Meld af"
                >
                    {isPending ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                </button>
            </div>
        </header>
    );
}
