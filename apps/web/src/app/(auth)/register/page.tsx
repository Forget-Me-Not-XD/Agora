'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Circle, ChevronDown, X } from 'lucide-react';
import { registerAction } from '@/lib/actions/auth.actions';
import type { RegisterPayload } from '@/lib/types';

type UiRole = 'GAS' | 'STUDENT' | 'DOSENT' | 'ADMIN';

const ROLE_OPTIONS: Array<{ value: UiRole; label: string; subtitle: string }> = [
  { value: 'GAS',     label: 'GAS',    subtitle: 'Gas'           },
  { value: 'STUDENT', label: 'STUDENT',subtitle: 'Student'       },
  { value: 'DOSENT',  label: 'DOSENT', subtitle: 'Dosent'        },
  { value: 'ADMIN',   label: 'ADMIN',  subtitle: 'Administrateur' },
];

const STUDY_CENTERS = [
  'Centurion - Leriba',
  'Centurion - Gerhard straat',
  'Paarl',
  'George',
  'Somerset Wes',
] as const;

type Center = (typeof STUDY_CENTERS)[number];

export default function RegisterPage() {
  const [uiRole, setUiRole]                   = useState<UiRole>('STUDENT');
  const [centerOpen, setCenterOpen]           = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [isPending, setIsPending]             = useState(false);
  const dropdownRef                           = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<RegisterPayload>({
    name: '', surname: '', email: '', password: '', role: 'GAS', studyCenter: '',
  });

  const update = <K extends keyof RegisterPayload>(key: K, value: RegisterPayload[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Password validation
  const passwordRules = useMemo(() => ({
    minLength: form.password.length >= 8,
    hasUpper:  /[A-Z]/.test(form.password),
    hasLower:  /[a-z]/.test(form.password),
    hasNumber: /[0-9]/.test(form.password),
  }), [form.password]);

  const showValidation = passwordFocused || form.password.length > 0;

  // Role → payload mapping
  const payloadRole: RegisterPayload['role'] = useMemo(() => {
    if (uiRole === 'STUDENT') return 'GAS';
    return uiRole as RegisterPayload['role'];
  }, [uiRole]);

  const showStudyCenter = uiRole !== 'GAS';

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCenterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const err = await registerAction({
        ...form,
        role: payloadRole,
        studyCenter: showStudyCenter ? form.studyCenter : '',
      });
      if (err) setError(err);
      // On success, registerAction calls redirect('/dashboard')
    } finally {
      setIsPending(false);
    }
  };

  const inputBase =
    'w-full rounded-[10px] px-[14px] py-3 text-[15px] border text-app placeholder:text-subtle focus:outline-none transition disabled:opacity-60';
  const inputStyle = {
    background: 'var(--color-bg)',
    borderColor: 'var(--color-border)',
  };
  const focusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) =>
      (e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary)'),
    onBlur: (e: React.FocusEvent<HTMLInputElement>) =>
      (e.currentTarget.style.boxShadow = ''),
  };

  return (
    <div className="w-full max-w-sm">

      {/* ── Heading ────────────────────────────────────────────────────── */}
      <h1 className="text-[28px] font-bold text-app mb-1">Skep &apos;n rekening</h1>
      <p className="text-[14px] text-subtle mb-6">Voltooi al die velde om voort te gaan</p>

      {/* ── Error box – splits comma-joined backend messages ─────────── */}
      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-[10px] border text-[13px] font-semibold space-y-1"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-red)' }}
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

        {/* ── Name row ─────────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-3">
          <input
            className={inputBase}
            style={inputStyle}
            placeholder="Naam"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            disabled={isPending}
            {...focusHandlers}
          />
          <input
            className={inputBase}
            style={inputStyle}
            placeholder="Van"
            value={form.surname}
            onChange={(e) => update('surname', e.target.value)}
            disabled={isPending}
            {...focusHandlers}
          />
        </div>

        {/* ── Email ────────────────────────────────────────────────────── */}
        <input
          type="email"
          autoComplete="email"
          className={`${inputBase} mb-3`}
          style={inputStyle}
          placeholder="E-pos"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          disabled={isPending}
          {...focusHandlers}
        />

        {/* ── Password + toggle ─────────────────────────────────────────── */}
        <div className="relative mb-0">
          <input
            type={passwordVisible ? 'text' : 'password'}
            autoComplete="new-password"
            className={`${inputBase} pr-11`}
            style={inputStyle}
            placeholder="Wagwoord (min. 8 karakters)"
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-app transition disabled:opacity-50"
          >
            {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        {/* ── Live password validation checklist (animates in/out) ─────── */}
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out mb-3"
          style={{ maxHeight: showValidation ? '130px' : '0px', opacity: showValidation ? 1 : 0 }}
        >
          <div
            className="mt-2 mb-3 rounded-[10px] px-3 py-2 border"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {(
              [
                { ok: passwordRules.minLength, label: 'Minstens 8 karakters'  },
                { ok: passwordRules.hasUpper,  label: 'Minstens 1 hoofletter'  },
                { ok: passwordRules.hasLower,  label: 'Minstens 1 kleinletter' },
                { ok: passwordRules.hasNumber, label: 'Minstens 1 syfer'       },
              ] as const
            ).map((rule) => (
              <div key={rule.label} className="flex items-center gap-2 py-1">
                {rule.ok
                  ? <CheckCircle size={13} style={{ color: 'var(--color-green)' }} />
                  : <Circle size={13} className="text-subtle" />
                }
                <span
                  className="text-[12px] font-medium"
                  style={{ color: rule.ok ? 'var(--color-green)' : 'var(--color-text-subtle)', fontWeight: rule.ok ? 700 : 500 }}
                >
                  {rule.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Study centre dropdown (hidden for GAS role) ───────────────── */}
        {showStudyCenter && (
          <div className="relative mb-3" ref={dropdownRef}>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setCenterOpen((o) => !o)}
              className="w-full flex items-center justify-between rounded-[10px] px-[14px] py-3 border text-[15px] transition disabled:opacity-60"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
                color: form.studyCenter ? 'var(--color-text)' : 'var(--color-text-subtle)',
                fontWeight: form.studyCenter ? 600 : 400,
              }}
            >
              <span>{form.studyCenter || 'Studiesentrum'}</span>
              <ChevronDown
                size={16}
                className="text-subtle transition-transform"
                style={{ transform: centerOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {centerOpen && (
              <div
                className="absolute z-50 mt-1 w-full rounded-[16px] border shadow-lg overflow-hidden"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                {/* Header row */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span className="text-[15px] font-black text-app">Kies studiesentrum</span>
                  <button
                    type="button"
                    onClick={() => setCenterOpen(false)}
                    className="text-subtle hover:text-app"
                  >
                    <X size={16} />
                  </button>
                </div>
                {STUDY_CENTERS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => { update('studyCenter', c); setCenterOpen(false); }}
                    className="w-full text-left px-4 py-3 text-[14px] font-bold text-app hover:bg-app transition border-b last:border-b-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Role grid ────────────────────────────────────────────────── */}
        <p className="text-[14px] font-semibold text-app mb-2 mt-1">Rol</p>
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {ROLE_OPTIONS.map((r) => {
            const active = uiRole === r.value;
            return (
              <button
                type="button"
                key={r.value}
                disabled={isPending}
                onClick={() => {
                  setUiRole(r.value);
                  if (r.value === 'GAS') update('studyCenter', '');
                }}
                className="rounded-[14px] border py-[14px] px-3 flex flex-col items-center transition disabled:opacity-60"
                style={{
                  background:   active ? 'var(--color-primary)' : 'var(--color-surface)',
                  borderColor:  active ? 'var(--color-primary)' : 'var(--color-border)',
                }}
              >
                <span
                  className="text-[14px] font-black tracking-wide"
                  style={{ color: active ? 'var(--color-primary-text)' : 'var(--color-text)' }}
                >
                  {r.label}
                </span>
                <span
                  className="text-[12px] font-bold mt-1"
                  style={{ color: active ? 'var(--color-primary-text)' : 'var(--color-text-subtle)' }}
                >
                  {r.subtitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Submit ───────────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-[12px] py-[14px] text-[15px] font-black tracking-wide flex items-center justify-center gap-2 transition disabled:opacity-60"
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-primary-text)',
          }}
        >
          {isPending ? (
            <><Loader2 size={16} className="animate-spin" /> Besig…</>
          ) : (
            'Registreer'
          )}
        </button>
      </form>

      {/* ── Back to login ──────────────────────────────────────────────── */}
      <p className="mt-[20px] text-center text-[14px] text-subtle">
        Het reeds &apos;n rekening?{' '}
        <Link
          href="/login"
          className="font-black"
          style={{ color: 'var(--color-primary)' }}
        >
          Meld aan
        </Link>
      </p>
    </div>
  );
}
