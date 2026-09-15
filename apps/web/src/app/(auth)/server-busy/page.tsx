'use client';

// ========== Imports: ==========
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { safeRedirectPath } from '@/lib/safe-redirect';

// Die refresh-roete stel 'n guard van 10 s. Probeer ons voordat dit verby is, stuur die
// middleware ons net weer hierheen, so ons wag ten minste so lank.
const MIN_WAIT_SECONDS   = 10;
// Ekstra ewekansige wagtyd, sodat almal wat hier beland nie op dieselfde oomblik weer probeer nie
const EXTRA_WAIT_SECONDS = 10;

/**
 * Die backend was te besig om die sessie te hernu. Die sessie self is waarskynlik nog goed,
 * so ons wag 'n bietjie en stuur die gebruiker dan terug na die bladsy waar hulle was.
 */
export default function ServerBusyPage() {
  const [target, setTarget]           = useState('/dashboard');
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const totalWait                     = useRef(0);

  useEffect(() => {
    const from = safeRedirectPath(new URLSearchParams(window.location.search).get('from'));
    // Moet nooit terug na hierdie bladsy stuur nie
    const next = from.startsWith('/server-busy') ? '/dashboard' : from;
    setTarget(next);

    let left = MIN_WAIT_SECONDS + Math.floor(Math.random() * (EXTRA_WAIT_SECONDS + 1));
    totalWait.current = left;
    setSecondsLeft(left);

    const timer = window.setInterval(() => {
      left -= 1;
      setSecondsLeft(left);
      if (left <= 0) {
        window.clearInterval(timer);
        window.location.replace(next);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const canRetryNow = secondsLeft !== null && totalWait.current - secondsLeft >= MIN_WAIT_SECONDS;

  return (
    <div className="w-full max-w-sm text-center">
      <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin" style={{ color: 'var(--color-primary)' }} />

      <p className="text-[22px] font-black mb-2" style={{ color: 'var(--color-text)' }}>
        Die bediener is tans besig
      </p>

      <p className="text-[16px] mb-6" style={{ color: 'var(--color-text-subtle)' }}>
        Jy is nog aangemeld. Ons probeer weer
        {secondsLeft !== null && secondsLeft > 0 ? ` oor ${secondsLeft} sekondes` : ''}.
      </p>

      <button
        type="button"
        onClick={() => window.location.replace(target)}
        disabled={!canRetryNow}
        className="w-full h-12 rounded-[12px] text-[16px] font-bold text-white transition disabled:opacity-60"
        style={{ background: 'var(--color-primary)' }}
      >
        Probeer nou weer
      </button>
    </div>
  );
}
