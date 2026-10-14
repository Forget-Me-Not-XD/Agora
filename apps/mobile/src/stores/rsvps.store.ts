import { create } from 'zustand';
import { getMyRsvps, type RsvpWithEvent } from '../api/rsvp';

const TTL_MS = 30_000;

interface RsvpsState {
  rsvps: RsvpWithEvent[];
  lastFetchedAt: number;
  isLoading: boolean;
  error: string | null;
  inFlight: Promise<RsvpWithEvent[]> | null;

  // Net vir die ongefiltreerde (geen datumreeks) standaardlys -- 'n
  // datumgefiltreerde navraag (RsvpScreen se soekvelde) gaan altyd reguit
  // netwerk toe en raak nie hierdie kas nie.
  ensureLoaded: () => Promise<RsvpWithEvent[]>;
  refresh: () => Promise<RsvpWithEvent[]>;
  invalidate: () => void;
  removeLocally: (rsvpId: string) => void;
  reset: () => void;
}

export const useRsvpsStore = create<RsvpsState>((set, get) => ({
  rsvps: [],
  lastFetchedAt: 0,
  isLoading: false,
  error: null,
  inFlight: null,

  ensureLoaded: () => {
    const { inFlight, lastFetchedAt, rsvps } = get();
    if (inFlight) return inFlight;
    if (rsvps.length > 0 && Date.now() - lastFetchedAt < TTL_MS) {
      return Promise.resolve(rsvps);
    }
    return get().refresh();
  },

  refresh: () => {
    const inFlight = get().inFlight;
    if (inFlight) return inFlight;

    set({ isLoading: true, error: null });
    const promise = getMyRsvps()
      .then((rsvps) => {
        set({ rsvps, lastFetchedAt: Date.now(), isLoading: false, inFlight: null });
        return rsvps;
      })
      .catch((err) => {
        set({ isLoading: false, inFlight: null, error: 'Kon nie jou RSVPs laai nie.' });
        throw err;
      });
    set({ inFlight: promise });
    return promise;
  },

  // Ná RSVP / kansellasie / kaartjie-aankoop, sodat 'n stil-verouderde lys
  // nie steeds vir 'n rukkie voortgegee word nie.
  invalidate: () => set({ lastFetchedAt: 0 }),

  // Oombliklike optimistiese verwydering (bv. ná kansellasie) sonder om vir
  // 'n volle agtergrond-verversing te wag -- invalidate() word steeds ook
  // geroep sodat die volgende regte laai steeds die bediener se ware stand kry.
  removeLocally: (rsvpId) =>
    set((s) => ({ rsvps: s.rsvps.filter((r) => r._id !== rsvpId) })),

  reset: () => set({ rsvps: [], lastFetchedAt: 0, isLoading: false, error: null, inFlight: null }),
}));
