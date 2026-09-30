// Hou dit gelyk aan apps/backend/src/common/constants/review-categories.ts. Die backend dwing
// dieselfde reëls af, ons kyk net vroeër sodat die fout by die veld self wys.
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

export interface ReviewCategory {
    id:   string;
    name: string;
}

// Wat die API aanvaar. 'n Kategorie sonder id is nuut, en die backend gee dit een.
export interface ReviewCategoryInput {
    id?:  string;
    name: string;
}

// Een ry in die redigeerder. Nuwe rye het nog nie 'n id nie, so React gebruik eerder `key`.
export interface ReviewCategoryDraft extends ReviewCategoryInput {
    key: string;
}

export interface ReviewCategoryErrors {
    list?: string;
    rows:  Record<string, string>;
}

let draftCounter = 0;

export function createDraft(category: ReviewCategoryInput = { name: '' }): ReviewCategoryDraft {
    draftCounter += 1;
    return { ...category, key: `review-category-${draftCounter}` };
}

export function defaultReviewCategories(): ReviewCategoryInput[] {
    return DEFAULT_REVIEW_CATEGORIES.map((name) => ({ name }));
}

export function hasReviewCategoryErrors(errors: ReviewCategoryErrors): boolean {
    return Boolean(errors.list) || Object.keys(errors.rows).length > 0;
}

export function validateReviewCategories(drafts: ReviewCategoryDraft[]): ReviewCategoryErrors {
    const { minCount, maxCount, minNameLength, maxNameLength } = REVIEW_CATEGORY_LIMITS;
    const errors: ReviewCategoryErrors = { rows: {} };

    if (drafts.length < minCount) {
        errors.list = `Voeg ten minste ${minCount} kategorie by`;
    } else if (drafts.length > maxCount) {
        errors.list = `Jy mag hoogstens ${maxCount} kategorieë hê`;
    }

    // Die backend trim die name en ignoreer hoofletters as dit vir duplikate kyk, so ons ook.
    // Die eerste keer wat 'n naam voorkom is reg, net die herhalings kry 'n fout.
    const seen = new Set<string>();
    for (const draft of drafts) {
        const name = draft.name.trim();
        if (name.length < minNameLength || name.length > maxNameLength) {
            errors.rows[draft.key] = `Naam moet tussen ${minNameLength} en ${maxNameLength} karakters wees`;
            continue;
        }

        const normalised = name.toLowerCase();
        if (seen.has(normalised)) {
            errors.rows[draft.key] = 'Hierdie naam word reeds gebruik';
        }
        seen.add(normalised);
    }

    return errors;
}
