'use client';

import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { PasswordField } from './PasswordField';

export function LoginView({
  email,
  password,
  loading,
  checkingSession,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  email: string;
  password: string;
  loading: boolean;
  checkingSession?: boolean;
  error: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const busy = loading || Boolean(checkingSession);

  return (
    <div className="resq-login-page relative flex min-h-screen items-center justify-center overflow-y-auto bg-[#070b12] px-4 py-10 text-slate-100">
      <div className="relative w-full max-w-[26rem]">
        <div className="mb-8 text-center">
          <Image
            src="/branding/resq-link-logo.png"
            alt="RESQ-LINK"
            width={168}
            height={44}
            priority
            className="mx-auto h-11 w-auto mix-blend-screen"
          />
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-emerald-400/90">
            Emergency Response System
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/90 bg-slate-950/70 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-8">
          <h1 className="text-center text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
          <p className="mt-2 text-center text-sm leading-6 text-slate-400">
            Sign in to securely access your authorized workspace.
          </p>

          {checkingSession ? (
            <div className="mt-10 flex items-center justify-center gap-2 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              Verifying access...
            </div>
          ) : (
            <form
              className="mt-8 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
              }}
            >
              {error ? (
                <div
                  role="alert"
                  className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2.5 text-sm text-red-200"
                >
                  {error}
                </div>
              ) : null}

              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-200">
                  Email Address
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={busy}
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60"
                />
              </div>

              <PasswordField value={password} onChange={onPasswordChange} disabled={busy} />

              <button
                type="submit"
                disabled={busy}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[#070b12] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          RESQ-LINK Emergency Response System · Authorized access only
        </p>
      </div>
    </div>
  );
}
