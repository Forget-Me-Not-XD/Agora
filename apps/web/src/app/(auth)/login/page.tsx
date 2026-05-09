'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { loginAction } from '@/lib/actions/auth.actions';

export default function LoginPage() {
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [isPending, startTransition]        = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);

    startTransition(async () => {
      const err = await loginAction({ email: email.trim(), password });
      if (err) setError(err);
      // On success, loginAction calls redirect('/dashboard') server-side
    });
  };

  return (
    <div className="w-full max-w-sm">

      {/* ── Brand ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
          style={{ background: 'var(--color-primary)' }}
        >
          <span
            className="font-black text-2xl"
            style={{ color: 'var(--color-primary-text)' }}
          >
            A
          </span>
        </div>
        <h1 className="text-[28px] font-black text-app tracking-tight">Akademia</h1>
        <p className="text-[13px] text-subtle mt-1.5">Funksiebestuurstelsel</p>
      </div>

      {/* ── Form card ──────────────────────────────────────────────────── */}
      <div
        className="rounded-[16px] border border-app p-6"
        style={{ background: 'var(--color-surface)' }}
      >
        {/* Error banner */}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-[12px] border text-[13px] font-semibold"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-red)',
              color: 'var(--color-red)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <label className="block mb-1.5">
            <span className="text-[12px] font-bold text-subtle">E-pos</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="naam@akademia.ac.za"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              required
              className="mt-1.5 w-full rounded-[10px] px-[14px] py-3 text-[15px] border border-app text-app placeholder:text-subtle focus:outline-none transition disabled:opacity-60"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
              }}
              onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary)')}
              onBlur={(e)  => (e.currentTarget.style.boxShadow = '')}
            />
          </label>

          {/* Password */}
          <label className="block mt-[10px] mb-1.5">
            <span className="text-[12px] font-bold text-subtle">Wagwoord</span>
            <div className="relative mt-1.5">
              <input
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                required
                className="w-full rounded-[10px] px-[14px] py-3 pr-11 text-[15px] border border-app text-app placeholder:text-subtle focus:outline-none transition disabled:opacity-60"
                style={{
                  background: 'var(--color-bg)',
                  borderColor: 'var(--color-border)',
                }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary)')}
                onBlur={(e)  => (e.currentTarget.style.boxShadow = '')}
              />
              <button
                type="button"
                aria-label={passwordVisible ? 'Versteek wagwoord' : 'Wys wagwoord'}
                onClick={() => setPasswordVisible((v) => !v)}
                disabled={isPending}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-app transition disabled:opacity-50"
              >
                {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending || !email || !password}
            className="mt-4 w-full rounded-[12px] py-[14px] text-[15px] font-black tracking-wide transition flex items-center justify-center gap-2 disabled:opacity-60"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-primary-text)',
            }}
          >
            {isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Besig…</>
            ) : (
              'Meld Aan'
            )}
          </button>
        </form>

        {/* Forgot password */}
        <button
          type="button"
          className="mt-3 w-full py-[14px] text-[13px] font-bold transition text-center rounded-[12px] border border-app hover:bg-app"
          onClick={() =>
            alert('Kontak jou administrateur om jou wagwoord te herstel.')
          }
        >
          Wagwoord vergeet?
        </button>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <p className="mt-4 text-center text-[11px] text-subtle flex items-center justify-center gap-1.5">
        <ShieldCheck size={12} />
        POPIA-beskermde aanmeld • SSL
      </p>

      {/* ── Register link ──────────────────────────────────────────────── */}
      <p className="mt-[18px] text-center text-[13px] text-subtle">
        Nog nie geregistreer nie?{' '}
        <Link
          href="/register"
          className="font-black"
          style={{ color: 'var(--color-primary)' }}
        >
          Skep &apos;n rekening
        </Link>
      </p>
    </div>
  );
}
