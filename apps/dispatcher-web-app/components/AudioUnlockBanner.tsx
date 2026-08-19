'use client'

import { Volume2 } from 'lucide-react'
import { usePriorityAlerts } from '@/contexts/PriorityAlertContext'

export default function AudioUnlockBanner() {
  const { audioReady, unlockAudio, unacknowledgedAlertCount } = usePriorityAlerts()

  if (audioReady || unacknowledgedAlertCount === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9998] max-w-sm rounded-xl border border-amber-500/40 bg-amber-950/95 px-4 py-3 shadow-xl backdrop-blur-sm">
      <p className="text-sm font-semibold text-amber-100">Alert audio is blocked</p>
      <p className="mt-1 text-xs text-amber-200/80">
        Your browser requires a click before emergency sounds can play.
      </p>
      <button
        type="button"
        onClick={() => void unlockAudio()}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-950 transition hover:bg-amber-400"
      >
        <Volume2 className="h-4 w-4" aria-hidden />
        Enable alert sounds
      </button>
    </div>
  )
}
