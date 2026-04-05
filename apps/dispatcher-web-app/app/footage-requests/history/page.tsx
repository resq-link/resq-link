'use client'

import { useEffect, useState, useMemo } from 'react'
import { subscribeToFootageRequests, type FootageRequest } from '@packages/firebase'
import { FootageRequestCard, FootageRequestsHeader } from '../_shared'

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

  return (
    <>
      <FootageRequestsHeader
        title="Footage request history"
        description="Requests you have already marked as footage found or not found."
      />

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
    </>
  )
}
