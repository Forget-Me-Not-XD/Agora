'use client';

import Link from 'next/link';

import { useState, useEffect, useTransition } from 'react';
import { Sun, Moon, LogOut, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCurrentUser } from './UserContext';
import { logoutAction } from '@/lib/actions/auth.actions';

export default function Header() {
    const { theme, setTheme } = useTheme();
    const user = useCurrentUser();
    const [isPending, startTransition] = useTransition();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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

                <Link href="/profile"
                className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-[var(--color-primary-text)] text-sm font-semibold ml-1 hover:opacity-80 transition-opacity"
                title="My Profiel">
                    {user.name.charAt(0)}{user.surname.charAt(0)}
                </Link>

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
