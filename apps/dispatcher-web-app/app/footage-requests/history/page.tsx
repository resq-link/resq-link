'use client'

import { useEffect, useState, useMemo } from 'react'
import { subscribeToFootageRequests, type FootageRequest } from '@packages/firebase'
import CommandBar from '@/components/CommandBar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useRouter } from 'next/navigation'
import { FootageRequestCard } from '../_shared'

export default function FootageRequestsHistoryPage() {
  const [requests, setRequests] = useState<FootageRequest[]>([])

  useEffect(() => {
    const unsub = subscribeToFootageRequests(setRequests)
    return () => unsub()
  }, [])

  const resolved = useMemo(
    () =>
      requests.filter(
        (r) => r.status === 'footage_found' || r.status === 'footage_not_found'
      ),
    [requests]
  )

  const router = useRouter()

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-full">
        <CommandBar 
          pageName="Footage Request History" 
          description="Archived footage records and request outcomes"
          statsCategory="Footage"
          stats={[
            { label: 'Resolved', value: resolved.length, highlight: true }
          ]}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/footage-requests')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 transition-colors"
            >
              BACK TO LIVE
            </button>
          </div>
        </CommandBar>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar no-scrollbar">
          {resolved.length === 0 ? (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-12 text-center">
              <p className="text-slate-400">No completed footage requests yet.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {resolved.map((req) => (
                <FootageRequestCard
                  key={req.id || ''}
                  req={req}
                  updatingId={null}
                  showActions={false}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
