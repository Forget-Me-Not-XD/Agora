// ========== Imports: ==========
import { Ticket, CheckCircle2, CalendarClock } from 'lucide-react';
import StatCard from '@/components/StatCard';
import UpcomingEventsCarousel from './UpcomingEventsCarousel';
import MyBookingsTable from './MyBookingsTable';
import PendingReviewsCard from './PendingReviewsCard';
import { getMyRsvps } from '@/lib/api/rsvp';
import { getPendingReviews } from '@/lib/api/reviews';
import { getSession } from '@/lib/session';

export default async function AttendeeDashboard() {
    const [rsvps, pendingReviews] = await Promise.all([
        getMyRsvps().catch(() => []),
        // Die kaart is net 'n herinnering, so as dit nie wil laai nie, wys ons dit eerder nie
        getPendingReviews().catch(() => []),
    ]);
    const session = getSession();
    const attendeeName = session ? `${session.name} ${session.surname}` : '';

    const now = Date.now();
    const upcoming = rsvps
        .filter((r) => r.event && r.status !== 'GEKANSELLEER' && new Date(r.event.date).getTime() >= now)
        .sort((a, b) => new Date(a.event!.date).getTime() - new Date(b.event!.date).getTime());
    const attended = rsvps.filter((r) => r.checkedIn);

    const upcomingTop5 = upcoming.slice(0, 5);

    return (
        <div className="space-y-6">
            <PendingReviewsCard reviews={pendingReviews} />

            {/* Die volgende geleentheid is die belangrikste ding op hierdie bladsy, so dit kry die volle breedte */}
            <UpcomingEventsCarousel upcoming={upcomingTop5} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Opkomend" value={upcoming.length} sub="geleenthede waarvoor jy RSVP het" icon={CalendarClock} color="blue" />
                <StatCard label="Bygewoon" value={attended.length} sub="geleenthede waar jy ingeteken het" icon={CheckCircle2} color="green" />
                <StatCard label="My RSVPs" value={rsvps.length} sub="in totaal, ook gekanselleerdes" icon={Ticket} color="orange" />
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                    Jou RSVPs <span className="text-[var(--color-text-subtle)] font-normal">({rsvps.length})</span>
                </h2>
                <MyBookingsTable data={rsvps} attendeeName={attendeeName} />
            </div>
        </div>
    );
}
