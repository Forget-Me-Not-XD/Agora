import { Suspense } from 'react';
import { Calendar, Ticket, Users, UserPlus } from 'lucide-react';
import StatCard from '@/components/StatCard';
import EventCard from '@/components/EventCard';
import { getCurrentUser } from '@/lib/get-current-user';
import { getEvents } from '@/lib/api/events';
import { getAdminKpis, getEventsSummary, getRsvpSummary, getRsvpsPerMonth, getBudgetPerMonth, getTicketRevenueSummary, getRevenuePerEvent, getRevenuePerMonth, getRevenueTrend, getRsvpsTrend, getRsvpStatusBreakdown } from '@/lib/api/analytics';
import { mergeMonthlySeries, mergeSingleMonthlySeries } from '@/lib/chart-utils';
import { AF_MONTHS_LONG } from '@/lib/format-date';
import { isEventOrganiser } from '@/lib/rbac';
import {
    METRICS,
    RSVP_STATUS_HELP,
    attentionItems,
    eventsVsRsvpsInsight,
    fillRateInsight,
    formatNumber,
    formatRand,
    metricHelp,
    monthlyTrendInsight,
    rsvpStatusInsight,
    rsvpWord,
    topEventsInsight,
} from '@/lib/metrics';
import ExportCsvButton from '@/components/ExportCsvButton';
import ChartCard from '@/components/charts/ChartCard';
import EventsRsvpsAreaChart from '@/components/charts/EventsRsvpsAreaChart';
import RsvpsPerMonthChart from '@/components/charts/RsvpsPerMonthChart';
import TopEventsBarChart from '@/components/charts/TopEventsBarChart';
import FillRateDonut from '@/components/charts/FillRateDonut';
import BudgetTrendChart from '@/components/charts/BudgetTrendChart';
import TicketRevenueTrendChart from '@/components/charts/TicketRevenueTrendChart';
import RsvpStatusBreakdown from '@/components/charts/RsvpStatusBreakdown';
import AttentionList from '@/components/dashboard/AttentionList';
import DosentDashboard from '@/components/dashboard/DosentDashboard';
import AttendeeDashboard from '@/components/dashboard/AttendeeDashboard';
import AutoRefresh from '@/components/AutoRefresh';
import { LoadError } from '@/components/ui/LoadError';

export const dynamic = 'force-dynamic';

// "Aandag nodig" kyk ook na geleenthede wat die afgelope twee weke geëindig het
const ATTENTION_LOOKBACK_MS = 15 * 24 * 60 * 60 * 1000;

