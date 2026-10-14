import { create } from 'zustand';
import { getPrediction, type PredictionResult } from '../api/analytics';

// Voorspellings verander stadig -- hulle is afgelei van kapasiteit/datum, nie
// van lopende RSVP-syfers nie (sien EventDetailScreen se kommentaar daaroor),
// so 'n langer TTL as die funksielys is heeltemal veilig.
const TTL_MS = 5 * 60_000;

interface Entry {
  result: PredictionResult | null;
  fetchedAt: number;
}

interface PredictionsState {
  byEventId: Record<string, Entry>;
  inFlight: Record<string, Promise<PredictionResult | null>>;

  // Dashboard, KI-oortjie en Funksie-detail vra almal dikwels dieselfde
  // aankomende funksie se voorspelling -- hierdie kas maak seker net een
  // van hulle werklik die (stadige) ML-oproep aanvra.
  ensureLoaded: (eventId: string) => Promise<PredictionResult | null>;
  reset: () => void;
}

export const usePredictionsStore = create<PredictionsState>((set, get) => ({
  byEventId: {},
  inFlight: {},

  ensureLoaded: (eventId) => {
    const existingFlight = get().inFlight[eventId];
    if (existingFlight) return existingFlight;

    const cached = get().byEventId[eventId];
    if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
      return Promise.resolve(cached.result);
    }

    const promise = getPrediction(eventId)
      .then((result) => {
        set((s) => ({
          byEventId: { ...s.byEventId, [eventId]: { result, fetchedAt: Date.now() } },
          inFlight: omit(s.inFlight, eventId),
        }));
        return result;
      })
      .catch((err) => {
        set((s) => ({ inFlight: omit(s.inFlight, eventId) }));
        throw err;
      });

    set((s) => ({ inFlight: { ...s.inFlight, [eventId]: promise } }));
    return promise;
  },

  reset: () => set({ byEventId: {}, inFlight: {} }),
}));

function omit(record: Record<string, Promise<PredictionResult | null>>, key: string) {
  const next = { ...record };
  delete next[key];
  return next;
}
