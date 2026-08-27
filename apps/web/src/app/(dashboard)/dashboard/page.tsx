import { Suspense } from 'react';
import { Calendar, Ticket, Users, UserPlus, CreditCard } from 'lucide-react';
import StatCard from '@/components/StatCard';
import EventCard from '@/components/EventCard';
import { getCurrentUser } from '@/lib/get-current-user';
import { getEvents } from '@/lib/api/events';
import { getAdminKpis, getEventsSummary, getRsvpSummary, getRsvpsPerMonth, getRecentRsvps, getBudgetPerMonth, getTicketRevenueSummary, getRevenuePerEvent, getRevenuePerMonth, getEventsTrend, getRsvpsTrend, getBudgetTrend, getRevenueTrend } from '@/lib/api/analytics';
import { mergeMonthlySeries, mergeSingleMonthlySeries } from '@/lib/chart-utils';
import ExportCsvButton from '@/components/ExportCsvButton';
import EventsRsvpsAreaChart from '@/components/charts/EventsRsvpsAreaChart';
import TopEventsBarChart from '@/components/charts/TopEventsBarChart';
import RsvpTrendLineChart from '@/components/charts/RsvpTrendLineChart';
import FillRateDonut from '@/components/charts/FillRateDonut';
import BudgetTrendChart from '@/components/charts/BudgetTrendChart';
import TicketRevenueTrendChart from '@/components/charts/TicketRevenueTrendChart';
import RecentBookingsTable from '@/components/charts/RecentBookingTable';
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

            {/* ── Greeting ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">
                        Goeie dag, {user.name}
                    </h1>
                    <p className="text-sm text-[var(--color-text-subtle)] mt-1">{user.studyCenter}</p>
                </div>
                <ExportCsvButton type="kpis" />
            </div>

            {/* ── Role-specific dashboard ── */}
            <Suspense fallback={<StatCardSkeletons />}>
                {isAdmin ? <AdminDashboard /> : isDosent ? <DosentDashboard userId={user.id} /> : <AttendeeDashboard />}
            </Suspense>

            {/* ── Upcoming / browsable events ── */}
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

// grys blokkies terwyl die data gehaal word — gedeel deur al drie rol-dashboards (elk wys 4 statistiekkaarte)
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

// Haal die admin-KPI's, grafiekdata en onlangse besprekings, en wys die volledige admin-uitleg
async function AdminDashboard() {
    const [kpisRes, eventsSummaryRes, rsvpSummaryRes, rsvpsPerMonthRes, recentRsvpsRes, budgetPerMonthRes, ticketRevenueSummaryRes, revenuePerEventRes, revenuePerMonthRes] =
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
    const budgetTrend = budgetTrendRes.status === 'fulfilled' ? budgetTrendRes.value : null;
    const revenueTrend = revenueTrendRes.status === 'fulfilled' ? revenueTrendRes.value : null;

    const monthly = mergeMonthlySeries(eventsSummary?.eventsPerMonth ?? [], rsvpsPerMonth);
    const monthlyBudget = mergeSingleMonthlySeries(budgetPerMonth);
    const monthlyTicketRevenue = mergeSingleMonthlySeries(revenuePerMonth);

    return (

        <>
            <AutoRefresh /> 

        <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Totale Geleenthede" value={kpis?.totalEvents.value ?? '--'} sub="in totaal" deltaPct={kpis?.totalEvents.deltaPct} icon={Calendar} color="blue" />
                <StatCard label="Aktiewe Gebruikers" value={kpis?.activeUsers.value ?? '--'} sub="tans aktief" deltaPct={kpis?.activeUsers.deltaPct} icon={Users} color="green" />
                <StatCard label="Nuwe Registrasies" value={kpis?.newSignups.value ?? '--'} sub="hierdie maand" deltaPct={kpis?.newSignups.deltaPct} icon={UserPlus} color="orange" />
                <StatCard label="Totale RSVPs" value={kpis?.totalRsvps.value ?? '--'} sub="oor alle geleenthede" deltaPct={kpis?.totalRsvps.deltaPct} icon={Ticket} color="red" />
            </div>

            {/* Main chart row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col">
                    <div className="mb-2 shrink-0">
                        <h2 className="text-sm font-semibold text-[var(--color-text)]">Geleenthede vs RSVPs</h2>
                        <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">Afgelope 12 maande</p>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <EventsRsvpsAreaChart data={monthly} />
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                        <div className="mb-2">
                            <h2 className="text-sm font-semibold text-[var(--color-text)]">Top Geleenthede</h2>
                            <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">Top 5 volgens totale RSVPs</p>
                        </div>
                        <TopEventsBarChart data={eventsSummary?.top5Events ?? []} />
                    </div>
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-2">RSVP-tendens</h2>
                        <RsvpTrendLineChart data={monthly} />
                    </div>
                </div>
            </div>

            {/* Reports overview */}
            <div>
                <h2 className="text-base font-semibold text-[var(--color-text)] mb-3">Verslae oorsig</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">Vulkoers-gesondheid</h3>
                        <FillRateDonut percent={(rsvpSummary?.averageFillRate ?? 0) * 100} />
                    </div>
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
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                    <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                        Onlangse Besprekings <span className="text-[var(--color-text-subtle)] font-normal">({kpis?.totalRsvps.value ?? recentRsvps.length} in totaal)</span>
                    </h2>
                    <RecentBookingsTable data={recentRsvps} />
                </div>
            </div>

            {/* Kaartjie-verkope */}
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
                    <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                        <div className="mb-2">
                            <h3 className="text-sm font-semibold text-[var(--color-text)]">Kaartjie-inkomste per Maand</h3>
                            <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">Afgelope 12 maande</p>
                        </div>
                        <TicketRevenueTrendChart data={monthlyTicketRevenue} />
                    </div>
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                        <div className="px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
                            <h3 className="text-sm font-semibold text-[var(--color-text)]">Top Geleenthede volgens Inkomste</h3>
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

// Grys geraamte terwyl die voorskou laai
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

// Haal die rol-sigbare geleenthede en wys die eerste 6
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
