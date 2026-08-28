// ========== Imports: ==========
import { Calendar, MapPin, Ticket, CheckCircle2, Clock } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartCard from '@/components/charts/ChartCard';
import RsvpStatusBreakdown from '@/components/charts/RsvpStatusBreakdown';
import MyBookingsTable from './MyBookingsTable';
import { getMyRsvps } from '@/lib/api/rsvp';
import type { RsvpStatus } from '@/lib/api/rsvp';
import type { RsvpStatusCount } from '@/lib/api/analytics';
import { formatDateLong } from '@/lib/format-date';

const STATUS_ORDER: RsvpStatus[] = ['BEVESTIG', 'HANGENDE', 'GEKANSELLEER'];

export default async function AttendeeDashboard() {
    const rsvps = await getMyRsvps().catch(() => []);

    const confirmed = rsvps.filter((r) => r.status === 'BEVESTIG');
    const pending = rsvps.filter((r) => r.status === 'HANGENDE');

    const statusCounts: RsvpStatusCount[] = STATUS_ORDER
        .map((status) => ({ status, count: rsvps.filter((r) => r.status === status).length }))
        .filter((s) => s.count > 0);

    const now = Date.now();
    const upcoming = rsvps
        .filter((r) => r.event && r.status !== 'GEKANSELLEER' && new Date(r.event.date).getTime() >= now)
        .sort((a, b) => new Date(a.event!.date).getTime() - new Date(b.event!.date).getTime());

    const next = upcoming[0];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="My Besprekings" value={rsvps.length} sub="in totaal" icon={Ticket} color="blue" />
                <StatCard label="Bevestig" value={confirmed.length} sub="gereed om by te woon" icon={CheckCircle2} color="green" />
                <StatCard label="Hangende" value={pending.length} sub="wag vir bevestiging" icon={Clock} color="orange" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                {next?.event ? (
                    <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                        <p className="text-xs text-[var(--color-text-subtle)] mb-1">Jou volgende geleentheid</p>
                        <h2 className="text-lg font-bold text-[var(--color-text)]">{next.event.title}</h2>
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                            <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-subtle)]">
                                <Calendar size={14} className="shrink-0" /> {formatDateLong(next.event.date)}
                            </span>
                            <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-subtle)]">
                                <MapPin size={14} className="shrink-0" /> {next.event.location}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex items-center justify-center">
                        <p className="text-sm text-[var(--color-text-subtle)]">Geen opkomende geleenthede bespreek nie.</p>
                    </div>
                )}

                <ChartCard title="Jou RSVP-status" subtitle="Verdeling van jou besprekings" value={rsvps.length} valueLabel="in totaal">
                    <RsvpStatusBreakdown data={statusCounts} />
                </ChartCard>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                    Jou Besprekings <span className="text-[var(--color-text-subtle)] font-normal">({rsvps.length})</span>
                </h2>
                <MyBookingsTable data={rsvps} />
            </div>
        </div>
    );
}
