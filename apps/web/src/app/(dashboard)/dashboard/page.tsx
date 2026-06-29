import { Suspense } from 'react';
import { Calendar, CalendarClock, Ticket, Gauge } from 'lucide-react';
import StatCard from '@/components/StatCard';
import EventCard from '@/components/EventCard';
import IncomeExpenseChart from '@/components/charts/IncomeExpenseChart';
import AttendanceChart from '@/components/charts/AttendanceChart';
import SatisfactionChart from '@/components/charts/SatisfactionChart';
import { MOCK_EVENTS, MOCK_BUDGET_ITEMS, MOCK_INSIGHTS } from '@/lib/mock-data';
import { filterEventsForUser, canViewBudget, canViewInsights } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/get-current-user';
import { getEvents } from '@/lib/api/events';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
    const user = getCurrentUser();
    const visibleEvents = filterEventsForUser(MOCK_EVENTS, user);

    /* ── Chart data (only computed for roles that can see them) ── */
    const showCharts = canViewInsights(user.role) || canViewBudget(user.role);

    const relevantEvents =
        user.role === 'ADMIN'
            ? MOCK_EVENTS
            : MOCK_EVENTS.filter((e) => e.createdBy === user.id);

    const budgetData = relevantEvents
        .map((event) => {
            const items = MOCK_BUDGET_ITEMS.filter((b) => b.eventId === event.id);
            const income = items.filter((b) => b.type === 'income').reduce((s, b) => s + b.amount, 0);
            const expense = items.filter((b) => b.type === 'expense').reduce((s, b) => s + b.amount, 0);
            return { label: event.title, income, expense };
        })
        .filter((d) => d.income > 0 || d.expense > 0);

    const relevantInsights =
        user.role === 'ADMIN'
            ? MOCK_INSIGHTS
            : MOCK_INSIGHTS.filter((i) => {
                  const ev = MOCK_EVENTS.find((e) => e.id === i.eventId);
                  return ev?.createdBy === user.id;
              });

    const attendanceData = relevantInsights
        .filter((i) => i.totalRegistered > 0 && i.totalAttended > 0)
        .map((i) => ({
            label: MOCK_EVENTS.find((e) => e.id === i.eventId)?.title ?? 'Onbekend',
            rate: i.attendanceRate,
            attended: i.totalAttended,
            registered: i.totalRegistered,
        }));

    const satisfactionData = relevantInsights
        .filter((i) => i.averageRating > 0)
        .map((i) => ({
            label: MOCK_EVENTS.find((e) => e.id === i.eventId)?.title ?? 'Onbekend',
            rating: i.averageRating,
        }));

    return (
        <div className="space-y-6">

            {/* ── Greeting ── */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--color-text)]">
                    Goeie dag, {user.name}
                </h1>
                <p className="text-sm text-[var(--color-text-subtle)] mt-1">{user.studyCenter}</p>
            </div>

            <Suspense fallback={<KpiSkeletons canSeeAll={canViewInsights(user.role)}/>}>
                <DashboardKpis canSeeAll={canViewInsights(user.role)}/>
            </Suspense>

            {/* ── Charts row (Admin + Dosent only) ── */}
            {showCharts && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Income vs Expense */}
                    {canViewBudget(user.role) && (
                        <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                            <div className="mb-4">
                                <h2 className="text-sm font-semibold text-[var(--color-text)]">
                                    Inkomste vs Uitgawes
                                </h2>
                                <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                                    Per geleentheid
                                </p>
                            </div>
                            <IncomeExpenseChart data={budgetData} />
                        </div>
                    )}

                    {/* Satisfaction */}
                    {canViewInsights(user.role) && (
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                            <div className="mb-4">
                                <h2 className="text-sm font-semibold text-[var(--color-text)]">
                                    Bevredigingsgradering
                                </h2>
                                <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                                    Deelnemer terugvoer
                                </p>
                            </div>
                            <SatisfactionChart data={satisfactionData} />
                        </div>
                    )}
                </div>
            )}

            {/* ── Attendance chart (Admin + Dosent) ── */}
            {showCharts && canViewInsights(user.role) && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                    <div className="mb-4">
                        <h2 className="text-sm font-semibold text-[var(--color-text)]">Bywoning per Geleentheid</h2>
                        <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                            Geregistreerdes wat werklik opgedaag het
                        </p>
                    </div>
                    <AttendanceChart data={attendanceData} />
                </div>
            )}

            {/* ── Upcoming events preview ── */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-[var(--color-text)]">Jou Geleenthede</h2>
                    <a href="/events" className="text-xs text-[var(--color-primary)] font-medium hover:underline">
                        Sien almal
                    </a>
                </div>
                {visibleEvents.length === 0 ? (
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 text-center">
                        <p className="text-[var(--color-text-subtle)] text-sm">
                            Geen geleenthede beskikbaar nie.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {visibleEvents.slice(0, 6).map((event) => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// grys blokkies terwyl die data gehaal word
function KpiSkeletons({ canSeeAll }: { canSeeAll: boolean}) {
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

// Haal die KPI-data en wys die 4 kaarte
async function DashboardKpis({ canSeeAll }: { canSeeAll: boolean }) {
    const [allRes, upcomingRes] = await Promise.allSettled([
        getEvents(),
        getEvents({ from: new Date().toISOString() }),
    ]);

    const allEvents = allRes.status === 'fulfilled' ? allRes.value : null;
    const upcoming  = upcomingRes.status === 'fulfilled' ? upcomingRes.value : null;

    // Elke waarde word onafhanklik bereken
    // is events null, wys daardie kaart "--"
    const totalEvents = allEvents ? allEvents.length : '--';

    const upcomingEvents = upcoming ? upcoming.length : '--';

    const totalRsvps = allEvents
        ? allEvents.reduce((sum, e) => sum + e.confirmedAttendees, 0)
        : '--';

    const avgFillRate = allEvents
        ? `${Math.round(
            (allEvents.reduce(
                (sum, e) => sum + (e.maxCapacity > 0 ? e.confirmedAttendees / e.maxCapacity : 0),
                0,
            ) / (allEvents.length || 1)) * 100,
            )}%`
        : '--';

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Totale Geleenthede"     value={totalEvents}    sub="in die stelsel"       icon={Calendar}      color="blue" />
            <StatCard label="Aankomende Geleenthede" value={upcomingEvents} sub="datum in die toekoms" icon={CalendarClock} color="green" />
            {canSeeAll && (
                <>
                    <StatCard label="Totale RSVPs"        value={totalRsvps}  sub="bevestigde bywoners" icon={Ticket} color="orange" />
                    <StatCard label="Gemiddelde Vulkoers" value={avgFillRate} sub="kapasiteit gevul"    icon={Gauge}  color="red" />
                </>
            )}
        </div>
    );
}