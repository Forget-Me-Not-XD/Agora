import { describe, expect, it } from 'vitest';
import { backLink, eventDetailHref, monthKey, originQuery, parseMonthKey, parseOrigin } from './event-origin';

describe('event-origin', () => {
    it('bou die skakel met herkoms, maand en anker', () => {
        expect(eventDetailHref('abc', { from: 'kalender', month: '2026-12' })).toBe('/events/abc?van=kalender&maand=2026-12');
        expect(eventDetailHref('abc', { from: 'oorsig' }, 'deelnemers')).toBe('/events/abc?van=oorsig#deelnemers');
        expect(eventDetailHref('abc')).toBe('/events/abc');
    });

    it('lees net bekende herkomste', () => {
        expect(parseOrigin({ van: 'kalender', maand: '2026-12' })).toEqual({ from: 'kalender', month: '2026-12' });
        expect(parseOrigin({ van: 'rsvps' })).toEqual({ from: 'rsvps' });
        expect(parseOrigin({ van: 'https://kwaad.example' })).toBeUndefined();
        expect(parseOrigin({})).toBeUndefined();
    });

    it('ignoreer \'n ongeldige maand eerder as om dit in die skakel te sit', () => {
        expect(parseOrigin({ van: 'kalender', maand: '2026-13' })).toEqual({ from: 'kalender', month: undefined });
        expect(originQuery({ from: 'kalender', month: '//kwaad' })).toBe('?van=kalender');
    });

    it('stuur die terug-skakel na die regte plek', () => {
        expect(backLink({ from: 'kalender', month: '2026-12' })).toEqual({ href: '/calendar?maand=2026-12', label: 'Terug na kalender' });
        expect(backLink({ from: 'oorsig' }).href).toBe('/dashboard');
        expect(backLink(undefined)).toEqual({ href: '/events', label: 'Terug na geleenthede' });
    });

    it('skakel maande heen en terug', () => {
        expect(monthKey(2026, 11)).toBe('2026-12');
        expect(parseMonthKey('2026-12')).toEqual({ year: 2026, monthIndex: 11 });
        expect(parseMonthKey('nonsens')).toBeNull();
    });
});
