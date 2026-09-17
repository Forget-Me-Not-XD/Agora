import { create } from 'zustand';
import { listEvents, type EventResponse } from '../api/events';

// Hoeveel Dashboard/Funksies/Kalender/KI/Insigte-oortjies almal dieselfde
// onveranderde lys binne hierdie venster sonder 'n nuwe netwerkversoek mag
// deel -- lank genoeg om oortjie-na-oortjie-wisseling oombliklik te voel,
// kort genoeg dat 'n intussen geskepte funksie nie te lank onsigbaar bly nie.
const TTL_MS = 30_000;

interface EventsState {
  events: EventResponse[];
  byId: Record<string, EventResponse>;
  lastFetchedAt: number;
  isLoading: boolean;
  error: string | null;
  inFlight: Promise<EventResponse[]> | null;

  // Gee die gekaste lys dadelik terug (sonder wag) as dit nog vars is, of
  // een gedeelde netwerkversoek as dit nie is nie -- twee oortjies wat
  // gelyktydig fokus, stuur nooit twee aparte versoeke nie.
  ensureLoaded: () => Promise<EventResponse[]>;
  refresh: () => Promise<EventResponse[]>;
  invalidate: () => void;
  getEvent: (id: string) => EventResponse | undefined;
  reset: () => void;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  byId: {},
  lastFetchedAt: 0,
  isLoading: false,
  error: null,
  inFlight: null,

  ensureLoaded: () => {
    const { inFlight, lastFetchedAt, events } = get();
    if (inFlight) return inFlight;
    if (events.length > 0 && Date.now() - lastFetchedAt < TTL_MS) {
      return Promise.resolve(events);
    }
    return get().refresh();
  },

  refresh: () => {
    const inFlight = get().inFlight;
    if (inFlight) return inFlight;

    set({ isLoading: true, error: null });
    const promise = listEvents()
      .then((events) => {
        const byId: Record<string, EventResponse> = {};
        for (const e of events) byId[e.id] = e;
        set({ events, byId, lastFetchedAt: Date.now(), isLoading: false, inFlight: null });
        return events;
      })
      .catch((err) => {
        set({ isLoading: false, inFlight: null, error: 'Kon nie funksies laai nie.' });
        throw err;
      });
    set({ inFlight: promise });
    return promise;
  },

  // Ná enige mutasie wat 'n funksie se velde verander (skep, RSVP, inteken,
  // intekening-kansellasie) -- die volgende ensureLoaded() haal dan weer vars
  // data, in plaas daarvan om 'n nou-verouderde weergawe voort te gee.
  invalidate: () => set({ lastFetchedAt: 0 }),

  getEvent: (id) => get().byId[id],

  // Ná afmeld -- 'n volgende (moontlik ander) gebruiker se sessie mag nooit
  // hierdie een s'n selfs vlugtig sien voordat die nuwe voorlaai klaar is nie.
  reset: () => set({ events: [], byId: {}, lastFetchedAt: 0, isLoading: false, error: null, inFlight: null }),
}));
