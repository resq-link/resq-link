'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  subscribeToFootageRequests,
  updateFootageRequestStatus,
  type FootageRequest,
} from '@packages/firebase'
import CommandBar from '@/components/CommandBar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { FootageRequestCard } from './_shared'

type TabType = 'pending' | 'history';

export default function FootageRequestsPage() {
  const [requests, setRequests] = useState<FootageRequest[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('pending')

  useEffect(() => {
    const unsub = subscribeToFootageRequests(setRequests)
    return () => unsub()
  }, [])

  const pending = useMemo(
    () => requests.filter((r) => r.status === 'pending'),
    [requests]
  )

  const History = useMemo(
    () =>
      requests.filter(
        (r) => r.status === 'footage_found' || r.status === 'footage_not_found'
      ),
    [requests]
  )

  const activeRequests = activeTab === 'pending' ? pending : History

  const handleStatus = async (id: string, status: 'footage_found' | 'footage_not_found') => {
    setUpdatingId(id)
    try {
      await updateFootageRequestStatus(id, status)
      if (pending.length === 1 && activeTab === 'pending') {
        // Automatically switch to history if we just cleared the last pending item
        setActiveTab('history')
      }
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-full bg-slate-950">
        <CommandBar 
          pageName="Footage Requests" 
          description="Manage and track multi-agency visual evidence requests"
          statsCategory="Footage"
          stats={[
            { label: 'Pending', value: pending.length, highlight: true },
            { label: 'Resolved History', value: History.length }
          ]}
        >
          <div className="flex bg-slate-900/50 p-0.5 rounded-lg border border-slate-800 shrink-0">
            {(['pending', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === tab 
                    ? 'bg-slate-100 text-slate-950 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === 'pending' ? 'Pending' : 'Request History'}
                {tab === 'pending' && pending.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${activeTab === tab ? 'bg-amber-500 text-black' : 'bg-amber-500/20 text-amber-500'}`}>
                    {pending.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </CommandBar>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar no-scrollbar">
          {activeRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700/60 bg-slate-900/20 p-12 text-center">
              <div className="mx-auto mb-3 w-10 h-10 rounded-full border border-slate-700 bg-slate-900/80 flex items-center justify-center text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-300 text-lg font-semibold border-none">
                {activeTab === 'pending' ? 'No pending footage requests' : 'No completed footage requests yet'}
              </p>
              <p className="text-slate-500 text-sm mt-2">
                {activeTab === 'pending' ? 'All clear. Pending requests will appear here.' : 'Resolved footage requests will appear here.'}
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-4">
              <h2 className="text-xl font-bold text-slate-100 mb-4 capitalize">
                {activeTab === 'pending' ? 'Pending Tracker' : 'Historical Archive'} ({activeRequests.length})
              </h2>
              <ul className="space-y-4">
                {activeRequests.map((req) => (
                  <FootageRequestCard
                    key={req.id || ''}
                    req={req}
                    updatingId={updatingId}
                    onStatus={activeTab === 'pending' ? handleStatus : undefined}
                    showActions={activeTab === 'pending'}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
