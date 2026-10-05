'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Star, X } from 'lucide-react';

interface ReviewModalProps {
    title:    string;
    children: React.ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Die dashboard rol in <main>, nie in die body nie, so ons sluit die naaste ouer wat rol
function findScrollParent(element: HTMLElement): HTMLElement {
    for (let node = element.parentElement; node; node = node.parentElement) {
        const { overflowY } = getComputedStyle(node);
        if (overflowY === 'auto' || overflowY === 'scroll') return node;
    }
    return document.body;
}

// Die modal is 'n onderskepte roete, so toemaak is net terug na die bladsy daaronder
export default function ReviewModal({ title, children }: ReviewModalProps) {
    const router = useRouter();
    const overlayRef = useRef<HTMLDivElement>(null);
    const dialogRef  = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const overlay = overlayRef.current;
        const dialog  = dialogRef.current;
        if (!overlay || !dialog) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;
        const scrollParent = findScrollParent(overlay);
        const previousOverflow = scrollParent.style.overflow;

        scrollParent.style.overflow = 'hidden';
        dialog.focus();

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                router.back();
                return;
            }
            if (e.key !== 'Tab' || !dialog) return;

            // Hou Tab binne die modal, anders beland die fokus op die bladsy daaronder
            const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last  = focusable[focusable.length - 1];
            const active = document.activeElement;
            const outside = active === dialog || !dialog.contains(active);

            if (e.shiftKey && (outside || active === first)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && (outside || active === last)) {
                e.preventDefault();
                first.focus();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            scrollParent.style.overflow = previousOverflow;
            previouslyFocused?.focus();
        };
    }, [router]);

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => router.back()}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="review-modal-title"
                tabIndex={-1}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg shadow-2xl outline-none"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center shrink-0">
                            <Star size={13} className="text-[var(--color-primary-text)]" />
                        </div>
                        <h3 id="review-modal-title" className="text-sm font-bold text-[var(--color-text)] truncate">{title}</h3>
                    </div>
                    <button
                        onClick={() => router.back()}
                        aria-label="Maak toe"
                        className="p-1.5 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] transition-colors"
                    >
                        <X size={15} />
                    </button>
                </div>

                <div className="px-5 py-4 max-h-[75vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
