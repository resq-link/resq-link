'use client'

import { useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const OperationalChatWidget = dynamic(
  () => import('@/components/OperationalChatWidget'),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        disabled
        className="fixed bottom-24 right-4 z-50 flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-slate-900/95 px-4 text-slate-100 shadow-2xl shadow-black/30 backdrop-blur-xl sm:right-6"
        aria-label="Opening operational messages"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-slate-950">
          <MessageCircle size={20} aria-hidden />
        </span>
        <span className="hidden flex-col items-start leading-none sm:flex">
          <span className="text-xs font-black uppercase tracking-[0.18em]">Messages</span>
          <span className="mt-1 text-[10px] font-semibold text-slate-500">Ops chat</span>
        </span>
      </button>
    ),
  }
)

function LaunchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-24 right-4 z-50 flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-slate-900/95 px-4 text-slate-100 shadow-2xl shadow-black/30 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-slate-800 sm:right-6"
      aria-label="Open operational messages"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-slate-950">
        <MessageCircle size={20} aria-hidden />
      </span>
      <span className="hidden flex-col items-start leading-none sm:flex">
        <span className="text-xs font-black uppercase tracking-[0.18em]">Messages</span>
        <span className="mt-1 text-[10px] font-semibold text-slate-500">Ops chat</span>
      </span>
    </button>
  )
}

export default function DeferredOperationalChatWidget() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [loaded, setLoaded] = useState(false)
  const handleOpen = useCallback(() => setLoaded(true), [])

  if (!user || pathname === '/login') {
    return null
  }

  if (loaded) {
    return <OperationalChatWidget defaultOpen />
  }

  return <LaunchButton onClick={handleOpen} />
}
