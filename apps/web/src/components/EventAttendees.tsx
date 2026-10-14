'use client';

// ========== Imports: ==========
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Search, UserCheck, UserPlus, Users, Loader2 } from 'lucide-react';
import type { EventRsvp } from '@/lib/api/rsvp';
import { checkInRsvpAction, getEventRsvpsAction, registerWalkInAction } from '@/lib/actions/rsvp.actions';
import { isUserActive, usePollWhileActive } from '@/lib/user-activity';
import { RSVP_STATUS_LABEL, RSVP_STATUS_TONE, fullName } from '@/lib/rsvp-view';
import { METRICS, metricHelp, percent, rsvpWord } from '@/lib/metrics';
import { Pill } from '@/components/ui/Pill';
import { ChartHelpButton } from '@/components/charts/ChartHelp';

type Filter = 'all' | 'waiting' | 'checked-in';

// QR-kodes word in die mobiele app geskandeer, so die lys moet self gereeld herlaai om dit te wys
const POLL_MS = 10_000;

interface EventAttendeesProps {
    eventId:        string;
    initialRsvps:   EventRsvp[];
    /** Die backend weier inteken ná die geleentheid se einde */
    checkInOpen:    boolean;
    /** Opkoms beteken net iets sodra die geleentheid begin het */
    hasStarted:     boolean;
    /** Begin en einde (ms), sodat die paneel self weet wanneer die geleentheid aan die gang is */
    startsAt:       number;
    endsAt:         number;
}

function displayName(rsvp: EventRsvp): string {
    return (rsvp.user ? fullName(rsvp.user.name, rsvp.user.surname) : rsvp.guestName) || 'Onbekende gas';
}

/**
 * Vir die organiseerder: wie kom, wie het al opgedaag, en 'n manier om mense by die deur in te
 * teken sonder die mobiele app (sonder om hul QR-kode te skandeer). Terwyl inteken nog oop is,
 * herlaai die lys elke POLL_MS, sodat mense wat met die app geskandeer word ook hier verskyn.
 */
