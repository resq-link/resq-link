'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import type { EmergencyReport } from '@packages/firebase'
import { useDispatcherData } from '@/contexts/DispatcherDataContext'
import IncidentMessagingDrawer from '@/components/messaging/IncidentMessagingDrawer'

type ChatToastItem = {
  id: string
  incidentId: string
  message: string
  location: string
  incidentTypeLabel: string
  referenceNumber: string
}

type OpenChatTarget = {
  incidentId: string
  referenceNumber: string
}

const TOAST_DURATION_MS = 5000

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  fire: 'Fire',
  medical: 'Medical',
  vehicular_accident: 'Vehicular Accident',
  police_emergency: 'Police',
  electrical_powerline_hazard: 'Electrical / Powerline',
  other_emergency: 'Other Emergency',
}

function lastChatAtMs(report: EmergencyReport): number | null {
  const value = report.lastChatAt
  if (!value) return null
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().getTime()
  }
  return null
}

/**
 * Bottom-right toast when a civilian sends a new incident chat message.
 * Uses denormalized `lastChat*` on emergencies (already live via DispatcherDataProvider).
 * Click opens the incident chat drawer from any command-center page.
 */
export default function IncidentChatToast() {
  const { emergencyReports, emergencyReportsMeta } = useDispatcherData()
  const [toasts, setToasts] = useState<ChatToastItem[]>([])
  const [openChat, setOpenChat] = useState<OpenChatTarget | null>(null)
  const baselineReadyRef = useRef(false)
  const lastSeenChatAtRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    const meta = emergencyReportsMeta
    if (!meta) return

    const seedSeen = () => {
      for (const report of emergencyReports) {
        if (!report.id) continue
        const ms = lastChatAtMs(report)
        if (ms != null) {
          lastSeenChatAtRef.current.set(report.id, ms)
        }
      }
    }

    // Skip toasts until the first server snapshot so we do not flood on login.
    if (!baselineReadyRef.current) {
      seedSeen()
      if (meta.fromCache) return
      baselineReadyRef.current = true
      return
    }

    const changedIds = new Set([...(meta.modifiedIds ?? []), ...(meta.addedIds ?? [])])
    if (changedIds.size === 0) return

    const byId = new Map(
      emergencyReports
        .filter((report): report is EmergencyReport & { id: string } => Boolean(report.id))
        .map((report) => [report.id, report])
    )

    for (const id of changedIds) {
      const report = byId.get(id)
      if (!report) continue

      const ms = lastChatAtMs(report)
      if (ms == null) continue

      const previousMs = lastSeenChatAtRef.current.get(id)
      if (previousMs != null && ms <= previousMs) continue
      lastSeenChatAtRef.current.set(id, ms)

      if (report.lastChatSenderRole !== 'civilian') continue

      const toastId = `${id}-${ms}`
      const message = (report.lastChatText || 'Sent a message').trim()
      const incidentTypeLabel =
        INCIDENT_TYPE_LABELS[report.incidentType] || report.incidentType || 'Incident'
      const nextToast: ChatToastItem = {
        id: toastId,
        incidentId: id,
        message,
        location: (report.locationText || '').trim(),
        incidentTypeLabel,
        referenceNumber: `${incidentTypeLabel} · ${id.slice(0, 8).toUpperCase()}`,
      }

      setToasts((current) =>
        [...current.filter((toast) => toast.incidentId !== id), nextToast].slice(-3)
      )

      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== toastId))
      }, TOAST_DURATION_MS)
    }
  }, [emergencyReports, emergencyReportsMeta])

  const dismiss = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  const openIncidentChat = (toast: ChatToastItem) => {
    setOpenChat({
      incidentId: toast.incidentId,
      referenceNumber: toast.referenceNumber,
    })
    dismiss(toast.id)
  }

  return (
    <>
      {toasts.length > 0 ? (
        <div
          className="pointer-events-none fixed bottom-28 right-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col-reverse gap-2"
          aria-live="polite"
          aria-relevant="additions"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="button"
              tabIndex={0}
              onClick={() => openIncidentChat(toast)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openIncidentChat(toast)
                }
              }}
              className="pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200 cursor-pointer rounded-xl border border-sky-500/40 bg-slate-900/95 px-3.5 py-3 text-sm shadow-xl backdrop-blur-md transition-colors hover:border-sky-400/60 hover:bg-slate-900"
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-950/70 text-sky-300">
                  <MessageCircle size={16} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                    New citizen message
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-100">
                    {toast.incidentTypeLabel}
                    {toast.location ? ` · ${toast.location}` : ''}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm leading-snug text-slate-300">
                    {toast.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    dismiss(toast.id)
                  }}
                  className="shrink-0 rounded p-0.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
                  aria-label="Dismiss"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <IncidentMessagingDrawer
        isOpen={Boolean(openChat)}
        onClose={() => setOpenChat(null)}
        incidentId={openChat?.incidentId || ''}
        referenceNumber={openChat?.referenceNumber || 'INCIDENT'}
        civilianName="Citizen"
      />
    </>
  )
}
