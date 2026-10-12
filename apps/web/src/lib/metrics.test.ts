import { describe, expect, it } from 'vitest';
import {
    attendanceBand,
    attentionItems,
    eventsVsRsvpsInsight,
    fillRateBand,
    fillRateInsight,
    formatEventDate,
    monthlyTrendInsight,
    percent,
    relativeDay,
    rsvpStatusInsight,
    topEventsInsight,
    type AttentionEvent,
} from './metrics';

const NOW = new Date(2026, 9, 12, 10, 0); // Ma 12 Okt 2026, 10:00
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function at(ms: number): string {
    return new Date(NOW.getTime() + ms).toISOString();
}

function event(overrides: Partial<AttentionEvent>): AttentionEvent {
    return {
        id: 'e1',
        title: 'Toets',
        date: at(3 * DAY),
        maxCapacity: 100,
        confirmedAttendees: 50,
        checkedInCount: 0,
        ...overrides,
    };
}

describe('bands', () => {
    it('uses the fill-rate thresholds 70 and 40', () => {
        expect(fillRateBand(70).label).toBe('Uitstekend');
        expect(fillRateBand(69).label).toBe('Gemiddeld');
        expect(fillRateBand(40).label).toBe('Gemiddeld');
        expect(fillRateBand(39).label).toBe('Laag');
    });

    it('uses the attendance thresholds 80 and 50', () => {
        expect(attendanceBand(80).tone).toBe('green');
        expect(attendanceBand(79).tone).toBe('orange');
        expect(attendanceBand(49).tone).toBe('red');
    });
});

describe('percent', () => {
    it('rounds, and returns null when there is nothing to divide by', () => {
        expect(percent(1, 3)).toBe(33);
        expect(percent(5, 0)).toBeNull();
    });
});

describe('dates', () => {
    it('formats an event date without the year when it is this year', () => {
        expect(formatEventDate(new Date(2026, 9, 12, 14, 5).toISOString(), NOW)).toBe('Ma 12 Okt · 14:05');
        expect(formatEventDate(new Date(2027, 0, 1, 9, 0).toISOString(), NOW)).toBe('Vr 1 Jan 2027 · 09:00');
    });

    it('describes calendar days relative to today', () => {
        expect(relativeDay(new Date(2026, 9, 12, 23, 0).toISOString(), NOW)).toBe('vandag');
        expect(relativeDay(new Date(2026, 9, 13, 1, 0).toISOString(), NOW)).toBe('môre');
        expect(relativeDay(new Date(2026, 9, 17).toISOString(), NOW)).toBe('oor 5 dae');
        expect(relativeDay(new Date(2026, 9, 10).toISOString(), NOW)).toBe('2 dae gelede');
    });
});

describe('monthlyTrendInsight', () => {
    const describeCount = (v: number) => `${Math.round(v)}`;

    it('compares the last complete month with the average and mentions the current month separately', () => {
        const points = [
            { label: 'Jul', value: 10 },
            { label: 'Aug', value: 10 },
            { label: 'Sep', value: 16 },
            { label: 'Okt', value: 3 },
        ];
        // Gemiddeld van Jul–Sep is 12, so Sep is 33% bo; Okt is nog besig
        expect(monthlyTrendInsight(points, describeCount)).toBe(
            'Sep het 16 gehad, 33% bo die maandelikse gemiddeld van 12. Okt is nog besig: 3 tot dusver.',
        );
    });

    it('names the best month when it is not the last one, and calls small differences equal', () => {
        const points = [
            { label: 'Jul', value: 20 },
            { label: 'Aug', value: 10 },
            { label: 'Sep', value: 14 },
            { label: 'Okt', value: 0 },
        ];
        expect(monthlyTrendInsight(points, describeCount)).toBe(
            'Sep het 14 gehad, omtrent gelyk aan die maandelikse gemiddeld van 15. Die hoogste maand was Jul (20). Okt is nog besig: 0 tot dusver.',
        );
    });

    it('uses the noun form for money', () => {
        const points = [
            { label: 'Aug', value: 100 },
            { label: 'Sep', value: 300 },
            { label: 'Okt', value: 50 },
        ];
        expect(monthlyTrendInsight(points, (v) => `R${Math.round(v)}`, 'begroting')).toBe(
            'Sep se begroting was R300, 50% bo die maandelikse gemiddeld van R200. Okt is nog besig: R50 tot dusver.',
        );
    });

    it('says so when there is no data at all, and needs at least three points', () => {
        expect(monthlyTrendInsight([{ label: 'a', value: 0 }, { label: 'b', value: 0 }, { label: 'c', value: 0 }], describeCount))
            .toBe('Daar is nog geen data vir die afgelope 12 maande nie.');
        expect(monthlyTrendInsight([{ label: 'a', value: 1 }], describeCount)).toBeNull();
    });
});

