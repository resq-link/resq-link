'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { routes } from '@/lib/routes'

export default function AccessDeniedPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="access-denied-page flex min-h-screen items-center justify-center bg-[#070b12] px-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/80 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/80">RESQ-LINK</p>
        <h1 className="mt-4 text-2xl font-semibold text-white">Access restricted</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Your account is not authorized to access this workspace.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={routes.login}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Return to login
          </Link>
          {user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-900"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
