import { useEventsStore } from '../stores/events.store';
import { useRsvpsStore } from '../stores/rsvps.store';
import { usePredictionsStore } from '../stores/predictions.store';
import { getEventStatus } from './event-status';

// Geroep die oomblik 'n gebruiker aanmeld/registreer (sien AppNavigator.tsx se
// laai-hek) -- vul die gedeelde kaslae (sien stores/events.store.ts,
// rsvps.store.ts, predictions.store.ts) sodat die Tuisblad, Funksies, Kalender,
// ens. teen die tyd hulle koppel, reeds vars data het en glad nie self hoef te
// wag nie. Gee 'n belofte terug (nie 'n uitskiet-en-vergeet nie) sodat die
// laai-hek presies weet wanneer om die res van die app te ontsluit.
export async function startAppPrefetch(isStaff: boolean): Promise<void> {
  const eventsPromise = useEventsStore.getState().refresh().catch(() => {});

  // Almal (ook ADMIN/DOSENT) kan RSVP/betaal, dus is hul eie RSVP-lys altyd
  // die moeite werd om vooraf te laai -- die KI-voorspelling is boonop net
  // vir bestuurders relevant.
  const rsvpsPromise = isStaff
    ? Promise.resolve()
    : useRsvpsStore.getState().refresh().catch(() => {});

  await Promise.all([eventsPromise, rsvpsPromise]);

  if (isStaff) {
    const events = useEventsStore.getState().events;
    const upcoming = events.filter((e) => getEventStatus(e) !== 'past');
    if (upcoming.length > 0) {
      await usePredictionsStore.getState().ensureLoaded(upcoming[0].id).catch(() => {});
    }
  }
}
