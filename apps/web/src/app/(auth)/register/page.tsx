'use client';

import { useMemo, useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Circle, ChevronDown, X } from 'lucide-react';
import { registerAction } from '@/lib/actions/auth.actions';
import type { RegisterPayload } from '@/lib/types';

type UiRole = 'GAS' | 'STUDENT';

const ROLE_OPTIONS: Array<{ value: UiRole; label: string; subtitle: string }> = [
  { value: 'GAS',     label: 'GAS',     subtitle: 'Gas'            },
  { value: 'STUDENT', label: 'STUDENT', subtitle: 'Student'        },
];

const STUDY_CENTERS = [
  'Centurion - Leriba',
  'Centurion - Gerhard straat',
  'Paarl',
  'George',
  'Somerset Wes',
] as const;

export default function RegisterPage() {
  const router = useRouter();

  const [uiRole, setUiRole]                   = useState<UiRole | null>(null);
  const [roleOpen, setRoleOpen]               = useState(false);
  const [centerOpen, setCenterOpen]           = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible]   = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [popiaAccepted, setPopiaAccepted]     = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [isPending, startTransition]          = useTransition();
  const roleRef   = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<RegisterPayload>({
    name: '', surname: '', email: '', password: '', role: 'GAS', studyCenter: '',
  });

  const update = <K extends keyof RegisterPayload>(key: K, value: RegisterPayload[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const passwordRules = useMemo(() => ({
    minLength: form.password.length >= 8,
    hasUpper:  /[A-Z]/.test(form.password),
    hasLower:  /[a-z]/.test(form.password),
    hasNumber: /[0-9]/.test(form.password),
    hasSymbol: /[^a-zA-Z0-9\s]/.test(form.password),
  }), [form.password]);

  const allPasswordRulesPass = Object.values(passwordRules).every(Boolean);
  const showValidation       = passwordFocused || form.password.length > 0;
  const passwordsMatch       = form.password === confirmPassword;
  const showStudyCenter      = uiRole !== null && uiRole !== 'GAS';
  const selectedRole         = ROLE_OPTIONS.find((r) => r.value === uiRole) ?? null;

  const formComplete =
    form.name.trim()    !== '' &&
    form.surname.trim() !== '' &&
    form.email.trim()   !== '' &&
    form.password       !== '' &&
    confirmPassword     !== '' &&
    passwordsMatch &&
    allPasswordRulesPass &&
    uiRole !== null &&
    (!showStudyCenter || form.studyCenter !== '') &&
    popiaAccepted;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleRef.current   && !roleRef.current.contains(e.target as Node))   setRoleOpen(false);
      if (centerRef.current && !centerRef.current.contains(e.target as Node)) setCenterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formComplete) return;
    if (!passwordsMatch) {
      setError('Wagwoorde stem nie ooreen nie.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const err = await registerAction({
        ...form,
        email:       form.email.trim(),
        role:        uiRole as RegisterPayload['role'], 
        studyCenter: showStudyCenter ? form.studyCenter : '',
      });
      if (err) setError(err);
    });
  };

  const inputStyle = {
    background:  'var(--color-bg)',
    borderColor: 'var(--color-border)',
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary)');
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.boxShadow = '');
  const inputClass =
    'w-full rounded-[10px] px-[14px] py-3 text-[15px] border focus:outline-none transition disabled:opacity-60';

  return (
    <div className="w-full max-w-sm">

      {/* Page title */}
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-[28px] font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
          Nuwe Registrasie
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-subtle)' }}>
          Slegs deur &apos;n administrateur voltooi
        </p>
      </div>

      {/* Form card */}
      <div
        className="rounded-[16px] border p-6"
        style={{
          background:  'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >

        {/* Error banner */}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-[12px] border text-[13px] font-semibold space-y-1"
            style={{
              background:  'var(--color-bg)',
              borderColor: 'var(--color-red)',
            }}
          >
            {error.split(', ').map((msg, i) => (
              <p key={i} className="flex items-center gap-1.5" style={{ color: 'var(--color-red)' }}>
                <AlertCircle size={13} className="shrink-0" />
                {msg}
              </p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* Naam + Van */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="block mb-1">
                <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
                  Naam <span style={{ color: 'var(--color-primary)' }}>*</span>
                </span>
              </label>
              <input
                className={inputClass}
                style={{ ...inputStyle, color: 'var(--color-text)' }}
                placeholder="Naam"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                disabled={isPending}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1">
                <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
                  Van <span style={{ color: 'var(--color-primary)' }}>*</span>
                </span>
              </label>
              <input
                className={inputClass}
                style={{ ...inputStyle, color: 'var(--color-text)' }}
                placeholder="Van"
                value={form.surname}
                onChange={(e) => update('surname', e.target.value)}
                disabled={isPending}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          </div>

          {/* E-pos */}
          <label className="block mb-3">
            <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
              E-pos adres <span style={{ color: 'var(--color-primary)' }}>*</span>
            </span>
            <input
              type="email"
              autoComplete="email"
              className={`${inputClass} mt-1`}
              style={{ ...inputStyle, color: 'var(--color-text)' }}
              placeholder="naam@akademia.ac.za"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              disabled={isPending}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </label>

          {/* Wagwoord */}
          <label className="block mb-0">
            <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
              Wagwoord <span style={{ color: 'var(--color-primary)' }}>*</span>
            </span>
            <div className="relative mt-1">
              <input
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="new-password"
                className={`${inputClass} pr-11`}
                style={{ ...inputStyle, color: 'var(--color-text)' }}
                placeholder="Minimum 8 karakters"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                disabled={isPending}
                onFocus={(e) => {
                  setPasswordFocused(true);
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary)';
                }}
                onBlur={(e) => {
                  setPasswordFocused(false);
                  e.currentTarget.style.boxShadow = '';
                }}
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

          {/* Wagwoord validasie blok */}
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: showValidation ? '165px' : '0px', opacity: showValidation ? 1 : 0 }}
          >
            <div
              className="mt-2 rounded-[10px] px-3 py-2 border"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              {([
                { ok: passwordRules.minLength, label: 'Minstens 8 karakters'   },
                { ok: passwordRules.hasUpper,  label: 'Minstens 1 hoofletter'  },
                { ok: passwordRules.hasLower,  label: 'Minstens 1 kleinletter' },
                { ok: passwordRules.hasNumber, label: 'Minstens 1 syfer'       },
                { ok: passwordRules.hasSymbol, label: 'Minstens 1 simbool'     },
              ] as const).map((rule) => (
                <div key={rule.label} className="flex items-center gap-2 py-1">
                  {rule.ok
                    ? <CheckCircle size={13} style={{ color: 'var(--color-green)' }} />
                    : <Circle      size={13} style={{ color: 'var(--color-text-subtle)' }} />
                  }
                  <span
                    className="text-[12px]"
                    style={{
                      color:      rule.ok ? 'var(--color-green)' : 'var(--color-text-subtle)',
                      fontWeight: rule.ok ? 700 : 500,
                    }}
                  >
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bevestig Wagwoord */}
          <label className="block mt-3 mb-3">
            <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
              Bevestig Wagwoord <span style={{ color: 'var(--color-primary)' }}>*</span>
            </span>
            <div className="relative mt-1">
              <input
                type={confirmVisible ? 'text' : 'password'}
                autoComplete="new-password"
                className={`${inputClass} pr-11`}
                style={{
                  ...inputStyle,
                  color:       'var(--color-text)',
                  borderColor: confirmPassword.length > 0 && !passwordsMatch
                    ? 'var(--color-red)'
                    : 'var(--color-border)',
                }}
                placeholder="Herhaal wagwoord"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isPending}
                onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary)')}
                onBlur={(e)  => (e.currentTarget.style.boxShadow = '')}
              />
              <button
                type="button"
                aria-label={confirmVisible ? 'Versteek wagwoord' : 'Wys wagwoord'}
                onClick={() => setConfirmVisible((v) => !v)}
                disabled={isPending}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition disabled:opacity-50"
                style={{ color: 'var(--color-text-subtle)' }}
              >
                {confirmVisible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="flex items-center gap-1.5 mt-1.5 text-[12px] font-semibold" style={{ color: 'var(--color-red)' }}>
                <AlertCircle size={12} className="shrink-0" />
                Wagwoorde stem nie ooreen nie.
              </p>
            )}
          </label>

          {/* Ek is 'n: dropdown */}
          <label className="block mb-3">
            <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
              Ek is 'n: <span style={{ color: 'var(--color-primary)' }}>*</span>
            </span>
            <div className="relative mt-1" ref={roleRef}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setRoleOpen((o) => !o)}
                className="w-full flex items-center justify-between rounded-[10px] px-[14px] py-3 border text-[15px] transition disabled:opacity-60 focus:outline-none"
                style={{
                  background:  'var(--color-bg)',
                  borderColor: 'var(--color-border)',
                  color:       selectedRole ? 'var(--color-text)' : 'var(--color-text-subtle)',
                }}
              >
                <span style={{ fontWeight: selectedRole ? 600 : 400 }}>
                  {selectedRole ? selectedRole.subtitle : "Ek is 'n:"}
                </span>
                <ChevronDown
                  size={16}
                  style={{
                    color:      'var(--color-text-subtle)',
                    transform:  roleOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>

              {roleOpen && (
                <div
                  className="absolute z-50 mt-1 w-full rounded-[16px] border shadow-lg overflow-hidden"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <span className="text-[15px] font-black" style={{ color: 'var(--color-text)' }}>
                      Kies rol
                    </span>
                    <button
                      type="button"
                      onClick={() => setRoleOpen(false)}
                      style={{ color: 'var(--color-text-subtle)' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {ROLE_OPTIONS.map((r) => (
                    <button
                      type="button"
                      key={r.value}
                      onClick={() => {
                        setUiRole(r.value);
                        if (r.value === 'GAS') update('studyCenter', '');
                        setRoleOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-[14px] transition border-b last:border-b-0"
                      style={{
                        borderColor: 'var(--color-border)',
                        background:  uiRole === r.value ? 'var(--color-primary)' : 'transparent',
                        color:       uiRole === r.value ? 'var(--color-primary-text)' : 'var(--color-text)',
                        fontWeight:  uiRole === r.value ? 700 : 400,
                      }}
                    >
                      {r.subtitle}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>

          {/* Studiesentrum dropdown */}
          {showStudyCenter && (
            <label className="block mb-3">
              <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
                Studiesentrum <span style={{ color: 'var(--color-primary)' }}>*</span>
              </span>
              <div className="relative mt-1" ref={centerRef}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setCenterOpen((o) => !o)}
                  className="w-full flex items-center justify-between rounded-[10px] px-[14px] py-3 border text-[15px] transition disabled:opacity-60 focus:outline-none"
                  style={{
                    background:  'var(--color-bg)',
                    borderColor: 'var(--color-border)',
                    color:       form.studyCenter ? 'var(--color-text)' : 'var(--color-text-subtle)',
                    fontWeight:  form.studyCenter ? 600 : 400,
                  }}
                >
                  <span>{form.studyCenter || 'Studiesentrum'}</span>
                  <ChevronDown
                    size={16}
                    style={{
                      color:      'var(--color-text-subtle)',
                      transform:  centerOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>

                {centerOpen && (
                  <div
                    className="absolute z-50 mt-1 w-full rounded-[16px] border shadow-lg overflow-hidden"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    <div
                      className="flex items-center justify-between px-4 py-3 border-b"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <span className="text-[15px] font-black" style={{ color: 'var(--color-text)' }}>
                        Kies studiesentrum
                      </span>
                      <button
                        type="button"
                        onClick={() => setCenterOpen(false)}
                        style={{ color: 'var(--color-text-subtle)' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {STUDY_CENTERS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => { update('studyCenter', c); setCenterOpen(false); }}
                        className="w-full text-left px-4 py-3 text-[14px] transition border-b last:border-b-0"
                        style={{
                          borderColor: 'var(--color-border)',
                          background:  form.studyCenter === c ? 'var(--color-primary)' : 'transparent',
                          color:       form.studyCenter === c ? 'var(--color-primary-text)' : 'var(--color-text)',
                          fontWeight:  form.studyCenter === c ? 700 : 400,
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          )}

          {/* POPIA Kennisgewing */}
          <div
            className="rounded-[12px] border px-4 py-3 mb-5"
            style={{
              background:  'var(--color-jwt-bg)',
              borderColor: 'var(--color-primary)',
            }}
          >
            <p className="text-[12px] font-black mb-1.5" style={{ color: 'var(--color-primary)' }}>
              POPIA Kennisgewing
            </p>
            <p className="text-[11px] mb-3" style={{ color: 'var(--color-text-subtle)', lineHeight: '1.6' }}>
              Persoonlike data word verwerk ooreenkomstig die Protection of Personal
              Information Act (POPIA). Data word slegs gebruik vir stelseltoegangsbeheer
              en sal NIE met derde partye gedeel word nie.
            </p>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                type="button"
                role="checkbox"
                aria-checked={popiaAccepted}
                onClick={() => setPopiaAccepted((v) => !v)}
                disabled={isPending}
                className="w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center flex-shrink-0 transition disabled:opacity-60"
                style={{
                  background:  'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {popiaAccepted && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path
                      d="M1 4L4 7L10 1"
                      stroke="var(--color-primary)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>
                Ek stem saam met die POPIA voorwaardes
              </span>
            </label>
          </div>

          {/* Kanselleer + Registreer */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/login')}
              disabled={isPending}
              className="flex-1 rounded-[12px] py-[14px] text-[15px] font-black tracking-wide border transition disabled:opacity-60"
              style={{
                background:  'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color:       'var(--color-text)',
              }}
            >
              Kanselleer
            </button>
            <button
              type="submit"
              disabled={isPending || !formComplete}
              className="flex-1 rounded-[12px] py-[14px] text-[15px] font-black tracking-wide flex items-center justify-center gap-2 transition disabled:opacity-60"
              style={{
                background: 'var(--color-primary)',
                color:      'var(--color-primary-text)',
              }}
            >
              {isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Besig…</>
              ) : (
                'Registreer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