export default function DashboardPage() {
    const user = getCurrentUser();
    const isAdmin = user.role === 'ADMIN';
    const isDosent = user.role === 'DOSENT';

    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">
                        Goeie dag, {user.name}
                    </h1>
                    <p className="text-sm text-[var(--color-text-subtle)] mt-1">{user.studyCenter}</p>
                </div>
                {isAdmin && <ExportCsvButton type="kpis" />}
            </div>

            <Suspense fallback={<StatCardSkeletons />}>
                {isAdmin ? <AdminDashboard /> : isDosent ? <DosentDashboard userId={user.id} /> : <AttendeeDashboard />}
            </Suspense>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-[var(--color-text)]">
                        {isAdmin || isDosent ? 'Opkomende Geleenthede' : 'Beskikbare Geleenthede'}
                    </h2>
                    <a href="/events" className="text-sm text-[var(--color-primary)] font-medium hover:underline">
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

function SectionHeading({ title, description }: { title: string; description: string }) {
    return (
        <div className="mb-3">
            <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
            <p className="text-sm text-[var(--color-text-subtle)]">{description}</p>
        </div>
    );
}

async function AdminDashboard() {
    const now = new Date();
    const [kpisRes, eventsSummaryRes, rsvpSummaryRes, rsvpsPerMonthRes, budgetPerMonthRes, ticketRevenueSummaryRes, revenuePerEventRes, revenuePerMonthRes, revenueTrendRes, rsvpStatusBreakdownRes, attentionEventsRes, rsvpsTrendRes] =
        await Promise.allSettled([
            getAdminKpis(),
            getEventsSummary(),
            getRsvpSummary(),
            getRsvpsPerMonth(),
            getBudgetPerMonth(),
            getTicketRevenueSummary(),
            getRevenuePerEvent(),
            getRevenuePerMonth(),
            getRevenueTrend(),
            getRsvpStatusBreakdown(),
            getEvents({ from: new Date(now.getTime() - ATTENTION_LOOKBACK_MS).toISOString() }),
            getRsvpsTrend(),
        ]);

    const kpis = kpisRes.status === 'fulfilled' ? kpisRes.value : null;
    const eventsSummary = eventsSummaryRes.status === 'fulfilled' ? eventsSummaryRes.value : null;
    const rsvpSummary = rsvpSummaryRes.status === 'fulfilled' ? rsvpSummaryRes.value : null;
    const rsvpsPerMonth = rsvpsPerMonthRes.status === 'fulfilled' ? rsvpsPerMonthRes.value : [];
    const budgetPerMonth = budgetPerMonthRes.status === 'fulfilled' ? budgetPerMonthRes.value : [];
    const ticketRevenueSummary = ticketRevenueSummaryRes.status === 'fulfilled' ? ticketRevenueSummaryRes.value : null;
    const revenuePerEvent = revenuePerEventRes.status === 'fulfilled' ? revenuePerEventRes.value : [];
    const revenuePerMonth = revenuePerMonthRes.status === 'fulfilled' ? revenuePerMonthRes.value : [];
    const revenueTrend = revenueTrendRes.status === 'fulfilled' ? revenueTrendRes.value : null;
    const rsvpsTrend = rsvpsTrendRes.status === 'fulfilled' ? rsvpsTrendRes.value : null;
    const rsvpStatusBreakdown = rsvpStatusBreakdownRes.status === 'fulfilled' ? rsvpStatusBreakdownRes.value : [];
    // null (nie []) as die versoek misluk het: 'n leë lys sou "Alles lyk goed" wys
    const attentionEvents = attentionEventsRes.status === 'fulfilled' ? attentionEventsRes.value : null;

    // Die leë reekse hierbo hou die grafieke aan die gang, maar 'n mislukte versoek mag nie as
    // "geen data" of "0%" gelees word nie. Elke grafiek wys eerder 'n fout as sy bron misluk het.
    const failed = (res: PromiseSettledResult<unknown>) => res.status === 'rejected';
    const monthlyFailed = failed(eventsSummaryRes) || failed(rsvpsPerMonthRes);

    const monthly = mergeMonthlySeries(eventsSummary?.eventsPerMonth ?? [], rsvpsPerMonth);
    const monthlyBudget = mergeSingleMonthlySeries(budgetPerMonth);
    const monthlyTicketRevenue = mergeSingleMonthlySeries(revenuePerMonth);

    const topEvents = eventsSummary?.top5Events ?? [];
    const rsvpStatusTotal = rsvpStatusBreakdown.reduce((s, d) => s + d.count, 0);
    const fillRatePct = rsvpSummary ? Math.round(rsvpSummary.averageFillRate * 100) : null;
    const ticketsSold = ticketRevenueSummary?.totalTicketsSold ?? 0;

    // Die KPI's vergelyk kalendermaande, so noem die maande eerder as "hierdie maand"
    const thisMonth = AF_MONTHS_LONG[now.getMonth()];
    const lastMonth = AF_MONTHS_LONG[(now.getMonth() + 11) % 12];

    const describeRsvps = (v: number) => `${formatNumber(v)} ${rsvpWord(Math.round(v))}`;

    return (
        <>
            <AutoRefresh />

        <div className="space-y-8">
            <ChartCard
                title="Geleenthede vs RSVPs"
                subtitle="Afgelope 12 maande"
                insight={monthlyFailed ? null : eventsVsRsvpsInsight(monthly)}
                help={{
                    title: 'Geleenthede vs RSVPs',
                    what: 'Die rooi area is hoeveel geleenthede elke maand plaasgevind het (linkeras); die blou area is hoeveel RSVPs in daardie maand gemaak is (regteras). As die twee saam styg en daal, trek geleenthede ewe veel mense.',
                    how: 'Maande word gemerk as die RSVPs baie meer ("Bo verwagting") of baie minder ("Onder verwagting") is as wat die aantal geleenthede daardie maand laat verwag. Kyk na daardie maande om te sien wat anders was.',
                }}
            >
                {monthlyFailed
                    ? <LoadError what="die maandelikse syfers" />
                    : <EventsRsvpsAreaChart data={monthly} trend={rsvpsTrend} />}
            </ChartCard>

            <AttentionList items={attentionEvents ? attentionItems(attentionEvents, now) : null} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Geleenthede"
                    value={kpis?.totalEvents.value ?? '--'}
                    sub="in totaal in die stelsel"
                    deltaPct={kpis?.totalEvents.deltaPct}
                    deltaLabel={`in ${thisMonth} vs. ${lastMonth}`}
                    icon={Calendar}
                    color="blue"
                    help={{
                        title: 'Geleenthede',
                        what: 'Hoeveel geleenthede daar in totaal in die stelsel is, ook dié wat al verby is.',
                        how: 'Die persentasie vergelyk hoeveel geleenthede hierdie maand plaasvind met hoeveel verlede maand plaasgevind het.',
                    }}
                />
                <StatCard
                    label="Aktiewe Gebruikers"
                    value={kpis?.activeUsers.value ?? '--'}
                    sub="rekeninge wat nie gedeaktiveer is nie"
                    icon={Users}
                    color="green"
                    help={{
                        title: 'Aktiewe Gebruikers',
                        what: 'Hoeveel rekeninge tans aktief is, met ander woorde nie deur \'n admin gedeaktiveer nie. Dit sê nie hoeveel mense die stelsel onlangs gebruik het nie.',
                    }}
                />
                <StatCard
                    label="Nuwe Registrasies"
                    value={kpis?.newSignups.value ?? '--'}
                    sub={`nuwe rekeninge in ${thisMonth}`}
                    deltaPct={kpis?.newSignups.deltaPct}
                    deltaLabel={`vs. ${lastMonth}`}
                    icon={UserPlus}
                    color="orange"
                    help={{
                        title: 'Nuwe Registrasies',
                        what: 'Hoeveel nuwe rekeninge in die huidige kalendermaand geskep is, deur self te registreer of deur \'n admin. Die syfer begin op die 1ste van elke maand weer by 0.',
                        how: 'Die persentasie vergelyk dit met verlede maand se nuwe rekeninge.',
                    }}
                />
                <StatCard
                    label="RSVPs"
                    value={kpis?.totalRsvps.value ?? '--'}
                    sub="in totaal, oor alle geleenthede"
                    deltaPct={kpis?.totalRsvps.deltaPct}
                    deltaLabel={`nuwe RSVPs in ${thisMonth} vs. ${lastMonth}`}
                    icon={Ticket}
                    color="red"
                    help={{
                        title: 'RSVPs',
                        what: '\'n RSVP is wanneer iemand aandui dat hulle na \'n geleentheid toe kom. Dit tel alle RSVPs nog ooit, ook gekanselleerdes.',
                        how: 'Die persentasie vergelyk hoeveel nuwe RSVPs hierdie maand gemaak is met verlede maand.',
                    }}
                />
            </div>

            <section>
                <SectionHeading title="RSVPs" description="Hoeveel mense vir geleenthede inskryf, en vir watter." />
                <div className="space-y-4">
                    <ChartCard
                        title="RSVPs per maand"
                        subtitle="Afgelope 12 maande"
                        insight={failed(rsvpsPerMonthRes) ? null : monthlyTrendInsight(monthly.map((p) => ({ label: p.label, value: p.b })), describeRsvps)}
                        help={{
                            title: 'RSVPs per maand',
                            what: 'Elke staaf is die aantal RSVPs wat in daardie maand gemaak is. Die stippellyn is die gemiddeld van die volledige maande, sodat jy dadelik sien of \'n maand goed of swak was. Die ligter staaf is hierdie maand, wat nog nie klaar is nie.',
                            how: 'Beweeg oor \'n staaf om ook te sien hoeveel geleenthede daardie maand was en hoeveel RSVPs elkeen gemiddeld gekry het.',
                        }}
                    >
                        {failed(rsvpsPerMonthRes)
                            ? <LoadError what="die RSVPs per maand" />
                            : <RsvpsPerMonthChart data={monthly} />}
                    </ChartCard>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                        <ChartCard
                            title="Gewildste geleenthede"
                            subtitle="Die 5 geleenthede met die meeste RSVPs"
                            insight={eventsSummary ? topEventsInsight(topEvents) : null}
                            help={{
                                title: 'Gewildste geleenthede',
                                what: 'Die vyf geleenthede met die meeste RSVPs nog ooit. Gebruik dit om te sien watter soort geleenthede mense trek.',
                            }}
                        >
                            {eventsSummary
                                ? <TopEventsBarChart data={topEvents} />
                                : <LoadError what="die gewildste geleenthede" />}
                        </ChartCard>
                        <ChartCard
                            title="RSVP-status"
                            subtitle="Hoe alle RSVPs tans verdeel is"
                            value={failed(rsvpStatusBreakdownRes) ? undefined : rsvpStatusTotal}
                            valueLabel="RSVPs in totaal"
                            insight={failed(rsvpStatusBreakdownRes) ? null : rsvpStatusInsight(rsvpStatusBreakdown)}
                            help={RSVP_STATUS_HELP}
                        >
                            {failed(rsvpStatusBreakdownRes)
                                ? <LoadError what="die RSVP-status" />
                                : <RsvpStatusBreakdown data={rsvpStatusBreakdown} />}
                        </ChartCard>
                    </div>
                </div>
            </section>

            <section>
                <SectionHeading title="Kapasiteit en begroting" description="Hoe vol geleenthede raak, en hoeveel geld daarvoor toegeken word." />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                    <ChartCard
                        title="Gemiddelde vulkoers"
                        subtitle="Oor alle geleenthede"
                        insight={fillRatePct === null ? null : fillRateInsight(fillRatePct)}
                        help={metricHelp(METRICS.fillRate)}
                    >
                        {fillRatePct === null
                            ? <LoadError what="die vulkoers" />
                            : <FillRateDonut percent={fillRatePct} />}
                    </ChartCard>
                    <ChartCard
                        title="Begroting per maand"
                        subtitle="Totale toegekende begroting van die geleenthede in elke maand"
                        className="lg:col-span-2"
                        insight={failed(budgetPerMonthRes) ? null : monthlyTrendInsight(monthlyBudget, formatRand, 'begroting')}
                        help={{
                            title: 'Begroting per maand',
                            what: 'Die som van die begrotings wat aan geleenthede toegeken is, volgens die maand waarin die geleentheid plaasvind. Dit is die toegekende bedrag, nie wat werklik spandeer is nie.',
                        }}
                    >
                        {failed(budgetPerMonthRes)
                            ? <LoadError what="die begroting per maand" />
                            : <BudgetTrendChart data={monthlyBudget} />}
                    </ChartCard>
                </div>
            </section>

            {/* Sonder betaalde geleenthede is hierdie afdeling net nulle, so wys dit dan glad nie */}
            {ticketsSold > 0 && (
                <section>
                    <SectionHeading title="Kaartjie-verkope" description="Inkomste uit betaalde geleenthede." />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                        <ChartCard
                            title="Kaartjie-inkomste per maand"
                            subtitle="Afgelope 12 maande"
                            value={formatRand(ticketRevenueSummary?.totalRevenue ?? 0)}
                            valueLabel={`${ticketsSold} kaartjie${ticketsSold === 1 ? '' : 's'} verkoop`}
                            className="lg:col-span-2"
                            insight={monthlyTrendInsight(monthlyTicketRevenue, formatRand, 'kaartjie-inkomste')}
                            help={{
                                title: 'Kaartjie-inkomste per maand',
                                what: 'Die geld wat in elke maand vir kaartjies betaal is. Net voltooide betalings tel, nie gekanselleerde of hangende betalings nie.',
                            }}
                        >
                            <TicketRevenueTrendChart data={monthlyTicketRevenue} trend={revenueTrend} />
                        </ChartCard>
                        <ChartCard title="Meeste inkomste" subtitle="Geleenthede volgens kaartjie-inkomste" bodyClassName="-mx-5 -mb-5">
                            <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                                {revenuePerEvent.map((e) => (
                                    <div key={e.eventTitle} className="px-5 py-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-[var(--color-text)] truncate">{e.eventTitle}</p>
                                            <p className="text-xs text-[var(--color-text-subtle)]">
                                                {e.ticketsSold} kaartjie{e.ticketsSold !== 1 ? 's' : ''} verkoop
                                            </p>
                                        </div>
                                        <p className="text-sm font-bold text-[var(--color-text)] shrink-0">{formatRand(e.revenue)}</p>
                                    </div>
                                ))}
                            </div>
                        </ChartCard>
                    </div>
                </section>
            )}
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
    const user = getCurrentUser();
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
                <EventCard key={event.id} event={event} manageable={isEventOrganiser(user, event)} />
            ))}
        </div>
    );
}
