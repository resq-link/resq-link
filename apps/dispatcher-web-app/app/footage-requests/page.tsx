'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  subscribeToFootageRequests,
  updateFootageRequestStatus,
  type FootageRequest,
} from '@packages/firebase'
import {
  FootageRequestCard,
  FootageRequestsHeader,
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
    <>
      <FootageRequestsHeader
        title="Live footage requests"
        description="Pending civilian requests. When you mark footage found or not found, the request moves to History."
      />

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
    </>
  )
}
