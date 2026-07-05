import { Calendar, CalendarClock, Ticket, Gauge } from 'lucide-react';
import StatCard from '@/components/StatCard';
import MyEventsTable from './MyEventsTable';
import { getEvents } from '@/lib/api/events';

// Die backend skop nie geleenthede-lys volgens eienaarskap nie (net sigbaarheid),
// dus filter ons hier client-kant op createdBy vir 'n "my geleenthede" aansig.
export default async function DosentDashboard({ userId }: { userId: string }) {
    const visible = await getEvents().catch(() => []);
    const myEvents = visible.filter((e) => e.createdBy === userId);

    const now = Date.now();
    const upcoming = myEvents.filter((e) => new Date(e.date).getTime() >= now);
    const totalRsvps = myEvents.reduce((s, e) => s + e.confirmedAttendees, 0);
    const avgFillRate = myEvents.length > 0
        ? Math.round(
            (myEvents.reduce((s, e) => s + (e.maxCapacity > 0 ? e.confirmedAttendees / e.maxCapacity : 0), 0) / myEvents.length) * 100,
        )
        : 0;

    const sortedByDateDesc = [...myEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="My Geleenthede" value={myEvents.length} sub="deur jou geskep" icon={Calendar} color="blue" />
                <StatCard label="Opkomend" value={upcoming.length} sub="datum in die toekoms" icon={CalendarClock} color="green" />
                <StatCard label="Totale RSVPs" value={totalRsvps} sub="oor jou geleenthede" icon={Ticket} color="orange" />
                <StatCard label="Gemiddelde Vulkoers" value={`${avgFillRate}%`} sub="oor jou geleenthede" icon={Gauge} color="red" />
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                    Jou Geleenthede <span className="text-[var(--color-text-subtle)] font-normal">({myEvents.length})</span>
                </h2>
                <MyEventsTable events={sortedByDateDesc} />
            </div>
        </div>
    );
}
