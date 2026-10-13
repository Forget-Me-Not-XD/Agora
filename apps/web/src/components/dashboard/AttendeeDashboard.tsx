// ========== Imports: ==========
import Link from 'next/link';
import { ArrowRight, QrCode, Star, Ticket, type LucideIcon } from 'lucide-react';
import UpcomingEventsCarousel, { type ActiveRsvp } from './UpcomingEventsCarousel';
import PendingReviewsCard from './PendingReviewsCard';
import { IconChip } from '@/components/ui/IconChip';
import { LoadError } from '@/components/ui/LoadError';
import { getMyRsvps, type MyRsvpEvent } from '@/lib/api/rsvp';
import { getPendingReviews } from '@/lib/api/reviews';
import { getSession } from '@/lib/session';

// Soos die backend: sonder 'n eindtyd duur 'n geleentheid drie uur
const EVENT_DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

// Hoeveel geleenthede die karrousel wys; die res is op die "My RSVP's"-bladsy
const CAROUSEL_LIMIT = 5;

function endsAt(event: MyRsvpEvent): number {
    const start = new Date(event.date).getTime();
    return event.endDate ? new Date(event.endDate).getTime() : start + EVENT_DEFAULT_DURATION_MS;
}

/**
 * Die dashboard vir studente en GAS-lede beantwoord net twee vrae: waarheen gaan ek volgende (en
 * wat het ek by die deur nodig), en wat moet ek nog doen (resensies). Die volledige lys RSVPs is op
 * die "My RSVP's"-bladsy; hier is net die volgende paar in die karrousel, sodat die bladsy nie 'n
 * lang tabel word nie.
 */
export default async function AttendeeDashboard() {
    const [rsvps, pendingReviews] = await Promise.all([
        getMyRsvps().catch(() => null),
        // Die kaart is net 'n herinnering, so as dit nie wil laai nie, wys ons dit eerder nie
        getPendingReviews().catch(() => []),
    ]);
    const session = getSession();
    const attendeeName = session ? `${session.name} ${session.surname}` : '';

    if (!rsvps) {
        return (
            <div className="space-y-6">
                <PendingReviewsCard reviews={pendingReviews} />
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                    <LoadError what="jou RSVPs" />
                </div>
            </div>
        );
    }

    // Alles wat nog nie verby is nie, ook 'n geleentheid wat nou aan die gang is
    const now = Date.now();
    const active = rsvps
        .filter((r): r is ActiveRsvp => r.event !== null && r.status !== 'GEKANSELLEER' && endsAt(r.event) >= now)
        .sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());
    const attendedCount = rsvps.filter((r) => r.checkedIn).length;

    return (
        <div className="space-y-6">
            <PendingReviewsCard reviews={pendingReviews} />

            {active.length > 0 ? (
                <>
                    <UpcomingEventsCarousel upcoming={active.slice(0, CAROUSEL_LIMIT)} attendeeName={attendeeName} />
                    <RsvpSummary activeCount={active.length} attendedCount={attendedCount} />
                </>
            ) : (
                <HowItWorks />
            )}
        </div>
    );
}

// ── Onder die karrousel: hoeveel RSVPs daar altesaam is, en waar die volledige lys is ──

function RsvpSummary({ activeCount, attendedCount }: { activeCount: number; attendedCount: number }) {
    return (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-5 py-3">
            <p className="text-sm text-[var(--color-text-subtle)]">
                <strong className="text-[var(--color-text)]">{activeCount}</strong> opkomende {activeCount === 1 ? 'RSVP' : 'RSVPs'}
                {' · '}<strong className="text-[var(--color-text)]">{attendedCount}</strong> bygewoon
            </p>
            <Link href="/rsvp" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline">
                Al my RSVPs en QR-kodes <ArrowRight size={14} />
            </Link>
        </div>
    );
}

// ── Vir wie nog niks beplan het nie: hoe die app werk, in drie stappe ──

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
    {
        icon:  Ticket,
        title: 'Kies \'n geleentheid',
        text:  'Kyk hieronder of op die Geleenthede-bladsy, en druk RSVP. Vir betaalde geleenthede koop jy \'n kaartjie.',
    },
    {
        icon:  QrCode,
        title: 'Wys jou QR-kode by die deur',
        text:  'Ná jou RSVP kry jy \'n QR-kode. Die organiseerder skandeer dit om jou in te teken.',
    },
    {
        icon:  Star,
        title: 'Sê hoe dit was',
        text:  'Ná die geleentheid kan jy \'n anonieme resensie gee. Dit verskyn dan hier op jou dashboard.',
    },
];

function HowItWorks() {
    return (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
            <div>
                <h2 className="text-base font-semibold text-[var(--color-text)]">Jy het nog niks beplan nie</h2>
                <p className="text-sm text-[var(--color-text-subtle)] mt-0.5">So werk dit:</p>
            </div>

            <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {STEPS.map((step, index) => (
                    <li key={step.title} className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                        <IconChip tone="primary" size="sm"><step.icon size={14} /></IconChip>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--color-text)]">{index + 1}. {step.title}</p>
                            <p className="text-xs text-[var(--color-text-subtle)] mt-0.5 leading-relaxed">{step.text}</p>
                        </div>
                    </li>
                ))}
            </ol>

            <Link
                href="/events"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-text)] text-sm font-semibold hover:opacity-90 transition-opacity"
            >
                Kyk watter geleenthede beskikbaar is <ArrowRight size={15} />
            </Link>
        </section>
    );
}
