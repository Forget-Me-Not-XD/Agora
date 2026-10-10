import type { ReviewEligibilityStatus } from '../api/reviews';

// Hou dit gelyk aan die web se apps/web/src/lib/review-view.ts, sodat albei presies dieselfde sê.
// Waarom iemand nie (meer) 'n resensie kan gee nie. OPEN wys die vorm, so dit het nie een nie.
export const REVIEW_BLOCKED_MESSAGE: Record<Exclude<ReviewEligibilityStatus, 'OPEN'>, string> = {
  NOT_ATTENDED: 'Slegs bywoners wat by die geleentheid ingeskandeer is, kan dit beoordeel.',
  ALREADY_REVIEWED: 'Jy het hierdie geleentheid reeds beoordeel. Dankie vir jou terugvoer!',
  NOT_ENDED: "Jy kan eers 'n resensie gee nadat die geleentheid geëindig het.",
  CLOSED: 'Die resensie-venster vir hierdie geleentheid het gesluit.',
  NO_CATEGORIES: 'Hierdie geleentheid neem nie resensies nie.',
};