export default function EventAttendees({ eventId, initialRsvps, checkInOpen, hasStarted, startsAt, endsAt }: EventAttendeesProps) {
    const [rsvps, setRsvps]       = useState(initialRsvps);
    const [search, setSearch]     = useState('');
    const [filter, setFilter]     = useState<Filter>('all');
    const [walkInName, setWalkInName] = useState('');
    const [busyId, setBusyId]     = useState<string | null>(null);
    const [error, setError]       = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    // Elke herlaai en elke eie verandering kry 'n nommer. 'n Herlaai wat begin het voor 'n
    // inteken hier klaar was, mag nie daardie inteken met ouer data oorskryf nie (sien mutate).
    const latestRequest = useRef(0);

    const refresh = useCallback(() => {
        // Ná die geleentheid verander die lys nie meer nie (die backend weier dan inteken)
        if (Date.now() > endsAt) return;
        const requestId = ++latestRequest.current;
        getEventRsvpsAction(eventId).then((result) => {
            if (result.rsvps && requestId === latestRequest.current) setRsvps(result.rsvps);
        });
    }, [eventId, endsAt]);

    // Gewoonlik net terwyl iemand die bladsy gebruik, soos die res van die app
    usePollWhileActive(refresh, POLL_MS);

    // Maar terwyl die geleentheid aan die gang is, is hierdie bladsy dalk die skerm by die deur:
    // niemand raak aan die rekenaar nie, terwyl QR-kodes op 'n foon geskandeer word. Herlaai dan
    // ook sonder aktiwiteit, solank die oortjie sigbaar is. (Is iemand wel aktief, doen die poll
    // hierbo dit reeds.) Die tye word elke keer nagegaan, sodat 'n bladsy wat voor die begin
    // oopgemaak is, vanself oorskakel.
    useEffect(() => {
        const interval = window.setInterval(() => {
            const now = Date.now();
            const underWay = now >= startsAt && now <= endsAt;
            if (underWay && document.visibilityState === 'visible' && !isUserActive()) refresh();
        }, POLL_MS);
        return () => window.clearInterval(interval);
    }, [startsAt, endsAt, refresh]);

    const active = rsvps.filter((r) => r.status !== 'GEKANSELLEER');
    const checkedIn = active.filter((r) => r.checkedIn).length;
    const showUp = percent(checkedIn, active.length);

    const query = search.trim().toLowerCase();
    const visible = active
        .filter((r) => filter === 'all' || (filter === 'checked-in' ? r.checkedIn : !r.checkedIn))
        .filter((r) => !query || displayName(r).toLowerCase().includes(query)
            || (r.user?.email ?? r.guestEmail ?? '').toLowerCase().includes(query))
        .sort((a, b) => displayName(a).localeCompare(displayName(b), 'af'));

    function replace(updated: EventRsvp) {
        setRsvps((current) => {
            const exists = current.some((r) => r.id === updated.id);
            return exists ? current.map((r) => (r.id === updated.id ? updated : r)) : [...current, updated];
        });
    }

    /**
     * Voer 'n eie verandering uit en maak elke herlaai ongeldig wat voor sy einde begin het. Die
     * nommer gaan voor én ná die versoek op: 'n poll wat tydens die inteken begin, kan nog die ou
     * toestand terugkry, en sou die ry anders vir tien sekondes terugswaai na "Teken in".
     */
    async function mutate<T>(action: () => Promise<T>): Promise<T> {
        latestRequest.current++;
        try {
            return await action();
        } finally {
            latestRequest.current++;
        }
    }

    function handleCheckIn(rsvp: EventRsvp) {
        setError(null);
        setBusyId(rsvp.id);
        startTransition(async () => {
            const result = await mutate(() => checkInRsvpAction(rsvp.id));
            if (result.rsvp) {
                replace(result.rsvp);
            } else {
                // Dalk het die app dieselfde persoon net-net voor ons ingeteken (die backend gee dan
                // 'n 409). Vra die bediener wat nou waar is eerder as om die fout blindelings te wys.
                const latest = await mutate(() => getEventRsvpsAction(eventId));
                if (latest.rsvps) setRsvps(latest.rsvps);
                const nowCheckedIn = latest.rsvps?.find((r) => r.id === rsvp.id)?.checkedIn ?? false;
                if (!nowCheckedIn) setError(result.error ?? 'Kon nie die persoon inteken nie.');
            }
            setBusyId(null);
        });
    }

    function handleWalkIn(e: React.FormEvent) {
        e.preventDefault();
        const name = walkInName.trim();
        if (!name) return;
        setError(null);
        startTransition(async () => {
            const result = await mutate(() => registerWalkInAction(eventId, name));
            if (result.rsvp) {
                replace(result.rsvp);
                setWalkInName('');
            } else {
                setError(result.error ?? 'Kon nie die loop-in byvoeg nie.');
            }
        });
    }

    const filterButton = (value: Filter, label: string) => (
        <button
            type="button"
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === value
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)]'
                    : 'text-[var(--color-text-subtle)] hover:bg-[var(--color-border)]'
            }`}
            aria-pressed={filter === value}
        >
            {label}
        </button>
    );

    return (
        <section id="deelnemers" className="scroll-mt-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-[var(--color-primary)]" />
                    <h2 className="text-sm font-semibold text-[var(--color-text)]">Deelnemers</h2>
                    <ChartHelpButton help={metricHelp(METRICS.showUp)} />
                </div>
                <p className="text-sm text-[var(--color-text-subtle)]">
                    <strong className="text-[var(--color-text)]">{active.length}</strong> {rsvpWord(active.length)}
                    {' · '}<strong className="text-[var(--color-text)]">{checkedIn}</strong> ingeteken
                    {hasStarted && showUp !== null && <> · opkoms <strong className="text-[var(--color-text)]">{showUp}%</strong></>}
                </p>
            </div>

            {checkInOpen ? (
                <form onSubmit={handleWalkIn} className="flex flex-wrap gap-2">
                    <input
                        type="text"
                        value={walkInName}
                        onChange={(e) => setWalkInName(e.target.value)}
                        maxLength={120}
                        placeholder="Naam van iemand sonder 'n RSVP"
                        aria-label="Naam van loop-in"
                        className="flex-1 min-w-48 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none focus:border-[var(--color-primary)]"
                    />
                    <button
                        type="submit"
                        disabled={isPending || !walkInName.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
                    >
                        <UserPlus size={15} /> Voeg loop-in by
                    </button>
                </form>
            ) : (
                <p className="text-sm text-[var(--color-text-subtle)]">
                    Die geleentheid is verby, so niemand kan meer ingeteken word nie.
                </p>
            )}

            {checkInOpen && (
                <p className="text-xs text-[var(--color-text-subtle)]">
                    Die lys werk elke 10 sekondes self by, ook vir QR-kodes wat met die app geskandeer word.
                </p>
            )}

            {error && <p className="text-sm text-[var(--color-red)]">{error.replace(/^\[\d+\]\s*/, '')}</p>}

            {active.length === 0 ? (
                <p className="text-sm text-[var(--color-text-subtle)] text-center py-6">Nog niemand het RSVP nie.</p>
            ) : (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-48 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2">
                            <Search size={15} className="text-[var(--color-text-subtle)] shrink-0" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Soek op naam of e-pos..."
                                aria-label="Soek deelnemers"
                                className="bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none w-full"
                            />
                        </div>
                        <div className="flex gap-1">
                            {filterButton('all', 'Almal')}
                            {filterButton('waiting', 'Nog nie hier')}
                            {filterButton('checked-in', 'Ingeteken')}
                        </div>
                    </div>

                    <ul className="divide-y divide-[var(--color-border)] max-h-[28rem] overflow-y-auto">
                        {visible.map((rsvp) => (
                            <li key={rsvp.id} className="flex items-center justify-between gap-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-[var(--color-text)] truncate">
                                        {displayName(rsvp)}
                                        {rsvp.primaryRsvpId && <span className="ml-2"><Pill tone="purple">plus-een</Pill></span>}
                                        {!rsvp.user && !rsvp.primaryRsvpId && <span className="ml-2"><Pill tone="neutral">loop-in</Pill></span>}
                                    </p>
                                    {(rsvp.user?.email ?? rsvp.guestEmail) && (
                                        <p className="text-xs text-[var(--color-text-subtle)] truncate">{rsvp.user?.email ?? rsvp.guestEmail}</p>
                                    )}
                                </div>
                                {rsvp.checkedIn ? (
                                    <Pill tone="green"><UserCheck size={12} /> Ingeteken</Pill>
                                ) : checkInOpen ? (
                                    <button
                                        type="button"
                                        onClick={() => handleCheckIn(rsvp)}
                                        disabled={isPending}
                                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-text)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        {busyId === rsvp.id ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                                        Teken in
                                    </button>
                                ) : (
                                    <Pill tone={RSVP_STATUS_TONE[rsvp.status]}>{RSVP_STATUS_LABEL[rsvp.status]}</Pill>
                                )}
                            </li>
                        ))}
                        {visible.length === 0 && (
                            <li className="py-6 text-center text-sm text-[var(--color-text-subtle)]">Niemand pas by die soektog nie.</li>
                        )}
                    </ul>
                </>
            )}
        </section>
    );
}
