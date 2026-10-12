'use client';

import { useState, useEffect, useTransition } from 'react';
import { Sun, Moon, LogOut, Loader2, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCurrentUser } from './UserContext';
import { logoutAction } from '@/lib/actions/auth.actions';
import { usePredictionsStore } from '@/lib/stores/predictions.store';
import ProfileModal from './ProfileModal';
import NotificationBell from './NotificationBell';

interface HeaderProps {
    navOpen: boolean;
    onMenuClick: () => void;
}

export default function Header({ navOpen, onMenuClick }: HeaderProps) {
    const { theme, setTheme } = useTheme();
    const user = useCurrentUser();
    const [isPending, startTransition] = useTransition();
    const [mounted, setMounted] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    function handleLogout() {
        startTransition(async () => {
            // Die gekaste voorspellings hoort by die sessie wat nou eindig
            usePredictionsStore.getState().reset();
            await logoutAction();
        });
    }

    const isDark = mounted && theme === 'dark';
    const themeLabel = isDark ? 'Skakel oor na ligte modus' : 'Skakel oor na donker modus';

    return (
        <header className="h-16 flex items-center justify-between gap-2 px-4 sm:px-6 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
            {/* Net op smal skerms, waar die sybalk 'n laai is */}
            <button
                type="button"
                onClick={onMenuClick}
                className="p-2 -ml-2 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-colors lg:hidden"
                aria-label="Maak menu oop"
                aria-controls="hoofnavigasie"
                aria-expanded={navOpen}
            >
                <Menu size={20} />
            </button>

            <div className="flex items-center gap-2 ml-auto">
                <NotificationBell />
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-colors"
                    title={themeLabel}
                    aria-label={themeLabel}
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <button
                    onClick={() => setProfileOpen(true)}
                    className="ml-1 w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-[var(--color-primary-text)] text-sm font-semibold hover:opacity-80 transition-opacity"
                    title="My Profiel"
                    aria-label="My Profiel"
                    aria-haspopup="dialog"
                    aria-expanded={profileOpen}
                >
                    {user.name.charAt(0)}{user.surname.charAt(0)}
                </button>

                <button
                    onClick={handleLogout}
                    disabled={isPending}
                    className="p-2 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] hover:text-[var(--color-red)] transition-colors disabled:opacity-50"
                    title="Meld af"
                    aria-label="Meld af"
                >
                    {isPending ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                </button>
            </div>

            {profileOpen && <ProfileModal user={user} onClose={() => setProfileOpen(false)} />}
        </header>
    );
}
