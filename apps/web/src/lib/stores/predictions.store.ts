import { create } from 'zustand';
import { getAttendancePredictionAction } from '@/lib/actions/analytics.actions';
import { previewEventAction } from '@/lib/actions/event-planner.actions';
import type { PredictionResult } from '@/lib/api/analytics';

/**
 * Kas vir voorspellings aan die kliëntkant. Werk soos apps/mobile/src/stores/predictions.store.ts,
 * met 'n ekstra lys vir die KI-Speeltuin se konsep-voorspellings.
 *
 * Een voorspelling vat die model omtrent 3,5 sekondes, en dit hang net van die datum en kapasiteit
 * af, nie van RSVP-syfers nie. Dieselfde geleentheid (of dieselfde datum en kapasiteit in die
 * Speeltuin) hoef dus nie elke keer weer bereken te word as die gebruiker rondklik of die bladsy
 * verfris nie.
 */
const TTL_MS = 5 * 60_000;

/** Net geslaagde voorspellings word gehou. 'n Fout of "nie beskikbaar" word weer probeer. */
interface Entry {
    prediction: PredictionResult;
    fetchedAt:  number;
}

export interface PredictionOutcome {
    prediction?:  PredictionResult;
    unavailable?: boolean;
    error?:       string;
}

export interface EventKeyParts {
    id:          string;
    date:        string;
    maxCapacity: number;
}

export interface DraftKeyParts {
    date:        string;
    maxCapacity: number;
}

interface PredictionsState {
    byEvent:   Record<string, Entry>;
    byDraft:   Record<string, Entry>;
    inFlight:  Record<string, Promise<PredictionOutcome>>;

    /** Voorspelling vir 'n bestaande geleentheid. */
    ensureLoaded: (event: EventKeyParts) => Promise<PredictionOutcome>;
    /** Voorspelling vir 'n geleentheid wat nog nie bestaan nie (die Speeltuin). */
    ensureDraftLoaded: (parts: DraftKeyParts) => Promise<PredictionOutcome>;
    reset: () => void;
}

export const usePredictionsStore = create<PredictionsState>((set, get) => ({
    byEvent:  {},
    byDraft:  {},
    inFlight: {},

    // Die datum en kapasiteit is deel van die sleutel, nie net die id nie. Verander iemand een
    // daarvan, is dit 'n ander voorspelling, en dan wil ons nie nog vyf minute die oue wys nie.
    ensureLoaded: (event) =>
        load(set, get, {
            map:     'byEvent',
            key:     `${event.id}|${event.date}|${event.maxCapacity}`,
            request: () => getAttendancePredictionAction(event.id),
        }),

    ensureDraftLoaded: (parts) =>
        load(set, get, {
            map:     'byDraft',
            key:     `${parts.date}|${parts.maxCapacity}`,
            request: () => previewEventAction(parts),
        }),

    reset: () => set({ byEvent: {}, byDraft: {}, inFlight: {} }),
}));

type Setter = (partial: (state: PredictionsState) => Partial<PredictionsState>) => void;
type Getter = () => PredictionsState;

function load(
    set: Setter,
    get: Getter,
    { map, key, request }: { map: 'byEvent' | 'byDraft'; key: string; request: () => Promise<PredictionOutcome> },
): Promise<PredictionOutcome> {
    const flightKey = `${map}:${key}`;

    // Vra 'n paar komponente dieselfde voorspelling gelyktydig aan, wag hulle op een oproep
    const existingFlight = get().inFlight[flightKey];
    if (existingFlight) return existingFlight;

    const cached = get()[map][key];
    if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
        return Promise.resolve({ prediction: cached.prediction });
    }

    const promise = request()
        .then((outcome) => {
            set((s) => ({
                [map]: outcome.prediction
                    ? { ...s[map], [key]: { prediction: outcome.prediction, fetchedAt: Date.now() } }
                    : s[map],
                inFlight: omit(s.inFlight, flightKey),
            }));
            return outcome;
        })
        .catch((err: unknown) => {
            set((s) => ({ inFlight: omit(s.inFlight, flightKey) }));
            throw err;
        });

    set((s) => ({ inFlight: { ...s.inFlight, [flightKey]: promise } }));
    return promise;
}

function omit(record: Record<string, Promise<PredictionOutcome>>, key: string) {
    const next = { ...record };
    delete next[key];
    return next;
}
