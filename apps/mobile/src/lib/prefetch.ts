import { listEvents, type EventResponse } from '../api/events';
import { getMyRsvps, type RsvpWithEvent } from '../api/rsvp';
import { getPrediction, type PredictionResult } from '../api/analytics';
import { getEventStatus } from './event-status';

// Terwyl 'n gebruiker die onboarding-teks lees, is daar niks vir hulle om mee
// te wag op 'n netwerkoproep nie -- ons kan solank die eerste data laai wat
// die Tuisblad/Funksies/RSVP-oortjies in elk geval sou aanvra. Die skerms self
// probeer eers hierdie voorafgelaaide belofte gebruik voordat hulle 'n vars
// versoek begin; as dit reeds klaar is teen die tyd die skerm koppel, is daar
// glad geen laai-wagtyd nie.
let eventsPromise: Promise<EventResponse[]> | null = null;
let myRsvpsPromise: Promise<RsvpWithEvent[]> | null = null;
let predictionPromise: Promise<PredictionResult | null> | null = null;
let startedAt = 0;

// Ouer as hierdie -> ons vertrou dit nie meer nie en 'n vars versoek word
// eerder gemaak (die gebruiker het waarskynlik reeds 'n rukkie rondbeweeg).
const MAX_AGE_MS = 60_000;

function ifFresh<T>(promise: Promise<T> | null): Promise<T> | null {
  if (!promise) return null;
  if (Date.now() - startedAt > MAX_AGE_MS) return null;
  return promise;
}

export function startOnboardingPrefetch(isStaff: boolean): void {
  startedAt = Date.now();

  eventsPromise = listEvents();
  eventsPromise.catch(() => {}); // stilweg misluk -- die skerm se eie foutafhandeling vang dit later

  // Almal (ook ADMIN/DOSENT) kan intussen RSVP/betaal, dus is hul eie RSVP-lys
  // altyd die moeite werd om vooraf te laai -- die KI-voorspelling is boonop
  // net vir bestuurders relevant.
  myRsvpsPromise = getMyRsvps();
  myRsvpsPromise.catch(() => {});

  if (isStaff) {
    predictionPromise = eventsPromise
      .then(async (events) => {
        const upcoming = events.filter((e) => getEventStatus(e) !== 'past');
        if (upcoming.length === 0) return null;
        try {
          return await getPrediction(upcoming[0].id);
        } catch {
          return null;
        }
      })
      .catch(() => null);
  }
}

// Elkeen hier is EENMALIG bruikbaar -- sodra 'n skerm dit neem, word dit
// leeggemaak sodat 'n LATER herlaai (bv. terug na die Funksies-oortjie ná 'n
// nuwe geleentheid geskep is) altyd 'n regte vars versoek maak i.p.v. steeds
// hierdie eerste, nou-moontlik-verouderde resultaat weer te gee.
export function takeEventsPrefetch(): Promise<EventResponse[]> | null {
  const promise = ifFresh(eventsPromise);
  eventsPromise = null;
  return promise;
}

export function takeMyRsvpsPrefetch(): Promise<RsvpWithEvent[]> | null {
  const promise = ifFresh(myRsvpsPromise);
  myRsvpsPromise = null;
  return promise;
}

export function takePredictionPrefetch(): Promise<PredictionResult | null> | null {
  const promise = ifFresh(predictionPromise);
  predictionPromise = null;
  return promise;
}
