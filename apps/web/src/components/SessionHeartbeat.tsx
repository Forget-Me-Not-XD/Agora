'use client';

import { useEffect } from 'react';

// Hoe gereeld die bladsy 'n heartbeat stuur. Die roete roep net die backend as die token
// amper verval, so dit is goedkoop. Hoe korter, hoe nader kom die uitlog aan presies 15 min.
const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // ms
// Na 'n mislukte heartbeat (bv. 503, geen netwerk of timeout) probeer ons gouer weer
const RETRY_INTERVAL     = 60 * 1000;
const REQUEST_TIMEOUT    = 10 * 1000;

// Enige van hierdie tel as dat die gebruiker iets doen
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'] as const;

// capture: scroll borrel nie op nie, so sonder capture sien ons nie scroll binne 'n paneel nie
const LISTENER_OPTIONS: AddEventListenerOptions = { passive: true, capture: true };

/** ±20%, sodat oortjies wat saam oopgemaak is nie almal gelyk heartbeats stuur nie */
function jitter(ms: number): number {
    return ms * (0.8 + Math.random() * 0.4);
}

/** Ouer blaaiers (Safari 15) het nie AbortSignal.timeout nie, dan maar sonder timeout */
function timeoutSignal(ms: number): AbortSignal | undefined {
    return typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(ms) : undefined;
}

/**
 * Hou die sessie aan die lewe.
 *
 * requireActivity = true (sonder onthou my): stuur net 'n heartbeat as die gebruiker sedert
 *   die vorige een iets gedoen het. 'n Oortjie wat oopgelos word, verval dus na ~15 min.
 * requireActivity = false (onthou my): stuur altyd. Die sessie hou in elk geval tot 7 dae,
 *   maar so bly die access token vars, en misluk 'n server action nie net omdat die bladsy
 *   lank oop gestaan het nie.
 */
export default function SessionHeartbeat({ requireActivity }: { requireActivity: boolean }) {
    useEffect(() => {
        let lastActivity = Date.now();
        let lastBeat     = 0; // 0 sodat die laai van die bladsy as aktiwiteit tel
        let idleSkipped  = false;
        let timer: number | undefined;

        const schedule = (ms: number) => {
            window.clearTimeout(timer);
            timer = window.setTimeout(beat, ms);
        };

        const beat = async () => {
            const active = lastActivity > lastBeat;
            lastBeat = Date.now();

            if (requireActivity && !active) {
                idleSkipped = true;
                schedule(jitter(HEARTBEAT_INTERVAL));
                return;
            }

            try {
                const res = await fetch('/api/auth/heartbeat', {
                    method: 'POST',
                    cache:  'no-store',
                    signal: timeoutSignal(REQUEST_TIMEOUT),
                });

                if (res.status === 401) {
                    window.location.href = '/login?error=session_expired';
                    return;
                }

                // Enige ander fout (bv. 503 as die backend besig is) is tydelik, so probeer gouer weer
                schedule(jitter(res.ok ? HEARTBEAT_INTERVAL : RETRY_INTERVAL));
            } catch {
                // Geen internet nie of die versoek het te lank gevat
                schedule(jitter(RETRY_INTERVAL));
            }
        };

        const onActivity = () => {
            lastActivity = Date.now();

            // Die gebruiker is terug nadat ons 'n heartbeat oorgeslaan het. Stuur dadelik een,
            // anders kan die sessie verval voordat die volgende heartbeat kom.
            if (idleSkipped) {
                idleSkipped = false;
                schedule(1000 + Math.random() * 2000);
            }
        };

        ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, LISTENER_OPTIONS));

        // Die eerste heartbeat kom op 'n ewekansige oomblik, anders bly oortjies wat saam oopgemaak is gelyk
        schedule(Math.random() * HEARTBEAT_INTERVAL);

        return () => {
            window.clearTimeout(timer);
            ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity, LISTENER_OPTIONS));
        };
    }, [requireActivity]);

    return null;
}
