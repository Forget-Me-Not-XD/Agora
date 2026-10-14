// ========== Imports: ==========
import type { Tone } from '@/components/ui/Pill';
import type { Event } from '@/lib/api/events';
import { AF_MONTHS_SHORT } from './format-date';

/*
 * Een plek vir wat elke syfer in die app beteken. Die grafieke, KPI-kaarte en hul ⓘ-verduidelikings
 * lees almal hiervandaan, sodat "vulkoers" op die dashboard en op die insigte-bladsy dieselfde ding
 * beteken en dieselfde drempels gebruik.
 */

export interface MetricDefinition {
    name:    string;
    formula: string;
    meaning: string;
    good:    string;
}

export const METRICS = {
    fillRate: {
        name:    'Vulkoers',
        formula: 'RSVPs ÷ kapasiteit',
        meaning: 'Hoeveel van die beskikbare plekke reeds met RSVPs gevul is. 80 RSVPs vir 100 plekke is \'n vulkoers van 80%.',
        good:    '70% of meer is uitstekend, 40–69% is gemiddeld en onder 40% is laag.',
    },
    attendance: {
        name:    'Bywoning',
        formula: 'ingeteken ÷ kapasiteit',
        meaning: 'Hoeveel van die beskikbare plekke gevul is deur mense wat werklik opgedaag en ingeteken het. Dit is net bekend vir geleenthede wat al plaasgevind het en waar QR-kodes geskandeer is.',
        good:    '80% of meer is uitstekend, 50–79% is redelik en onder 50% is laag.',
    },
    showUp: {
        name:    'Opkoms',
        formula: 'ingeteken ÷ RSVPs',
        meaning: 'Hoeveel van die mense wat RSVP het, werklik opgedaag het. Die res is "no-shows".',
        good:    '80% of meer is goed. Laer as dit, stuur \'n herinnering die dag voor die geleentheid.',
    },
    costPerAttendee: {
        name:    'Begroting per bywoner',
        formula: 'begroting ÷ ingetekende bywoners',
        meaning: 'Hoeveel van die toegekende begroting op elke persoon uitkom wat werklik opgedaag het. Dit is die toegekende begroting, nie wat werklik spandeer is nie.',
        good:    'Gebruik dit om geleenthede met mekaar te vergelyk: hoe laer, hoe meer mense het jy met dieselfde geld bereik.',
    },
} satisfies Record<string, MetricDefinition>;

/**
 * Wat 'n grafiek of syfer beteken, vir sy ⓘ-knoppie. `what` is altyd daar; `how` en `good` net
 * as daar 'n berekening of 'n drempel is om te verduidelik.
 */
export interface HelpContent {
    title: string;
    what:  string;
    how?:  string;
    good?: string;
}

export function metricHelp(metric: MetricDefinition): HelpContent {
    return { title: metric.name, what: metric.meaning, how: metric.formula, good: metric.good };
}

// ── Drempels: is hierdie syfer goed? ──

export interface Band {
    tone:  Tone;
    label: string;
}

export function fillRateBand(pct: number): Band {
    if (pct >= 70) return { tone: 'green', label: 'Uitstekend' };
    if (pct >= 40) return { tone: 'orange', label: 'Gemiddeld' };
    return { tone: 'red', label: 'Laag' };
}

export function attendanceBand(pct: number): Band {
    if (pct >= 80) return { tone: 'green', label: 'Uitstekend' };
    if (pct >= 50) return { tone: 'orange', label: 'Redelik' };
    return { tone: 'red', label: 'Laag' };
}

// ── Formatering ──

export function formatNumber(value: number): string {
    return Math.round(value).toLocaleString('af-ZA');
}

export function formatRand(value: number): string {
    return `R${Math.round(value).toLocaleString('af-ZA')}`;
}

/** Afgeronde persentasie, of null as die geheel 0 is (dan is daar niks om te deel nie). */
export function percent(part: number, whole: number): number | null {
    return whole > 0 ? Math.round((part / whole) * 100) : null;
}

export function rsvpWord(count: number): string {
    return count === 1 ? 'RSVP' : 'RSVPs';
}

// "geleentheid" + e is nie die meervoud nie; dit is "geleenthede"
export function eventWord(count: number): string {
    return count === 1 ? 'geleentheid' : 'geleenthede';
}

