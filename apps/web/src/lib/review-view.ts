import type { ReviewEligibilityStatus } from '@/lib/api/reviews';

// Waarom iemand nie (meer) 'n resensie kan gee nie. OPEN wys die vorm, so dit het nie een nie.
export const REVIEW_BLOCKED_MESSAGE: Record<Exclude<ReviewEligibilityStatus, 'OPEN'>, string> = {
    NOT_ATTENDED:     'Slegs bywoners wat by die geleentheid ingeskandeer is, kan dit beoordeel.',
    ALREADY_REVIEWED: 'Jy het hierdie geleentheid reeds beoordeel. Dankie vir jou terugvoer!',
    NOT_ENDED:        "Jy kan eers 'n resensie gee nadat die geleentheid geëindig het.",
    CLOSED:           'Die resensie-venster vir hierdie geleentheid het gesluit.',
    NO_CATEGORIES:    'Hierdie geleentheid neem nie resensies nie.',
};

// Tellings word tot die naaste tiende afgerond, en 'n helfte gaan op (4,05 word 4,1). toFixed(1)
// kan dit nie self doen nie: 4,05 is eintlik 4,0499... as 'n float en word dan 4,0.
export function roundScore(score: number): number {
    return Math.round(score * 10) / 10;
}

// Altyd een desimaal met 'n desimale komma, so 4 word "4,0"
export function formatScore(score: number): string {
    return roundScore(score).toFixed(1).replace('.', ',');
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Hoe lank die resensie-venster nog oop is. Ons rond op, so reg ná die geleentheid staan daar
// "7 dae oor". Onder 24 uur sou dit "1 dag oor" bly selfs met net 'n uur oor, daarom wys ons dan
// eerder "Minder as 'n dag oor".
export function daysLeftLabel(closesAt: string, now: number): string {
    const msLeft = new Date(closesAt).getTime() - now;
    if (msLeft < DAY_MS) return "Minder as 'n dag oor";

    const days = Math.ceil(msLeft / DAY_MS);
    return days === 1 ? '1 dag oor' : `${days} dae oor`;
}
