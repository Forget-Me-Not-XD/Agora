// ========== Imports: ==========
import { Ticket, CheckCircle2, Clock } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartCard from '@/components/charts/ChartCard';
import RsvpStatusBreakdown from '@/components/charts/RsvpStatusBreakdown';
import UpcomingEventsCarousel from './UpcomingEventsCarousel';
import MyBookingsTable from './MyBookingsTable';
import { getMyRsvps } from '@/lib/api/rsvp';
import type { RsvpStatus } from '@/lib/api/rsvp';
import type { RsvpStatusCount } from '@/lib/api/analytics';
import { getSession } from '@/lib/session';

const STATUS_ORDER: RsvpStatus[] = ['BEVESTIG', 'HANGENDE', 'GEKANSELLEER'];

export default async function AttendeeDashboard() {
    const rsvps = await getMyRsvps().catch(() => []);
    const session = getSession();
    const attendeeName = session ? `${session.name} ${session.surname}` : '';

    const confirmed = rsvps.filter((r) => r.status === 'BEVESTIG');
    const pending = rsvps.filter((r) => r.status === 'HANGENDE');

    const statusCounts: RsvpStatusCount[] = STATUS_ORDER
        .map((status) => ({ status, count: rsvps.filter((r) => r.status === status).length }))
        .filter((s) => s.count > 0);

    const now = Date.now();
    const upcoming = rsvps
        .filter((r) => r.event && r.status !== 'GEKANSELLEER' && new Date(r.event.date).getTime() >= now)
        .sort((a, b) => new Date(a.event!.date).getTime() - new Date(b.event!.date).getTime());

    const upcomingTop5 = upcoming.slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="My Besprekings" value={rsvps.length} sub="in totaal" icon={Ticket} color="blue" />
                <StatCard label="Bevestig" value={confirmed.length} sub="gereed om by te woon" icon={CheckCircle2} color="green" />
                <StatCard label="Hangende" value={pending.length} sub="wag vir bevestiging" icon={Clock} color="orange" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                <UpcomingEventsCarousel upcoming={upcomingTop5} />

                <ChartCard title="Jou RSVP-status" subtitle="Verdeling van jou besprekings" value={rsvps.length} valueLabel="in totaal">
                    <RsvpStatusBreakdown data={statusCounts} />
                </ChartCard>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                    Jou Besprekings <span className="text-[var(--color-text-subtle)] font-normal">({rsvps.length})</span>
                </h2>
                <MyBookingsTable data={rsvps} attendeeName={attendeeName} />
            </div>
        </div>
    );
}