const DAY_MS = 24 * 60 * 60 * 1000;
const AF_WEEKDAYS_SHORT = ['So', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Sa'];

/** "Ma 12 Okt · 14:00", met die jaar net as dit nie hierdie jaar is nie. */
export function formatEventDate(iso: string, now: Date = new Date()): string {
    const d = new Date(iso);
    const year = d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`;
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${AF_WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${AF_MONTHS_SHORT[d.getMonth()]}${year} · ${time}`;
}

/** "vandag", "môre" of "oor 5 dae", volgens kalenderdae. */
export function relativeDay(iso: string, now: Date = new Date()): string {
    const d = new Date(iso);
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const days = Math.round((startOfDay(d) - startOfDay(now)) / DAY_MS);

    if (days === 0) return 'vandag';
    if (days === 1) return 'môre';
    if (days === -1) return 'gister';
    return days > 0 ? `oor ${days} dae` : `${-days} dae gelede`;
}

// ── Gevolgtrekkings: een sin wat sê wat 'n grafiek beteken ──

export interface MonthValue {
    label: string;
    value: number;
}

/**
 * Vergelyk die laaste volledige maand met die gemiddeld van die volledige maande in die reeks.
 * Die laaste punt is die huidige maand, wat nog besig is, so dit word apart genoem eerder as
 * om dit met hele maande te vergelyk.
 *
 * Met `noun` (bv. "begroting") lees die sin "Sep se begroting was R…"; sonder dit "Sep het 40 RSVPs gehad".
 */
export function monthlyTrendInsight(
    points: MonthValue[],
    describe: (value: number) => string,
    noun?: string,
): string | null {
    if (points.length < 3) return null;

    const complete = points.slice(0, -1);
    const current = points[points.length - 1];
    if (points.every((p) => p.value === 0)) {
        return 'Daar is nog geen data vir die afgelope 12 maande nie.';
    }

    const last = complete[complete.length - 1];
    const average = complete.reduce((sum, p) => sum + p.value, 0) / complete.length;
    const best = complete.reduce((max, p) => (p.value > max.value ? p : max), complete[0]);

    const diff = average > 0 ? Math.round(((last.value - average) / average) * 100) : null;
    const comparison =
        diff === null ? 'terwyl die maande daarvoor niks gehad het nie'
        : Math.abs(diff) < 10 ? `omtrent gelyk aan die maandelikse gemiddeld van ${describe(average)}`
        : diff > 0 ? `${diff}% bo die maandelikse gemiddeld van ${describe(average)}`
        : `${-diff}% onder die maandelikse gemiddeld van ${describe(average)}`;

    let sentence = noun
        ? `${last.label} se ${noun} was ${describe(last.value)}, ${comparison}.`
        : `${last.label} het ${describe(last.value)} gehad, ${comparison}.`;
    if (best.value > 0 && best.label !== last.label) {
        sentence += ` Die hoogste maand was ${best.label} (${describe(best.value)}).`;
    }
    sentence += ` ${current.label} is nog besig: ${describe(current.value)} tot dusver.`;
    return sentence;
}

/** Vir die geleenthede-teenoor-RSVPs-grafiek: hoeveel van elk, en hoeveel RSVPs 'n geleentheid gemiddeld kry. */
export function eventsVsRsvpsInsight(points: { a: number; b: number }[]): string | null {
    const events = points.reduce((sum, p) => sum + p.a, 0);
    const rsvps = points.reduce((sum, p) => sum + p.b, 0);
    if (events === 0 && rsvps === 0) return null;

    const sentence = `Die afgelope 12 maande was daar ${formatNumber(events)} ${eventWord(events)} en ${formatNumber(rsvps)} ${rsvpWord(rsvps)}`;
    if (events === 0) return `${sentence}.`;
    const perEvent = (rsvps / events).toFixed(1).replace('.', ',');
    return `${sentence}: gemiddeld ${perEvent} RSVPs per geleentheid. Gemerkte maande het meer of minder RSVPs gekry as wat die aantal geleenthede laat verwag.`;
}

export function topEventsInsight(items: { eventTitle: string; totalRsvps: number }[]): string | null {
    const total = items.reduce((sum, item) => sum + item.totalRsvps, 0);
    if (items.length === 0 || total === 0) return null;

    const [top] = items;
    const share = percent(top.totalRsvps, total) ?? 0;
    if (items.length === 1) {
        return `"${top.eventTitle}" het ${top.totalRsvps} ${rsvpWord(top.totalRsvps)}.`;
    }
    return `"${top.eventTitle}" is die gewildste met ${top.totalRsvps} ${rsvpWord(top.totalRsvps)}, ${share}% van hierdie ${items.length} geleenthede se RSVPs saam.`;
}

export function rsvpStatusInsight(counts: { status: string; count: number }[]): string | null {
    const total = counts.reduce((sum, c) => sum + c.count, 0);
    if (total === 0) return null;

    // Hangende is normaal: elke RSVP begin so en word eers by inteken of betaling bevestig. Net
    // die kansellasies sê iets oor hoe seker mense van hul besluit is.
    const cancelled = counts.find((c) => c.status === 'GEKANSELLEER')?.count ?? 0;
    const cancelledPct = percent(cancelled, total) ?? 0;

    return cancelledPct >= 20
        ? `${cancelledPct}% van RSVPs word gekanselleer. Dit is hoog: 'n herinnering nader aan die datum help mense om te besluit.`
        : `Net ${cancelledPct}% van RSVPs word gekanselleer, so die meeste mense hou by hul besluit.`;
}

/** Vir die ⓘ by RSVP-status: wat elke status beteken, want "hangende" klink na 'n probleem. */
export const RSVP_STATUS_HELP: HelpContent = {
    title: 'RSVP-status',
    what:  'Hangende: die persoon het RSVP, maar het nog nie by die deur ingeteken of betaal nie. Elke RSVP begin so, so dit is normaal vir opkomende geleenthede. Bevestig: die persoon het ingeteken of vir \'n kaartjie betaal. Gekanselleer: die persoon het die RSVP self teruggetrek.',
    good:  'Minder as 20% kansellasies is gesond.',
};

export function fillRateInsight(pct: number): string {
    const band = fillRateBand(pct);
    const summary =
        band.label === 'Uitstekend' ? '\'n uitstekende vulkoers. Geleenthede vul goed; hou dié wat vol raak dop.'
        : band.label === 'Gemiddeld' ? '\'n gemiddelde vulkoers. Daar is nog plek vir meer mense: deel geleenthede wyer, of kies kleiner lokale.'
        : '\'n lae vulkoers. Die meeste plekke bly leeg: kies kleiner lokale, of bemark geleenthede vroeër.';
    return `${pct}% van die plekke word met RSVPs gevul, ${summary}`;
}

// ── Aandag nodig: geleenthede waaroor die organiseerder iets moet doen ──

export type AttentionKind = 'check-in-now' | 'low-rsvps' | 'almost-full' | 'no-check-ins';

export interface AttentionItem {
    kind:       AttentionKind;
    tone:       Tone;
    eventId:    string;
    eventTitle: string;
    title:      string;
    detail:     string;
    action:     string;
}

export type AttentionEvent = Pick<
    Event,
    'id' | 'title' | 'date' | 'endDate' | 'maxCapacity' | 'confirmedAttendees' | 'checkedInCount'
>;

// Soos deriveStatus in event-view: sonder 'n eindtyd duur 'n geleentheid drie uur
const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;
const LOW_RSVP_WINDOW_MS = 7 * DAY_MS;
const LOW_RSVP_PCT = 40;
const ALMOST_FULL_PCT = 90;
const RECENTLY_ENDED_MS = 14 * DAY_MS;

const KIND_ORDER: AttentionKind[] = ['check-in-now', 'low-rsvps', 'almost-full', 'no-check-ins'];

export function attentionItems(events: AttentionEvent[], now: Date = new Date(), limit = 5): AttentionItem[] {
    const nowMs = now.getTime();
    const items: (AttentionItem & { start: number })[] = [];

    for (const event of events) {
        const start = new Date(event.date).getTime();
        const end = event.endDate ? new Date(event.endDate).getTime() : start + DEFAULT_DURATION_MS;
        const fill = percent(event.confirmedAttendees, event.maxCapacity);
        const base = { eventId: event.id, eventTitle: event.title, start };

        if (start <= nowMs && nowMs <= end) {
            if (event.confirmedAttendees > 0 && event.checkedInCount === 0) {
                items.push({
                    ...base,
                    kind:   'check-in-now',
                    tone:   'red',
                    title:  'Niemand is nog ingeteken nie',
                    detail: `Die geleentheid is aan die gang: ${event.confirmedAttendees} ${rsvpWord(event.confirmedAttendees)}, 0 ingeteken.`,
                    action: 'Skandeer QR-kodes met die app, of teken mense op die geleentheid se bladsy in.',
                });
            }
            continue;
        }

        if (start > nowMs) {
            if (fill === null) continue;
            if (fill >= ALMOST_FULL_PCT) {
                items.push({
                    ...base,
                    kind:   'almost-full',
                    tone:   'blue',
                    title:  fill >= 100 ? 'Vol' : 'Byna vol',
                    detail: `${event.confirmedAttendees} RSVPs vir ${event.maxCapacity} plekke (${fill}%), begin ${relativeDay(event.date, now)}.`,
                    action: 'Is daar nog belangstelling? Oorweeg \'n groter lokaal of verhoog die kapasiteit.',
                });
            } else if (start - nowMs <= LOW_RSVP_WINDOW_MS && fill < LOW_RSVP_PCT) {
                items.push({
                    ...base,
                    kind:   'low-rsvps',
                    tone:   'orange',
                    title:  'Min RSVPs',
                    detail: `${event.confirmedAttendees} RSVPs vir ${event.maxCapacity} plekke (${fill}%), begin ${relativeDay(event.date, now)}.`,
                    action: 'Stuur \'n herinnering of deel die geleentheid weer.',
                });
            }
            continue;
        }

        if (nowMs - end <= RECENTLY_ENDED_MS && event.confirmedAttendees > 0 && event.checkedInCount === 0) {
            items.push({
                ...base,
                kind:   'no-check-ins',
                tone:   'neutral',
                title:  'Bywoning nie aangeteken nie',
                detail: `${event.confirmedAttendees} ${rsvpWord(event.confirmedAttendees)}, maar niemand is ingeteken nie.`,
                action: 'Hierdie geleentheid tel nie in die bywoningsyfers nie. Skandeer volgende keer QR-kodes by die deur.',
            });
        }
    }

    return items
        .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.start - b.start)
        .slice(0, limit)
        .map(({ start: _start, ...item }) => item);
}
