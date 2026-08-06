'use client';

// ========== Imports: ==========
import { useEffect, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { loginAction } from '@/lib/actions/auth.actions';
import { SnakeFieldBorder, type SnakeFieldBorderHandle } from '@/components/SnakeFieldBorder';

export default function LoginPage() {
  const { resolvedTheme }                     = useTheme();
  const [mounted, setMounted]                 = useState(false);
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe]           = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [isPending, startTransition]          = useTransition();
  const [forgotInfo, setForgotInfo]           = useState(false);

  useEffect(() => setMounted(true), []);

  const formRef                               = useRef<HTMLFormElement>(null);
  const emailInputRef                         = useRef<HTMLInputElement>(null);
  const passwordInputRef                      = useRef<HTMLInputElement>(null);
  const submitButtonRef                       = useRef<HTMLButtonElement>(null);
  const snakeRef                              = useRef<SnakeFieldBorderHandle>(null);

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

      {/* Logo */}
      <div className="flex flex-col items-center mb-6">
        <Image
          src={mounted && resolvedTheme === 'dark' ? '/agora-icon-dark.png' : '/agora-icon.png'}
          alt=""
          width={104}
          height={119}
          priority
        />
        <p
          className="text-[44px] font-black tracking-tight mt-2 flex items-center gap-1.5"
          style={{ color: 'var(--color-text)' }}
        >
          agora
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ background: 'var(--color-primary)' }}
          />
        </p>
        <p
          className="text-[13px] mt-1 tracking-wide"
          style={{ color: 'var(--color-text-subtle)' }}
        >
          vergader · beplan · verbind
        </p>
      </div>

      {/* Form card */}
      <div
        className="rounded-[24px] border p-6"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Aanmeld */}
        <div className="flex flex-col items-center mb-5">
          <p className="text-[18px] font-black" style={{ color: 'var(--color-text)' }}>
            Aanmeld
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
            Kontak die Agora stelseladministrateur om jou wagwoord te herstel.
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

        <form ref={formRef} onSubmit={handleSubmit} noValidate className='relative'>
          <SnakeFieldBorder
            ref={snakeRef}
            containerRef={formRef}
            emailRef={emailInputRef}
            passwordRef={passwordInputRef}
            submitRef={submitButtonRef}
          />

          {/* E-pos */}
          <label className="block mb-1.5">
            <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
              E-pos adres
            </span>
            <input
              type="email"
              ref={emailInputRef}
              autoComplete="email"
              placeholder="naam@akademia.ac.za"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              required
              className="mt-1.5 w-full bg-transparent border-0 pb-2 text-[15px] focus:outline-none transition disabled:opacity-60"
              style={{ color: 'var(--color-text)' }}
              onFocus={() => snakeRef.current?.highlight('email')}
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
                ref={passwordInputRef}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                required
                className="w-full bg-transparent border-0 pb-2 pr-11 text-[15px] focus:outline-none transition disabled:opacity-60"
                style={{ color: 'var(--color-text)' }}
                onFocus={() => snakeRef.current?.highlight('password')}
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
            ref={submitButtonRef}
            onMouseEnter={() => snakeRef.current?.highlight('submit')}
            onFocus={() => snakeRef.current?.highlight('submit')}
            disabled={isPending || !email || !password}
            className="mt-5 mb-5 w-full rounded-[20px] py-[14px] text-[15px] font-black tracking-wide transition flex items-center justify-center gap-2 disabled:opacity-60"
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
      </div>

      {/* Registreer skakel */}
      <div className="mt-5">

        <a
           href="/register"
           className="block w-full text-center rounded-[12px] py-[13px] text-[14px] font-bold border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all duration-200"
           style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text-subtle)',
          }}
        >
          Registreer
        
        </a>

      </div>

      {/* Geen rekening onderteks */}
          <p
            className="mt-3 text-center text-[13px]"
            style={{ color: 'var(--color-text-subtle)' }}
          >
          Is jy &apos;n Dosent?
          <span className="block h-2" />
          Kontak die Agora stelseladministrateur vir &apos;n rekening.
          </p>
    </div>
    
  );
}
