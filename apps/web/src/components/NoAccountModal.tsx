'use client';

// ========== Imports: ==========
import { useRouter } from 'next/navigation';
import { UserX, X } from 'lucide-react';

interface NoAccountModalProps {
    open: boolean;
    email: string | null;
    onClose: () => void;
}

export default function NoAccountModal({ open, email, onClose }: NoAccountModalProps) {
    const router = useRouter();

    if (!open) return null;

    function handleCreateAccount() {
        const target = email ? `/register?email=${encodeURIComponent(email)}` : '/register';
        router.push(target);
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-sm shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center shrink-0">
                            <UserX size={13} className="text-[var(--color-primary-text)]" />
                        </div>
                        <h3 className="text-sm font-bold text-[var(--color-text)]">Geen rekening gevind nie</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] transition-colors"
                    >
                        <X size={15} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    <p className="text-sm text-[var(--color-text)] leading-relaxed">
                        Jy het nie &apos;n rekening met hierdie besonderhede nie, skep asseblief &apos;n
                        profiel met hierdie besonderhede of as jy deel is van die Akademia span,
                        kontak asseblief jou administrateur.
                    </p>

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
                        >
                            Kanselleer
                        </button>
                        <button
                            onClick={handleCreateAccount}
                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-primary)] text-[var(--color-primary-text)] hover:opacity-90 transition-opacity"
                        >
                            Skep rekening
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
