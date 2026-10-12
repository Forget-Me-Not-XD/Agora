export interface Venue {
    id: string;
    label: string;       // "L1" ... "L10"
    campus: string;
    maxCapacity: number;
}

/*
    Lokaal-kapasiteite per kampus
    Om 'n kapasiteit te verander: pas net die syfer hieronder aan.
    Om 'n lokaal by te voeg/te verwyder: voeg/verwyder 'n reel in die
    betrokke kampus se lys, geen ander leer hoef te verander nie.
 */
const VENUE_CAPACITIES: Record<string, Record<string, number>> = {
    'Centurion - Leriba': {
        L1: 70, L2: 65, L3: 60, L4: 55, L5: 50,
        L6: 45, L7: 40, L8: 36, L9: 33, L10: 30,
    },
    'Centurion - Gerhard straat': {
        L1: 68, L2: 63, L3: 58, L4: 53, L5: 48,
        L6: 44, L7: 40, L8: 36, L9: 33, L10: 30,
    },
    'Paarl': {
        L1: 65, L2: 60, L3: 55, L4: 50, L5: 46,
        L6: 42, L7: 38, L8: 35, L9: 32, L10: 30,
    },
    'George': {
        L1: 62, L2: 58, L3: 54, L4: 50, L5: 46,
        L6: 42, L7: 38, L8: 35, L9: 32, L10: 30,
    },
    'Somerset Wes': {
        L1: 70, L2: 64, L3: 58, L4: 53, L5: 48,
        L6: 44, L7: 40, L8: 36, L9: 33, L10: 30,
    },
};

// Slugify die kode om dit na 'n skoon adres te maak

function slugify(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const VENUES: Venue[] = Object.entries(VENUE_CAPACITIES).flatMap(
    ([campus, capacities]) =>
        Object.entries(capacities).map(([label, maxCapacity]) => ({
            id: `${slugify(campus)}-${label.toLowerCase()}`,
            label,
            campus,
            maxCapacity,
        })),
);

export function formatVenueLabel(venue: Venue): string {
    return `${venue.campus} - ${venue.label}`;
}

export function findVenueByLocation(location: string): Venue | undefined {
    return VENUES.find((v) => formatVenueLabel(v) === location);
}