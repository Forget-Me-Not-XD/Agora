import { Suspense } from 'react';
import { Calendar, Ticket, Users, UserPlus, CreditCard } from 'lucide-react';
import StatCard from '@/components/StatCard';
import EventCard from '@/components/EventCard';
import { getCurrentUser } from '@/lib/get-current-user';
import { getEvents } from '@/lib/api/events';
import { getAdminKpis, getEventsSummary, getRsvpSummary, getRsvpsPerMonth, getRecentRsvps, getBudgetPerMonth, getTicketRevenueSummary, getRevenuePerEvent, getRevenuePerMonth, getEventsTrend, getRsvpsTrend, getBudgetTrend, getRevenueTrend, getRsvpStatusBreakdown } from '@/lib/api/analytics';
import { mergeMonthlySeries, mergeSingleMonthlySeries } from '@/lib/chart-utils';
import ExportCsvButton from '@/components/ExportCsvButton';
import ChartCard from '@/components/charts/ChartCard';
import EventsRsvpsAreaChart from '@/components/charts/EventsRsvpsAreaChart';
import TopEventsBarChart from '@/components/charts/TopEventsBarChart';
import RsvpTrendLineChart from '@/components/charts/RsvpTrendLineChart';
import FillRateDonut from '@/components/charts/FillRateDonut';
import BudgetTrendChart from '@/components/charts/BudgetTrendChart';
import TicketRevenueTrendChart from '@/components/charts/TicketRevenueTrendChart';
import RecentBookingsTable from '@/components/charts/RecentBookingTable';
import RsvpStatusBreakdown from '@/components/charts/RsvpStatusBreakdown';
import DosentDashboard from '@/components/dashboard/DosentDashboard';
import AttendeeDashboard from '@/components/dashboard/AttendeeDashboard';
import AutoRefresh from '@/components/AutoRefresh';

export const dynamic = 'force-dynamic';

function fmtRand(v: number): string {
    return `R${Math.round(v).toLocaleString('af-ZA')}`;
}

export default function DashboardPage() {
    const user = getCurrentUser();
    const isAdmin = user.role === 'ADMIN';
    const isDosent = user.role === 'DOSENT';

    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">
                        Goeie dag, {user.name}
                    </h1>
                    <p className="text-sm text-[var(--color-text-subtle)] mt-1">{user.studyCenter}</p>
                </div>
                <ExportCsvButton type="kpis" />
            </div>

            <Suspense fallback={<StatCardSkeletons />}>
                {isAdmin ? <AdminDashboard /> : isDosent ? <DosentDashboard userId={user.id} /> : <AttendeeDashboard />}
            </Suspense>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-[var(--color-text)]">
                        {isAdmin || isDosent ? 'Opkomende Geleenthede' : 'Beskikbare Geleenthede'}
                    </h2>
                    <a href="/events" className="text-xs text-[var(--color-primary)] font-medium hover:underline">
                        Sien almal
                    </a>
                </div>
                <Suspense fallback={<EventsPreviewSkeleton />}>
                    <EventsPreview />
                </Suspense>
            </div>
        </div>
    );
}

function StatCardSkeletons() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex items-start gap-4 animate-pulse"
                >
                    <div className="w-11 h-11 rounded-xl bg-[var(--color-border)]" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 rounded bg-[var(--color-border)]" />
                        <div className="h-6 w-16 rounded bg-[var(--color-border)]" />
                        <div className="h-3 w-20 rounded bg-[var(--color-border)]" />
                    </div>
                </div>
            ))}
        </div>
    );
}

