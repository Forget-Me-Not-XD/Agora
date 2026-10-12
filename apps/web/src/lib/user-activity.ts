// ========== Imports: ==========
import { useEffect, useRef } from 'react';

/**
 * Hoe lank ná die laaste aktiwiteit ons die gebruiker nog as aktief beskou. Dit moet heelwat
 * korter wees as JWT_IDLE_EXPIRY, anders hou die polling 'n onaktiewe sessie aan die lewe.
 */
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

// Dieselfde gebeure as SessionHeartbeat. capture: scroll borrel nie op nie, so sonder capture
// mis ons scroll binne 'n paneel.
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'] as const;
const LISTENER_OPTIONS: AddEventListenerOptions = { passive: true, capture: true };

// Die laai van die bladsy tel as aktiwiteit
let lastActivity = Date.now();
let listening    = false;
const subscribers = new Set<() => void>();

function recordActivity(): void {
  lastActivity = Date.now();
  subscribers.forEach((notify) => notify());
}

function onVisibilityChange(): void {
  // Om na die oortjie terug te keer, is self 'n aksie van die gebruiker
  if (document.visibilityState === 'visible') recordActivity();
}

/** Registreer die luisteraars een keer vir die hele bladsy, eers wanneer iemand dit nodig het. */
function startListening(): void {
  if (listening) return;
  listening = true;
  ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, recordActivity, LISTENER_OPTIONS));
  document.addEventListener('visibilitychange', onVisibilityChange);
}

/** Is die oortjie sigbaar en het die gebruiker onlangs iets gedoen? */
function isUserActive(): boolean {
  return document.visibilityState === 'visible' && Date.now() - lastActivity < ACTIVE_WINDOW_MS;
}

/**
 * Roep `poll` elke `intervalMs`, maar net terwyl die gebruiker die bladsy gebruik.
 *
 * Elke poll gaan deur die middleware, en as die access cookie verval het, refresh die middleware
 * die sessie. Sou ons ook poll terwyl niemand die bladsy gebruik nie, verval 'n sessie sonder
 * onthou my nooit nie. Daarom slaan ons 'n poll oor as die oortjie versteek is of daar in die
 * laaste ACTIVE_WINDOW_MS niks gebeur het nie. Sodra die gebruiker weer iets doen, poll ons
 * dadelik. Het die sessie intussen verval, beland hulle so op /login.
 */
export function usePollWhileActive(poll: () => void, intervalMs: number): void {
  // 'n Ref sodat 'n nuwe poll-funksie (bv. ná 'n filterverandering) nie die interval herbegin nie
  const pollRef = useRef(poll);
  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  useEffect(() => {
    startListening();
    let skipped = false;

    const interval = window.setInterval(() => {
      if (isUserActive()) {
        pollRef.current();
      } else {
        skipped = true;
      }
    }, intervalMs);

    const onActivity = () => {
      if (!skipped) return;
      skipped = false;
      pollRef.current();
    };
    subscribers.add(onActivity);

    return () => {
      window.clearInterval(interval);
      subscribers.delete(onActivity);
    };
  }, [intervalMs]);
}
