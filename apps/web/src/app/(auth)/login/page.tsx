'use client';

// ========== Imports: ==========
import { useEffect, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { loginAction } from '@/lib/actions/auth.actions';
import { SnakeFieldBorder, type SnakeFieldBorderHandle } from '@/components/SnakeFieldBorder';
import NoAccountModal from '@/components/NoAccountModal';

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
  const [noAccountOpen, setNoAccountOpen]     = useState(false);
  const [noAccountEmail, setNoAccountEmail]   = useState<string | null>(null);
  const [deletedNotice, setDeletedNotice]     = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('error') === 'sso_no_account') {
      setNoAccountEmail(params.get('email'));
      setNoAccountOpen(true);
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    if (params.get('error') === 'sso_failed') {
      setError('Aanmelding met Google/Microsoft het misluk. Probeer weer, of meld aan met jou wagwoord.');
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    if (params.get('deleted') === 'true') {
      setDeletedNotice(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

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
          className="text-[16px] mt-1 tracking-wide"
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

        {/* Rekening verwyder bevestiging */}
        {deletedNotice && (
          <div
            className="mb-4 px-4 py-3 rounded-[12px] border text-[16px] font-semibold"
            style={{
              background:  'var(--color-bg)',
              borderColor: 'var(--color-primary)',
              color:       'var(--color-text)',
            }}
          >
            Jou rekening is suksesvol verwyder.
          </div>
        )}

        {/* Wagwoord vergeet info */}
        {forgotInfo && (
          <div
            className="mb-4 px-4 py-3 rounded-[12px] border text-[16px] font-semibold"
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
            className="mb-4 px-4 py-3 rounded-[12px] border text-[16px] font-semibold"
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
            <span className="text-[16px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
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
              className="mt-1.5 w-full bg-transparent border-0 pb-2 text-[16px] focus:outline-none transition disabled:opacity-60"
              style={{ color: 'var(--color-text)' }}
              onFocus={() => snakeRef.current?.highlight('email')}
            />
          </label>

          {/* Wagwoord */}
          <label className="block mt-[10px] mb-1.5">
            <span className="text-[16px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
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
                className="w-full bg-transparent border-0 pb-2 pr-11 text-[16px] focus:outline-none transition disabled:opacity-60"
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
              <span className="text-[16px] font-semibold" style={{ color: 'var(--color-text-subtle)' }}>
                Onthou my
              </span>
            </label>
            <button
              type="button"
              className="text-[16px] font-bold transition"
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
            className="mt-5 mb-5 w-full rounded-[20px] py-[14px] text-[16px] font-black tracking-wide transition flex items-center justify-center gap-2 disabled:opacity-60"
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

        {/* Skeiding: OF */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
          <span className="text-[16px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>OF</span>
          <div className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* SSO knoppies */}
        <div className="space-y-2.5">
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/v1/auth/google`}
            className="w-full flex items-center justify-center gap-2.5 rounded-[12px] py-[13px] text-[16px] font-bold border transition-all duration-200"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" />
            </svg>
            Meld aan met Google
          </a>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/v1/auth/microsoft`}
            className="w-full flex items-center justify-center gap-2.5 rounded-[12px] py-[13px] text-[16px] font-bold border transition-all duration-200"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Meld aan met Microsoft
          </a>
        </div>
      </div>

      {/* Registreer skakel */}
      <div className="mt-5">

        <a
           href="/register"
           className="block w-full text-center rounded-[12px] py-[13px] text-[16px] font-bold border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all duration-200"
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
            className="mt-3 text-center text-[16px]"
            style={{ color: 'var(--color-text-subtle)' }}
          >
          Is jy &apos;n Dosent?
          <span className="block h-2" />
          Kontak die Agora stelseladministrateur vir &apos;n rekening.
          </p>

      <NoAccountModal
        open={noAccountOpen}
        email={noAccountEmail}
        onClose={() => setNoAccountOpen(false)}
      />
    </div>

  );
}