async function AdminDashboard() {
    const [kpisRes, eventsSummaryRes, rsvpSummaryRes, rsvpsPerMonthRes, recentRsvpsRes, budgetPerMonthRes, ticketRevenueSummaryRes, revenuePerEventRes, revenuePerMonthRes, eventsTrendRes, rsvpsTrendRes, budgetTrendRes, revenueTrendRes, rsvpStatusBreakdownRes] =
        await Promise.allSettled([
            getAdminKpis(),
            getEventsSummary(),
            getRsvpSummary(),
            getRsvpsPerMonth(),
            getRecentRsvps(8),
            getBudgetPerMonth(),
            getTicketRevenueSummary(),
            getRevenuePerEvent(),
            getRevenuePerMonth(),
            getEventsTrend(),
            getRsvpsTrend(),
            getBudgetTrend(),
            getRevenueTrend(),
            getRsvpStatusBreakdown(),
        ]);

    const kpis = kpisRes.status === 'fulfilled' ? kpisRes.value : null;
    const eventsSummary = eventsSummaryRes.status === 'fulfilled' ? eventsSummaryRes.value : null;
    const rsvpSummary = rsvpSummaryRes.status === 'fulfilled' ? rsvpSummaryRes.value : null;
    const rsvpsPerMonth = rsvpsPerMonthRes.status === 'fulfilled' ? rsvpsPerMonthRes.value : [];
    const recentRsvps = recentRsvpsRes.status === 'fulfilled' ? recentRsvpsRes.value : [];
    const budgetPerMonth = budgetPerMonthRes.status === 'fulfilled' ? budgetPerMonthRes.value : [];
    const ticketRevenueSummary = ticketRevenueSummaryRes.status === 'fulfilled' ? ticketRevenueSummaryRes.value : null;
    const revenuePerEvent = revenuePerEventRes.status === 'fulfilled' ? revenuePerEventRes.value : [];
    const revenuePerMonth = revenuePerMonthRes.status === 'fulfilled' ? revenuePerMonthRes.value : [];
    const eventsTrend = eventsTrendRes.status === 'fulfilled' ? eventsTrendRes.value : null;
    const rsvpsTrend = rsvpsTrendRes.status === 'fulfilled' ? rsvpsTrendRes.value : null;
    const revenueTrend = revenueTrendRes.status === 'fulfilled' ? revenueTrendRes.value : null;
    const rsvpStatusBreakdown = rsvpStatusBreakdownRes.status === 'fulfilled' ? rsvpStatusBreakdownRes.value : [];
    const monthly = mergeMonthlySeries(eventsSummary?.eventsPerMonth ?? [], rsvpsPerMonth);
    const monthlyBudget = mergeSingleMonthlySeries(budgetPerMonth);
    const monthlyTicketRevenue = mergeSingleMonthlySeries(revenuePerMonth);

    const top5Total = (eventsSummary?.top5Events ?? []).reduce((s, e) => s + e.totalRsvps, 0);
    const rsvpStatusTotal = rsvpStatusBreakdown.reduce((s, d) => s + d.count, 0);
    const revenuePerEventTotal = revenuePerEvent.reduce((s, e) => s + e.revenue, 0);

    return (

        <>
            <AutoRefresh />

        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Totale Geleenthede" value={kpis?.totalEvents.value ?? '--'} sub="in totaal" deltaPct={kpis?.totalEvents.deltaPct} icon={Calendar} color="blue" />
                <StatCard label="Aktiewe Gebruikers" value={kpis?.activeUsers.value ?? '--'} sub="tans aktief" deltaPct={kpis?.activeUsers.deltaPct} icon={Users} color="green" />
                <StatCard label="Nuwe Registrasies" value={kpis?.newSignups.value ?? '--'} sub="hierdie maand" deltaPct={kpis?.newSignups.deltaPct} icon={UserPlus} color="orange" />
                <StatCard label="Totale RSVPs" value={kpis?.totalRsvps.value ?? '--'} sub="oor alle geleenthede" deltaPct={kpis?.totalRsvps.deltaPct} icon={Ticket} color="red" />
            </div>

            <ChartCard title="Geleenthede vs RSVPs" subtitle="Afgelope 12 maande">
                <EventsRsvpsAreaChart data={monthly} trend={rsvpsTrend} />
            </ChartCard>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <ChartCard title="Top Geleenthede" subtitle="Top 5 volgens totale RSVPs" value={top5Total} valueLabel="RSVPs (top 5)">
                    <TopEventsBarChart data={eventsSummary?.top5Events ?? []} />
                </ChartCard>
                <ChartCard title="RSVP-tendens" subtitle="Afgelope 12 maande">
                    <RsvpTrendLineChart data={monthly} trend={rsvpsTrend} />
                </ChartCard>
                <ChartCard title="RSVP Status oorsig" subtitle="Verdeling volgens status" value={rsvpStatusTotal} valueLabel="RSVPs in totaal">
                    <RsvpStatusBreakdown data={rsvpStatusBreakdown} />
                </ChartCard>
            </div>

            <div>
                <h2 className="text-base font-semibold text-[var(--color-text)] mb-3">Verslae oorsig</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    <ChartCard title="Vulkoers-gesondheid">
                        <FillRateDonut percent={(rsvpSummary?.averageFillRate ?? 0) * 100} />
                    </ChartCard>
                    <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                        <div className="mb-2">
                            <h3 className="text-sm font-semibold text-[var(--color-text)]">Begroting-tendens</h3>
                            <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                                Toegekende begroting per geleentheid · afgelope 12 maande
                            </p>
                        </div>
                        <BudgetTrendChart data={monthlyBudget} />
                    </div>
                </div>
                <ChartCard title="Onlangse Besprekings" value={kpis?.totalRsvps.value ?? recentRsvps.length} valueLabel="in totaal">
                    <RecentBookingsTable data={recentRsvps} />
                </ChartCard>
            </div>

            <div>
                <h2 className="text-base font-semibold text-[var(--color-text)] mb-3">Kaartjie-verkope</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <StatCard
                        label="Totale Kaartjie-inkomste"
                        value={fmtRand(ticketRevenueSummary?.totalRevenue ?? 0)}
                        sub={`${ticketRevenueSummary?.totalTicketsSold ?? 0} kaartjies verkoop`}
                        icon={CreditCard}
                        color="green"
                    />
                    <StatCard
                        label="Kaartjies Verkoop"
                        value={ticketRevenueSummary?.totalTicketsSold ?? 0}
                        sub="oor alle betaalde geleenthede"
                        icon={Ticket}
                        color="orange"
                    />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <ChartCard title="Kaartjie-inkomste per Maand" subtitle="Afgelope 12 maande" className="lg:col-span-2">
                        <TicketRevenueTrendChart data={monthlyTicketRevenue} trend={revenueTrend} />
                    </ChartCard>
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                        <div className="px-5 pt-4 pb-3 border-b border-[var(--color-border)] flex items-start justify-between gap-3">
                            <h3 className="text-sm font-semibold text-[var(--color-text)]">Top Geleenthede volgens Inkomste</h3>
                            <p className="text-xl font-bold text-[var(--color-text)] leading-none shrink-0">{fmtRand(revenuePerEventTotal)}</p>
                        </div>
                        <div className="divide-y divide-[var(--color-border)]">
                            {revenuePerEvent.length === 0 ? (
                                <p className="px-5 py-6 text-xs text-[var(--color-text-subtle)] text-center">
                                    Nog geen kaartjies verkoop nie.
                                </p>
                            ) : (
                                revenuePerEvent.map((e) => (
                                    <div key={e.eventTitle} className="px-5 py-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-[var(--color-text)] truncate">{e.eventTitle}</p>
                                            <p className="text-xs text-[var(--color-text-subtle)]">
                                                {e.ticketsSold} kaartjie{e.ticketsSold !== 1 ? 's' : ''} verkoop
                                            </p>
                                        </div>
                                        <p className="text-sm font-bold text-[var(--color-text)] shrink-0">{fmtRand(e.revenue)}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
        </>
    );
}

function EventsPreviewSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
                <div
                    key={i}
                    className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden animate-pulse"
                >
                    <div className="h-1 w-full bg-[var(--color-border)]" />
                    <div className="p-5 space-y-3">
                        <div className="h-4 w-2/3 rounded bg-[var(--color-border)]" />
                        <div className="h-3 w-full rounded bg-[var(--color-border)]" />
                        <div className="h-3 w-1/2 rounded bg-[var(--color-border)]" />
                        <div className="h-9 w-full rounded-xl bg-[var(--color-border)] mt-4" />
                    </div>
                </div>
            ))}
        </div>
    );
}

async function EventsPreview() {
    const events = await getEvents({ from: new Date().toISOString() }).catch(() => null);

    if (!events || events.length === 0) {
        return (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 text-center">
                <p className="text-[var(--color-text-subtle)] text-sm">
                    Geen geleenthede beskikbaar nie.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {events.slice(0, 6).map((event) => (
                <EventCard key={event.id} event={event} />
            ))}
        </div>
    );
}
