'use client'

import { usePriorityAlerts } from '@/contexts/PriorityAlertContext'
import PriorityBadge from '@/components/PriorityBadge'
import { useAuth } from '@/contexts/AuthContext'
import { PRIORITY_VISUAL, type IncidentPriority } from '@packages/firebase'
import { AlertTriangle, MapPin } from 'lucide-react'

const incidentTypeLabels: Record<string, string> = {
  fire: 'Fire Emergency',
  medical: 'Medical Emergency',
  vehicular_accident: 'Vehicular Accident',
  police_emergency: 'Police Emergency',
  electrical_powerline_hazard: 'Electrical / Powerline Hazard',
  other_emergency: 'Other Emergency',
}

const priorityCopy: Record<
  IncidentPriority,
  { title: string; subtitle: string; ackClass: string; panelClass: string; cardClass: string }
> = {
  critical: {
    title: 'Critical incident — immediate attention required',
    subtitle: 'Continuous siren until acknowledged',
    ackClass: 'bg-red-600 hover:bg-red-500',
    panelClass: 'border-red-500/30 bg-red-500/5',
    cardClass: 'priority-card-critical border-2 border-red-500 shadow-red-900/40',
  },
  high: {
    title: 'High-priority incident — respond now',
    subtitle: 'Repeating alert until acknowledged',
    ackClass: 'bg-orange-600 hover:bg-orange-500',
    panelClass: 'border-orange-500/30 bg-orange-500/5',
    cardClass: 'priority-card-high border-2 border-orange-500 shadow-orange-900/30',
  },
  medium: {
    title: 'Medium-priority incident — triage required',
    subtitle: 'Repeating double beep until acknowledged',
    ackClass: 'bg-yellow-600 hover:bg-yellow-500',
    panelClass: 'border-yellow-500/30 bg-yellow-500/5',
    cardClass: 'priority-card-medium border-2 border-yellow-500 shadow-yellow-900/20',
  },
  low: {
    title: 'Low-priority incident — review when available',
    subtitle: 'Repeating soft beep until acknowledged',
    ackClass: 'bg-emerald-600 hover:bg-emerald-500',
    panelClass: 'border-emerald-500/30 bg-emerald-500/5',
    cardClass: 'priority-card-low border border-emerald-500/60 shadow-emerald-900/10',
  },
}

export default function CriticalAlertModal() {
  const { pendingAlertReport, dismissAlertModal, acknowledgeReport } = usePriorityAlerts()
  const { user } = useAuth()

  if (!pendingAlertReport?.id) return null

  const dispatcherName = user?.displayName || user?.email || 'Dispatcher'
  const priority = (pendingAlertReport.priority ??
    pendingAlertReport.priorityLevel ??
    'medium') as IncidentPriority
  const copy = priorityCopy[priority] ?? priorityCopy.medium
  const visual = PRIORITY_VISUAL[priority]
  const isFullscreen = priority === 'critical' || priority === 'high'
  const backdropClass = isFullscreen ? 'bg-black/80' : 'bg-black/55'

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm ${backdropClass}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="priority-alert-title"
    >
      <div
        className={`w-full rounded-2xl bg-slate-950 p-6 shadow-2xl ${copy.cardClass} ${
          isFullscreen ? 'max-w-lg' : 'max-w-md'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className="rounded-full p-3"
            style={{ backgroundColor: `${visual.colorHex}22` }}
          >
            <AlertTriangle
              className="h-8 w-8"
              style={{ color: visual.colorHex }}
              aria-hidden
            />
          </div>
          <div className="flex-1">
            <p
              id="priority-alert-title"
              className="text-xs font-black uppercase tracking-[0.25em]"
              style={{ color: visual.colorHexLight }}
            >
              {copy.title}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
              {copy.subtitle}
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">
              {incidentTypeLabels[pendingAlertReport.incidentType] || 'Emergency'}
            </h2>
            <div className="mt-2">
              <PriorityBadge priority={priority} size="md" />
            </div>
          </div>
        </div>

        <div className={`mt-4 space-y-2 rounded-lg border p-4 ${copy.panelClass}`}>
          <p className="flex items-start gap-2 text-sm text-slate-200">
            <MapPin
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: visual.colorHex }}
            />
            {pendingAlertReport.locationText}
          </p>
          {pendingAlertReport.description ? (
            <p className="text-sm text-slate-400">{pendingAlertReport.description}</p>
          ) : null}
          {(pendingAlertReport.escalationLevel ?? 0) > 0 ? (
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Escalation level {pendingAlertReport.escalationLevel} — supervisor notified
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => acknowledgeReport(pendingAlertReport.id as string, dispatcherName)}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold uppercase tracking-wider text-white transition ${copy.ackClass}`}
          >
            Acknowledge Alert
          </button>
          <button
            type="button"
            onClick={dismissAlertModal}
            className="rounded-lg border border-slate-600 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            View later
          </button>
        </div>
      </div>
    </div>
  )
}
