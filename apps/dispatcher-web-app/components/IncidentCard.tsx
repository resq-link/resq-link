'use client'

import { useState } from 'react'
import StatusBadge from './StatusBadge'
import AssignDispatcherModal from './AssignDispatcherModal'
import IncidentDetailsModal from './IncidentDetailsModal'
import { Clock3, MapPin } from 'lucide-react'

interface Incident {
  id: string
  type: string
  location: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'enroute' | 'on_scene' | 'done' | 'active' | 'resolved' // Support both new and legacy statuses
  reportedAt: Date
  description: string
  responder: string | null
  dispatcherId?: string | null
  imageUrl?: string | null
  latitude?: number | null
  longitude?: number | null
}

interface IncidentCardProps {
  incident: Incident
  onUpdate?: () => void
}

export default function IncidentCard({ incident, onUpdate }: IncidentCardProps) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500/10 text-red-200 border-red-500/30'
      case 'high':
        return 'bg-orange-500/10 text-orange-200 border-orange-500/30'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-200 border-yellow-500/30'
      case 'low':
        return 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
      default:
        return 'bg-slate-800 text-slate-200 border-slate-700'
    }
  }

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  const formatReportedTime = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
      .format(date)
      .replace(', ', ' • ')

  const getStatusShort = (status: Incident['status']) => {
    if (status === 'enroute') return 'En Route'
    if (status === 'on_scene') return 'On Scene'
    if (status === 'done' || status === 'resolved') return 'Done'
    return 'Pending'
  }

  const urgencyClass =
    incident.priority === 'critical' || incident.priority === 'high'
      ? 'border-red-500/40 shadow-[0_0_0_1px_rgba(239,68,68,0.15)]'
      : 'border-slate-800'

  return (
    <article
      className={`rounded-xl border bg-slate-900/70 p-4 shadow-black/20 transition-all hover:-translate-y-0.5 hover:shadow-lg ${urgencyClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-slate-100">{incident.type}</h3>
            <StatusBadge status={incident.status} />
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getPriorityColor(incident.priority)}`}
            >
              {incident.priority.toUpperCase()}
            </span>
            {!incident.dispatcherId && (
              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-200">
                Needs Assignment
              </span>
            )}
          </div>

          <p className="line-clamp-2 text-sm text-slate-300">{incident.description}</p>
          <div className="mt-2 space-y-1 text-sm text-slate-400">
            <p className="flex items-center gap-1.5">
              <MapPin size={14} className="shrink-0" />
              <span className="truncate">{incident.location}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Clock3 size={14} className="shrink-0" />
              <span>
                {formatReportedTime(incident.reportedAt)} <span className="text-slate-500">({getTimeAgo(incident.reportedAt)})</span>
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
        <p className="text-sm text-slate-300">
          {incident.dispatcherId ? (
            <>
              <span className="text-slate-400">Dispatcher:</span> Assigned <span className="text-slate-500">({getStatusShort(incident.status)})</span>
            </>
          ) : (
            <>
              <span className="text-rose-300">Unassigned</span> <span className="text-slate-500">- needs dispatcher</span>
            </>
          )}
        </p>
        <div className="hidden items-center gap-1 sm:flex">
          {['Pending', 'En Route', 'On Scene', 'Done'].map((step, index) => (
            <span
              key={step}
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                (incident.status === 'pending' || incident.status === 'active') && index === 0
                  ? 'bg-amber-500/20 text-amber-200'
                  : incident.status === 'enroute' && index === 1
                    ? 'bg-blue-500/20 text-blue-200'
                    : incident.status === 'on_scene' && index === 2
                      ? 'bg-violet-500/20 text-violet-200'
                      : (incident.status === 'done' || incident.status === 'resolved') && index === 3
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : 'bg-slate-800 text-slate-500'
              }`}
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-2 border-t border-slate-800 pt-3">
        <button
          onClick={() => setIsDetailsModalOpen(true)}
          className="h-9 rounded-lg bg-primary-600 px-3 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          View Details
        </button>
        <button
          onClick={() => setIsAssignModalOpen(true)}
          className="h-9 rounded-lg bg-slate-800 px-3 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
        >
          {incident.dispatcherId ? 'Change Dispatcher' : 'Assign Dispatcher'}
        </button>
      </div>

      <IncidentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        incident={incident}
      />

      <AssignDispatcherModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        incidentId={incident.id}
        currentDispatcherId={incident.dispatcherId || null}
        onAssignSuccess={() => {
          setIsAssignModalOpen(false)
          onUpdate?.()
        }}
      />
    </article>
  )
}

