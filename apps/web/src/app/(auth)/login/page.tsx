'use client';

import { useState, useTransition } from 'react';
import { Eye, EyeOff, Loader2, Clock, RefreshCw, Lock, Shield } from 'lucide-react';
import { loginAction } from '@/lib/actions/auth.actions';

export default function LoginPage() {
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe]           = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [isPending, startTransition]          = useTransition();
  const [forgotInfo, setForgotInfo]           = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);

    startTransition(async () => {
      const err = await loginAction({
        email: email.trim(),
        password,
        rememberMe,
      });
      if (err) setError(err);
    });
  };

  return (
    <div className="w-full max-w-sm">

      {/* Opskrif */}
      <div className="flex flex-col items-center mb-8">
        <h1
          className="text-[28px] font-black tracking-tight"
          style={{ color: 'var(--color-primary)' }}
        >
          Akademia
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-subtle)' }}>
          Funksiebestuurstelsel
        </p>
      </div>

      {/* Form card */}
      <div
        className="rounded-[16px] border p-6"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* A-sirkel + Aanmeld */}
        <div className="flex flex-col items-center mb-5">
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
          <p className="text-[18px] font-black" style={{ color: 'var(--color-text)' }}>
            Aanmeld
          </p>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
            Funksiebestuurstelsel
          </p>
        </div>

        {/* Skeidings lyn */}
        <div className="h-px w-full mb-5" style={{ background: 'var(--color-border)' }} />

        {/* Wagwoord vergeet info */}
        {forgotInfo && (
          <div
            className="mb-4 px-4 py-3 rounded-[12px] border text-[13px] font-semibold"
            style={{
              background:  'var(--color-bg)',
              borderColor: 'var(--color-primary)',
              color:       'var(--color-text)',
            }}
          >
            Kontak jou administrateur om jou wagwoord te herstel.
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-[12px] border text-[13px] font-semibold"
            style={{
              background:  'var(--color-bg)',
              borderColor: 'var(--color-red)',
              color:       'var(--color-red)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* E-pos */}
          <label className="block mb-1.5">
            <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
              E-pos adres
            </span>
            <input
              type="email"
              autoComplete="email"
              placeholder="naam@akademia.ac.za"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              required
              className="mt-1.5 w-full rounded-[10px] px-[14px] py-3 text-[15px] focus:outline-none transition disabled:opacity-60"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary)')}
              onBlur={(e)  => (e.currentTarget.style.boxShadow = '')}
            />
          </label>

          {/* Wagwoord */}
          <label className="block mt-[10px] mb-1.5">
            <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
              Wagwoord
            </span>
            <div className="relative mt-1.5">
              <input
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                required
                className="w-full rounded-[10px] px-[14px] py-3 pr-11 text-[15px] focus:outline-none transition disabled:opacity-60"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary)')}
                onBlur={(e)  => (e.currentTarget.style.boxShadow = '')}
              />
              <button
                type="button"
                aria-label={passwordVisible ? 'Versteek wagwoord' : 'Wys wagwoord'}
                onClick={() => setPasswordVisible((v) => !v)}
                disabled={isPending}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition disabled:opacity-50"
                style={{ color: 'var(--color-text-subtle)' }}
              >
                {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          {/* Onthou my + Wagwoord vergeet? */}
          <div className="flex items-center justify-between mt-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isPending}
                className="w-4 h-4 rounded accent-[var(--color-primary)] disabled:opacity-60"
              />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-subtle)' }}>
                Onthou my
              </span>
            </label>
            <button
              type="button"
              className="text-[13px] font-bold transition"
              style={{ color: 'var(--color-primary)' }}
              onClick={() => setForgotInfo(true)}
            >
              Wagwoord vergeet?
            </button>
          </div>

          {/* Meld Aan */}
          <button
            type="submit"
            disabled={isPending || !email || !password}
            className="mt-5 mb-5 w-full rounded-[12px] py-[14px] text-[15px] font-black tracking-wide transition flex items-center justify-center gap-2 disabled:opacity-60"
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

        {/* JWT Sessiebeskerming blok */}
        <div
          className="rounded-[12px] border px-4 py-3"
          style={{
            background: 'var(--color-jwt-bg)',
            borderColor: 'var(--color-border)',
          }}
        >
          <p className="text-[12px] font-black mb-1.5" style={{ color: 'var(--color-text)' }}>
            JWT Sessiebeskerming
          </p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Clock size={11} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
              <RefreshCw size={11} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
              <Lock size={11} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
              <span className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
                Teken: 15 min • Herlaai: 7 dae • HTTPS versleuteling
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield size={11} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
              <span className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
                bcrypt(12) wagwoord-hashing • POPIA-nakoming
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Geen rekening */}
      <p className="mt-5 text-center text-[13px]" style={{ color: 'var(--color-text-subtle)' }}>
        Geen rekening? Kontak jou administrateur
      </p>

      {/* Registreer skakel */}
      <div className="mt-3">
        <a
          href="/register"
          className="block w-full text-center rounded-[12px] py-[13px] text-[14px] font-bold border transition"
          style={{
            background:  'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color:       'var(--color-text-subtle)',
          }}
        >
          Registreer
        </a>
      </div>
    </div>
  );
}
