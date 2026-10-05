
export const DEFAULT_REVIEW_CATEGORIES: readonly string[] = [
    'Organisasie',
    'Inhoud en Program',
    'Lokaal en Fasiliteite',
    'Kommunikasie',
    'Algehele Ervaring',
];

export const REVIEW_CATEGORY_LIMITS = {
    minCount: 1,
    maxCount: 6,
    minNameLength: 2,
    maxNameLength: 40,
} as const;

export const REVIEW_LIMITS = {
    minScore: 0,
    maxScore: 5,
    maxCommentLength: 1000,
    windowDays: 14,
} as const;

export const REVIEW_REQUESTS = {
    delayMs: 60 * 60 * 1000,
    startDate: new Date('2026-10-04T00:00:00+02:00'),
} as const;