describe('eventsVsRsvpsInsight', () => {
    it('gives the totals and the RSVPs per event', () => {
        expect(eventsVsRsvpsInsight([{ a: 2, b: 10 }, { a: 2, b: 11 }])).toBe(
            'Die afgelope 12 maande was daar 4 geleenthede en 21 RSVPs: gemiddeld 5,3 RSVPs per geleentheid. Gemerkte maande het meer of minder RSVPs gekry as wat die aantal geleenthede laat verwag.',
        );
    });

    it('has nothing to say without data', () => {
        expect(eventsVsRsvpsInsight([{ a: 0, b: 0 }])).toBeNull();
    });
});

describe('other insights', () => {
    it('describes the most popular event and its share', () => {
        expect(topEventsInsight([
            { eventTitle: 'Gala', totalRsvps: 30 },
            { eventTitle: 'Kuier', totalRsvps: 10 },
        ])).toBe('"Gala" is die gewildste met 30 RSVPs, 75% van hierdie 2 geleenthede se RSVPs saam.');
        expect(topEventsInsight([])).toBeNull();
    });

    it('flags a high cancellation rate', () => {
        expect(rsvpStatusInsight([
            { status: 'BEVESTIG', count: 6 },
            { status: 'HANGENDE', count: 1 },
            { status: 'GEKANSELLEER', count: 3 },
        ])).toBe('30% van RSVPs word gekanselleer. Dit is hoog: \'n herinnering nader aan die datum help mense om te besluit.');
        expect(rsvpStatusInsight([{ status: 'BEVESTIG', count: 10 }]))
            .toBe('Net 0% van RSVPs word gekanselleer, so die meeste mense hou by hul besluit.');
    });

    it('gives fill-rate advice that matches the band', () => {
        expect(fillRateInsight(25)).toBe("25% van die plekke word met RSVPs gevul, 'n lae vulkoers. Die meeste plekke bly leeg: kies kleiner lokale, of bemark geleenthede vroeër.");
        expect(fillRateInsight(85)).toContain("'n uitstekende vulkoers");
    });
});

describe('attentionItems', () => {
    it('flags an event in the next week with few RSVPs', () => {
        const [item] = attentionItems([event({ confirmedAttendees: 10 })], NOW);
        expect(item.kind).toBe('low-rsvps');
        expect(item.detail).toBe('10 RSVPs vir 100 plekke (10%), begin oor 3 dae.');
    });

    it('does not flag low RSVPs for an event further than a week away', () => {
        expect(attentionItems([event({ date: at(10 * DAY), confirmedAttendees: 10 })], NOW)).toEqual([]);
    });

    it('flags an almost full event, however far away', () => {
        const [item] = attentionItems([event({ date: at(30 * DAY), confirmedAttendees: 95 })], NOW);
        expect(item.kind).toBe('almost-full');
        expect(item.title).toBe('Byna vol');
    });

    it('flags an event under way where nobody is checked in yet', () => {
        const [item] = attentionItems([event({ date: at(-HOUR), confirmedAttendees: 20 })], NOW);
        expect(item.kind).toBe('check-in-now');
    });

    it('flags a recent event without check-ins, but not an old one', () => {
        expect(attentionItems([event({ date: at(-3 * DAY) })], NOW)[0].kind).toBe('no-check-ins');
        expect(attentionItems([event({ date: at(-30 * DAY) })], NOW)).toEqual([]);
    });

    it('ignores events without a capacity and healthy events', () => {
        expect(attentionItems([
            event({ maxCapacity: 0, confirmedAttendees: 0 }),
            event({ confirmedAttendees: 60 }),
            event({ date: at(-3 * DAY), checkedInCount: 40 }),
        ], NOW)).toEqual([]);
    });

    it('puts the most urgent kind first and respects the limit', () => {
        const items = attentionItems([
            event({ id: 'full', date: at(2 * DAY), confirmedAttendees: 100 }),
            event({ id: 'low', date: at(2 * DAY), confirmedAttendees: 5 }),
            event({ id: 'now', date: at(-HOUR), confirmedAttendees: 5 }),
        ], NOW, 2);
        expect(items.map((i) => i.eventId)).toEqual(['now', 'low']);
    });
});
