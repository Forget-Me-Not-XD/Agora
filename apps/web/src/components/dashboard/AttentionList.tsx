// ========== Imports: ==========
import Link from 'next/link';
import { BellRing, CheckCircle2, ChevronRight, ClipboardX, ScanLine, UserMinus, Users, type LucideIcon } from 'lucide-react';
import { IconChip } from '@/components/ui/IconChip';
import { LoadError } from '@/components/ui/LoadError';
import type { AttentionItem, AttentionKind } from '@/lib/metrics';

const KIND_ICON: Record<AttentionKind, LucideIcon> = {
    'check-in-now': ScanLine,
    'low-rsvps':    UserMinus,
    'almost-full':  Users,
    'no-check-ins': ClipboardX,
};

/**
 * Bo-aan die dashboard: geleenthede waaroor die organiseerder nou iets moet doen. Die reëls
 * self is in attentionItems (lib/metrics). As niks aandag nodig het nie, sê ons dit ook, sodat
 * die gebruiker weet die toets het gehardloop. `null` beteken die geleenthede kon nie laai nie:
 * dan weet ons nie of iets aandag nodig het nie, so ons sê dit eerder as "Alles lyk goed".
 */
export default function AttentionList({ items }: { items: AttentionItem[] | null }) {
    return (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
                <IconChip tone="primary" size="sm"><BellRing size={16} /></IconChip>
                <div className="min-w-0">
                    <h2 className="text-base font-semibold text-[var(--color-text)]">Aandag nodig</h2>
                    <p className="text-xs text-[var(--color-text-subtle)]">
                        Geleenthede waaroor jy nou iets kan doen
                    </p>
                </div>
            </div>

            {items === null ? (
                <LoadError what="die geleenthede" />
            ) : items.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-[var(--color-text-subtle)]">
                    <CheckCircle2 size={16} className="text-[var(--color-green)] shrink-0" />
                    Alles lyk goed. Geen geleenthede het nou aandag nodig nie.
                </p>
            ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                    {items.map((item) => {
                        const Icon = KIND_ICON[item.kind];
                        return (
                            <li key={`${item.kind}-${item.eventId}`}>
                                <Link
                                    href={`/events/${item.eventId}`}
                                    className="group flex items-start gap-3 py-3 -mx-2 px-2 rounded-xl hover:bg-[var(--color-bg)] transition-colors"
                                >
                                    <IconChip tone={item.tone} size="sm" className="mt-0.5"><Icon size={14} /></IconChip>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-[var(--color-text)]">
                                            <span className="font-semibold">{item.title}</span>
                                            <span className="text-[var(--color-text-subtle)]"> · {item.eventTitle}</span>
                                        </p>
                                        <p className="text-sm text-[var(--color-text-subtle)] mt-0.5">{item.detail}</p>
                                        <p className="text-sm text-[var(--color-text)] mt-1">{item.action}</p>
                                    </div>
                                    <ChevronRight
                                        size={16}
                                        className="text-[var(--color-text-subtle)] shrink-0 mt-1 group-hover:text-[var(--color-primary)] transition-colors"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
