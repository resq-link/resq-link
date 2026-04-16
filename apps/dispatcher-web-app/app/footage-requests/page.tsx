'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  subscribeToFootageRequests,
  updateFootageRequestStatus,
  type FootageRequest,
} from '@packages/firebase'
import CommandBar from '@/components/CommandBar'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  FootageRequestCard,
} from './_shared'

export default function FootageRequestsLivePage() {
  const router = useRouter()
  const [requests, setRequests] = useState<FootageRequest[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeToFootageRequests(setRequests)
    return () => unsub()
  }, [])

  const pending = useMemo(
    () => requests.filter((r) => r.status === 'pending'),
    [requests]
  )

  const handleStatus = async (id: string, status: 'footage_found' | 'footage_not_found') => {
    setUpdatingId(id)
    try {
      await updateFootageRequestStatus(id, status)
      router.push('/footage-requests/history')
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-full">
        <CommandBar 
          pageName="Live Footage Requests" 
          description="Real-time multi-agency visual evidence requests"
          statsCategory="Footage"
          stats={[
            { label: 'Pending', value: pending.length, highlight: true }
          ]}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/footage-requests/history')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 transition-colors"
            >
              VIEW HISTORY
            </button>
          </div>
        </CommandBar>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar no-scrollbar">
          {pending.length === 0 ? (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-12 text-center">
              <p className="text-slate-400">No pending footage requests.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {pending.map((req) => (
                <FootageRequestCard
                  key={req.id || ''}
                  req={req}
                  updatingId={updatingId}
                  onStatus={handleStatus}
                  showActions
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
