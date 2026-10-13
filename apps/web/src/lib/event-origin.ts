/*
 * Van waar het die gebruiker 'n geleentheid oopgemaak? Die skakel na /events/[id] dra dit in die
 * adres (bv. ?van=kalender&maand=2026-12), sodat die "Terug"-skakel bo-aan daarheen teruggaan
 * eerder as altyd na die geleenthede-lys. Net hierdie vaste waardes word aanvaar: niemand kan 'n
 * skakel maak waarvan die terug-knoppie na 'n ander webwerf lei nie.
 */

export type EventOrigin =
    | { from: 'kalender'; month?: string }   // month as 'yyyy-mm', die maand wat oop was
    | { from: 'oorsig' }
    | { from: 'rsvps' };

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** "?van=kalender&maand=2026-12", of '' sonder herkoms. Vir skakels na die geleentheid en sy wysig-bladsy. */
export function originQuery(origin?: EventOrigin): string {
    if (!origin) return '';
    const params = new URLSearchParams({ van: origin.from });
    if (origin.from === 'kalender' && origin.month && MONTH_PATTERN.test(origin.month)) {
        params.set('maand', origin.month);
    }
    return `?${params.toString()}`;
}

/** Die skakel na 'n geleentheid se bladsy, met waarvandaan dit oopgemaak is, en dalk 'n #anker. */
export function eventDetailHref(eventId: string, origin?: EventOrigin, hash?: string): string {
    return `/events/${eventId}${originQuery(origin)}${hash ? `#${hash}` : ''}`;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

/** Lees die herkoms uit 'n bladsy se searchParams. Enigiets onbekends gee undefined. */
export function parseOrigin(searchParams: SearchParams | undefined): EventOrigin | undefined {
    const from = first(searchParams?.van);
    if (from === 'kalender') {
        const month = first(searchParams?.maand);
        return { from, month: month && MONTH_PATTERN.test(month) ? month : undefined };
    }
    if (from === 'oorsig' || from === 'rsvps') return { from };
    return undefined;
}

/** Waarheen die "Terug"-skakel op die geleentheid se bladsy lei, en wat dit sê. */
export function backLink(origin?: EventOrigin): { href: string; label: string } {
    switch (origin?.from) {
        case 'kalender':
            return { href: origin.month ? `/calendar?maand=${origin.month}` : '/calendar', label: 'Terug na kalender' };
        case 'oorsig':
            return { href: '/dashboard', label: 'Terug na oorsig' };
        case 'rsvps':
            return { href: '/rsvp', label: 'Terug na My RSVP\'s' };
        default:
            return { href: '/events', label: 'Terug na geleenthede' };
    }
}

/** 'yyyy-mm' vir 'n jaar en 'n 0-gebaseerde maand, soos die kalender dit in sy adres hou. */
export function monthKey(year: number, monthIndex: number): string {
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

/** Die omgekeerde van monthKey: { year, monthIndex } of null as dit nie 'n geldige maand is nie. */
export function parseMonthKey(value: string | null | undefined): { year: number; monthIndex: number } | null {
    if (!value || !MONTH_PATTERN.test(value)) return null;
    const [year, month] = value.split('-').map(Number);
    return { year, monthIndex: month - 1 };
}
