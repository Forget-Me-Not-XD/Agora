'use client';

import Link from 'next/link';

import { useTransition } from 'react';
import { Menu, Bell, Sun, Moon, LogOut, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCurrentUser } from './UserContext';
import { logoutAction } from '@/lib/actions/auth.actions';

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const { theme, setTheme } = useTheme();
    const user = useCurrentUser();
    const [isPending, startTransition] = useTransition();

    function handleLogout() {
        startTransition(async () => {
            await logoutAction();
        });
    }

    return (
        <header className="h-16 flex items-center justify-between px-6 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
            <button
                onClick={onMenuClick}
                className="p-2 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-colors"
            >
                <Menu size={20} />
            </button>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-colors"
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <button className="relative p-2 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-colors">
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-primary)] rounded-full" />
                </button>

                <Link href="/profile" 
                className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-semibold ml-1 hover:opacity-80 transition-opacity"
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
