// ========== Imports: ==========
import { Calendar, CalendarClock, Ticket, Gauge } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartCard from '@/components/charts/ChartCard';
import TopEventsBarChart from '@/components/charts/TopEventsBarChart';
import MyEventsTable from './MyEventsTable';
import AttentionList from './AttentionList';
import NextEventCard from './NextEventCard';
import { LoadError } from '@/components/ui/LoadError';
import { getEvents, type Event } from '@/lib/api/events';
import { deriveStatus } from '@/lib/event-view';
import type { RsvpPerEvent } from '@/lib/api/analytics';
import { METRICS, attentionItems, fillRateBand, metricHelp, topEventsInsight } from '@/lib/metrics';

export default async function DosentDashboard({ userId }: { userId: string }) {
    const visible = await getEvents().catch(() => null);

    // Alles op hierdie paneelbord kom uit hierdie een versoek. Sonder dit sou elke kaart nul wys
    // en die aandag-lys "Alles lyk goed" sê, so wys eerder net die fout.
    if (!visible) {
        return (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                <LoadError what="jou geleenthede" />
            </div>
        );
    }

    const myEvents = visible.filter((e) => e.createdBy === userId);

    const now = new Date();
    const byStart = (a: Event, b: Event) => new Date(a.date).getTime() - new Date(b.date).getTime();
    const upcoming = myEvents
        .filter((e) => new Date(e.date).getTime() >= now.getTime())
        .sort(byStart);
    // Die volgende geleentheid is die eerste een wat nog nie verby is nie, ook een wat nou aan die
    // gang is: dan het die dosent die deelnemers-kortpad die nodigste, om mense in te teken.
    const nextEvent = myEvents
        .filter((e) => deriveStatus(e) === 'ongoing' || deriveStatus(e) === 'upcoming')
        .sort(byStart)[0] ?? null;
    const totalRsvps = myEvents.reduce((s, e) => s + e.confirmedAttendees, 0);
    const withCapacity = myEvents.filter((e) => e.maxCapacity > 0);
    const avgFillRate = withCapacity.length > 0
        ? Math.round((withCapacity.reduce((s, e) => s + e.confirmedAttendees / e.maxCapacity, 0) / withCapacity.length) * 100)
        : 0;

    const topEvents: RsvpPerEvent[] = [...myEvents]
        .sort((a, b) => b.confirmedAttendees - a.confirmedAttendees)
        .slice(0, 5)
        .map((e) => ({ eventTitle: e.title, totalRsvps: e.confirmedAttendees }));

    const sortedByDateDesc = [...myEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-6">
            <AttentionList items={attentionItems(myEvents, now)} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="My Geleenthede" value={myEvents.length} sub="deur jou geskep" icon={Calendar} color="blue" />
                <StatCard label="Opkomend" value={upcoming.length} sub="nog nie plaasgevind nie" icon={CalendarClock} color="green" />
                <StatCard
                    label="RSVPs"
                    value={totalRsvps}
                    sub="oor al jou geleenthede"
                    icon={Ticket}
                    color="orange"
                    help={{
                        title: 'RSVPs',
                        what: 'Hoeveel RSVPs jou geleenthede altesaam het. Gekanselleerde RSVPs tel nie.',
                    }}
                />
                <StatCard
                    label="Gemiddelde Vulkoers"
                    value={withCapacity.length > 0 ? `${avgFillRate}%` : '--'}
                    sub={withCapacity.length > 0 ? fillRateBand(avgFillRate).label : 'nog geen geleenthede nie'}
                    icon={Gauge}
                    color="red"
                    help={metricHelp(METRICS.fillRate)}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                <NextEventCard event={nextEvent} />
                <ChartCard
                    title="Jou gewildste geleenthede"
                    subtitle="Jou 5 geleenthede met die meeste RSVPs"
                    insight={topEventsInsight(topEvents)}
                    help={{
                        title: 'Jou gewildste geleenthede',
                        what: 'Jou vyf geleenthede met die meeste RSVPs. Gebruik dit om te sien watter soort geleenthede jou gehoor trek.',
                    }}
                >
                    <TopEventsBarChart data={topEvents} />
                </ChartCard>
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
