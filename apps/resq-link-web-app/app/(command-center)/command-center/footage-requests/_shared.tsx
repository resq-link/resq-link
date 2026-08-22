'use client'

import {
  FOOTAGE_PURPOSE_LABELS,
  type FootageRequest,
  type FootageRequestStatus,
} from '@packages/firebase'
import { Video, MapPin, FileText, Calendar } from 'lucide-react'

export function formatSubmittedAt(req: FootageRequest): string {
  const d = req.createdAt
  if (!d) return '—'
  const date =
    d instanceof Date
      ? d
      : typeof d === 'object' && d && 'toDate' in d
        ? (d as { toDate: () => Date }).toDate()
        : new Date()
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export const statusLabel: Record<FootageRequestStatus, string> = {
  pending: 'Pending',
  footage_found: 'Footage found',
  footage_not_found: 'Footage not found',
}

export const statusBadgeClass: Record<FootageRequestStatus, string> = {
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  footage_found: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  footage_not_found: 'border-slate-500/40 bg-slate-700/50 text-slate-300',
}

type FootageRequestCardProps = {
  req: FootageRequest
  updatingId: string | null
  onStatus?: (id: string, status: 'footage_found' | 'footage_not_found') => void
  showActions: boolean
}

export function FootageRequestCard({
  req,
  updatingId,
  onStatus,
  showActions,
}: FootageRequestCardProps) {
  const id = req.id || ''
  const purposeLabel = FOOTAGE_PURPOSE_LABELS[req.purpose] || req.purpose
  const purposeDisplay =
    req.purpose === 'other' && req.purposeOtherText
      ? `${purposeLabel}: ${req.purposeOtherText}`
      : purposeLabel
  const busy = updatingId === id

  return (
    <li className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-5 shadow-lg shadow-black/10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <span
          className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass[req.status]}`}
        >
          {statusLabel[req.status]}
        </span>
        <span className="text-xs text-slate-500">{formatSubmittedAt(req)}</span>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex gap-2 text-slate-200">
          <FileText size={16} className="shrink-0 text-slate-500 mt-0.5" aria-hidden />
          <div>
            <span className="text-slate-500 text-xs uppercase tracking-wide block mb-0.5">
              Purpose
            </span>
            {purposeDisplay}
          </div>
        </div>
        <div className="flex gap-2 text-slate-200">
          <MapPin size={16} className="shrink-0 text-slate-500 mt-0.5" aria-hidden />
          <div>
            <span className="text-slate-500 text-xs uppercase tracking-wide block mb-0.5">
              Location
            </span>
            {req.locationText}
          </div>
        </div>
        <div className="flex gap-2 text-slate-200">
          <Calendar size={16} className="shrink-0 text-slate-500 mt-0.5" aria-hidden />
          <div>
            <span className="text-slate-500 text-xs uppercase tracking-wide block mb-0.5">
              Incident date
            </span>
            {req.incidentDate}
          </div>
        </div>
        {req.notes ? (
          <div className="pt-2 border-t border-slate-700/50">
            <span className="text-slate-500 text-xs uppercase tracking-wide block mb-1">
              Notes
            </span>
            <p className="text-slate-300 whitespace-pre-wrap">{req.notes}</p>
          </div>
        ) : null}
        <p className="text-xs text-slate-600 pt-1">Requester ID: {req.userId}</p>
      </div>

      {showActions && onStatus ? (
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-700/50">
          <button
            type="button"
            disabled={busy || req.status === 'footage_found'}
            onClick={() => onStatus(id, 'footage_found')}
            className="rounded-lg bg-emerald-600/90 hover:bg-emerald-600 disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            Footage found
          </button>
          <button
            type="button"
            disabled={busy || req.status === 'footage_not_found'}
            onClick={() => onStatus(id, 'footage_not_found')}
            className="rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:pointer-events-none text-slate-100 text-sm font-medium px-4 py-2 border border-slate-600 transition-colors"
          >
            Footage not found
          </button>
        </div>
      ) : null}
    </li>
  )
}
