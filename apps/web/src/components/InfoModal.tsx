'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';

interface InfoModalProps {
    title: string;
    children: React.ReactNode;
}

export default function InfoModal({ title, children }: InfoModalProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] hover:text-[var(--color-primary)] transition-colors shrink-0"
                aria-label="Meer inligting"
            >
                <Info size={15} />
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-sm shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center shrink-0">
                                    <Info size={13} className="text-white" />
                                </div>
                                <h3 className="text-sm font-bold text-[var(--color-text)]">{title}</h3>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1.5 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] transition-colors"
                            >
                                <X size={15} />
                            </button>
                        </div>
                        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            {children}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}