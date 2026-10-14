import { describe, expect, it } from 'vitest';
import { toSastIso } from './format-date';

// Hierdie toetse vergelyk die oomblik in UTC, so hulle hang nie af van die masjien se tydsone (of
// van die TZ wat vitest.config vasstel) nie: presies wat die backend se UTC-houer sal sien.
describe('toSastIso', () => {
    it('lees die vorm se tyd as SA-tyd, twee uur voor UTC', () => {
        expect(toSastIso('2026-10-12', '14:00')).toBe('2026-10-12T14:00:00+02:00');
        expect(new Date(toSastIso('2026-10-12', '14:00')).toISOString()).toBe('2026-10-12T12:00:00.000Z');
    });

    it('skuif ná middernag na die vorige dag in UTC', () => {
        expect(new Date(toSastIso('2026-10-13', '00:30')).toISOString()).toBe('2026-10-12T22:30:00.000Z');
    });
});
