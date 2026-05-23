'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  subscribeToEmergencyReports,
  acknowledgeEmergencyAlert,
  applyEmergencyEscalationStep,
  isAlertAcknowledged,
  normalizePriority,
  comparePriority,
  getEscalationPhase,
  getNextEscalationLevel,
  requiresAcknowledgmentUI,
  type EmergencyReport,
  type EmergencyReportsSnapshotMeta,
  type IncidentPriority,
} from '@packages/firebase'
import { initAudioContext } from '@/utils/alarmSound'
import {
  playPriorityAlertForIncident,
  stopPriorityAlerts,
  stopPriorityAlertForIncident,
  getActiveLoopIncidentId,
  warmPriorityAudio,
} from '@/utils/priorityAlertSound'
import { useAuth } from './AuthContext'

type PriorityAlertContextType = {
  isAlarmMuted: boolean
  setIsAlarmMuted: (muted: boolean) => void
  /** Highest-priority unacknowledged incident currently shown in the alert modal. */
  pendingAlertReport: EmergencyReport | null
  /** @deprecated Use pendingAlertReport */
  criticalModalReport: EmergencyReport | null
  acknowledgeReport: (reportId: string, dispatcherName: string) => Promise<EmergencyReport>
  unacknowledgedAlertCount: number
  /** @deprecated Use unacknowledgedAlertCount */
  unacknowledgedCriticalCount: number
}

const PriorityAlertContext = createContext<PriorityAlertContextType | undefined>(undefined)

function getCreatedAtMs(report: EmergencyReport): number {
  const created = report.createdAt
  if (!created) return Date.now()
  if (created instanceof Date) return created.getTime()
  if (typeof created === 'object' && 'toDate' in created) {
    return (created as { toDate: () => Date }).toDate().getTime()
  }
  return Date.now()
}

function isActiveEmergency(report: EmergencyReport): boolean {
  return report.status !== 'done' && report.status !== 'resolved'
}

function reportPriority(report: EmergencyReport): IncidentPriority {
  return normalizePriority(report.priority ?? report.priorityLevel)
}

export function PriorityAlertProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [isAlarmMuted, setIsAlarmMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('resq-link-alarm-muted') === 'true'
    }
    return false
  })
  const [reports, setReports] = useState<EmergencyReport[]>([])
  const [pendingAlertReport, setPendingAlertReport] = useState<EmergencyReport | null>(null)

  const dismissedModalIdsRef = useRef<Set<string>>(new Set())
  const locallyAcknowledgedRef = useRef<Set<string>>(new Set())
  const listenerBaselineReadyRef = useRef(false)
  const previousIdsRef = useRef<Set<string>>(new Set())
  const playedOnceRef = useRef<Set<string>>(new Set())
  const escalationAppliedRef = useRef<Record<string, number>>({})
  const reportsRef = useRef<EmergencyReport[]>([])
  const isAlarmMutedRef = useRef(isAlarmMuted)
  const pendingAlertReportRef = useRef<EmergencyReport | null>(null)

  isAlarmMutedRef.current = isAlarmMuted
  pendingAlertReportRef.current = pendingAlertReport

  const isReportAcknowledged = useCallback((report: EmergencyReport): boolean => {
    if (report.id && locallyAcknowledgedRef.current.has(report.id)) {
      return true
    }
    return isAlertAcknowledged(report)
  }, [])

  const syncAcknowledgedFromServer = (active: EmergencyReport[]) => {
    for (const report of active) {
      if (!report.id) continue
      if (isAlertAcknowledged(report)) {
        locallyAcknowledgedRef.current.add(report.id)
        playedOnceRef.current.add(report.id)
      }
    }
  }

  const stopAlertsForAcknowledged = (active: EmergencyReport[]) => {
    const loopingId = getActiveLoopIncidentId()
    if (loopingId) {
      const loopingReport = active.find((r) => r.id === loopingId)
      if (
        !loopingReport ||
        locallyAcknowledgedRef.current.has(loopingId) ||
        isAlertAcknowledged(loopingReport)
      ) {
        stopPriorityAlertForIncident(loopingId)
      }
    }

    const hasUnacknowledged = active.some((r) => {
      if (!r.id || locallyAcknowledgedRef.current.has(r.id)) return false
      return !isAlertAcknowledged(r)
    })
    if (!hasUnacknowledged) {
      stopPriorityAlerts()
    }
  }

  const presentAlertModal = (report: EmergencyReport) => {
    if (!report.id || dismissedModalIdsRef.current.has(report.id)) return
    if (!requiresAcknowledgmentUI(reportPriority(report))) return

    const incomingPriority = reportPriority(report)
    const current = pendingAlertReportRef.current
    if (
      !current ||
      comparePriority(incomingPriority, reportPriority(current)) >= 0
    ) {
      pendingAlertReportRef.current = report
      setPendingAlertReport(report)
    }
  }

  /** Fire sound + modal directly from the Firestore listener (not from React effects). */
  const triggerAlertForReport = (report: EmergencyReport, options?: { intensified?: boolean }) => {
    if (!report.id || isAlarmMutedRef.current) return
    if (locallyAcknowledgedRef.current.has(report.id) || isAlertAcknowledged(report)) return

    const priority = reportPriority(report)
    void playPriorityAlertForIncident(report.id, priority, options)
    presentAlertModal(report)
  }

  const detectNewUnacknowledged = (
    active: EmergencyReport[],
    meta?: EmergencyReportsSnapshotMeta
  ): EmergencyReport[] => {
    const addedSet = new Set(meta?.addedIds ?? [])
    return active.filter((r) => {
      if (!r.id || locallyAcknowledgedRef.current.has(r.id) || isAlertAcknowledged(r)) {
        return false
      }
      if (addedSet.has(r.id)) return true
      return !previousIdsRef.current.has(r.id)
    })
  }

  const processNewAlerts = (newReports: EmergencyReport[]) => {
    const unplayed = newReports.filter((r) => r.id && !playedOnceRef.current.has(r.id))
    if (unplayed.length === 0) return

    const sorted = [...unplayed].sort((a, b) =>
      comparePriority(reportPriority(a), reportPriority(b))
    )
    const top = sorted[0]
    if (top?.id) {
      playedOnceRef.current.add(top.id)
      triggerAlertForReport(top)
    }

    sorted.slice(1).forEach((report) => {
      if (report.id) {
        playedOnceRef.current.add(report.id)
        presentAlertModal(report)
      }
    })
  }

  const processSnapshotRef = useRef<
    (incoming: EmergencyReport[], meta?: EmergencyReportsSnapshotMeta) => void
  >(() => {})

  processSnapshotRef.current = (incoming, meta) => {
    const active = incoming.filter(isActiveEmergency)
    reportsRef.current = active

    syncAcknowledgedFromServer(active)
    stopAlertsForAcknowledged(active)

    if (!listenerBaselineReadyRef.current) {
      previousIdsRef.current = new Set(
        active.map((r) => r.id).filter((id): id is string => Boolean(id))
      )
      listenerBaselineReadyRef.current = true
      setReports(active)
      return
    }

    if (!isAlarmMutedRef.current) {
      const newReports = detectNewUnacknowledged(active, meta)
      if (newReports.length > 0) {
        processNewAlerts(newReports)
      }

      if (meta?.modifiedIds?.length) {
        for (const id of meta.modifiedIds) {
          const updated = active.find((r) => r.id === id)
          if (
            updated &&
            (locallyAcknowledgedRef.current.has(id) || isAlertAcknowledged(updated))
          ) {
            stopPriorityAlertForIncident(id)
            if (pendingAlertReportRef.current?.id === id) {
              pendingAlertReportRef.current = null
              setPendingAlertReport(null)
            }
          }
        }
      }
    }

    previousIdsRef.current = new Set(
      active.map((r) => r.id).filter((id): id is string => Boolean(id))
    )
    setReports(active)
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('resq-link-alarm-muted', String(isAlarmMuted))
    }
    if (isAlarmMuted) {
      stopPriorityAlerts()
    }
  }, [isAlarmMuted])

  useEffect(() => {
    const initAudio = () => {
      const ctx = initAudioContext()
      if (ctx) void warmPriorityAudio()
    }
    const events = ['click', 'touchstart', 'keydown', 'mousedown']
    const handlers: Array<() => void> = []
    events.forEach((event) => {
      const handler = initAudio
      window.addEventListener(event, handler, { once: true, passive: true })
      handlers.push(() => window.removeEventListener(event, handler))
    })
    return () => handlers.forEach((cleanup) => cleanup())
  }, [])

  useEffect(() => {
    const uid = user?.uid
    if (!uid) {
      listenerBaselineReadyRef.current = false
      previousIdsRef.current.clear()
      locallyAcknowledgedRef.current.clear()
      playedOnceRef.current.clear()
      reportsRef.current = []
      stopPriorityAlerts()
      setPendingAlertReport(null)
      setReports([])
      return
    }

    void warmPriorityAudio()

    listenerBaselineReadyRef.current = false
    previousIdsRef.current.clear()

    const unsubscribe = subscribeToEmergencyReports(
      (incoming, meta) => processSnapshotRef.current(incoming, meta),
      { statusFilter: 'all', limitCount: 80 }
    )

    return () => unsubscribe()
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid || isAlarmMuted) return

    const tick = async () => {
      const active = reportsRef.current
      for (const report of active) {
        if (!report.id || locallyAcknowledgedRef.current.has(report.id)) continue
        if (isAlertAcknowledged(report)) continue
        const priority = reportPriority(report)
        if (priority !== 'critical' && priority !== 'high') continue

        const phase = getEscalationPhase(
          getCreatedAtMs(report),
          false,
          report.escalationLevel ?? 0
        )
        if (phase === 'none') continue

        const targetLevel = getNextEscalationLevel(report.escalationLevel ?? 0, phase)
        const lastApplied = escalationAppliedRef.current[report.id] ?? 0
        if (targetLevel <= lastApplied) continue

        try {
          const result = await applyEmergencyEscalationStep(report.id, targetLevel)
          if (result.applied) {
            escalationAppliedRef.current[report.id] = result.escalationLevel
            if (priority === 'critical' && getActiveLoopIncidentId() === report.id) {
              void playPriorityAlertForIncident(report.id, 'critical', { intensified: true })
            }
          }
        } catch (error) {
          console.warn('Escalation step failed:', error)
        }
      }
    }

    const interval = setInterval(() => {
      void tick()
    }, 10_000)

    return () => clearInterval(interval)
  }, [user?.uid, isAlarmMuted])

  const unacknowledgedAlertCount = useMemo(
    () => reports.filter((r) => !isReportAcknowledged(r)).length,
    [reports, isReportAcknowledged]
  )

  const acknowledgeReport = useCallback(
    async (reportId: string, dispatcherName: string) => {
      locallyAcknowledgedRef.current.add(reportId)
      playedOnceRef.current.add(reportId)
      dismissedModalIdsRef.current.add(reportId)
      stopPriorityAlertForIncident(reportId)
      stopPriorityAlerts()
      if (pendingAlertReportRef.current?.id === reportId) {
        pendingAlertReportRef.current = null
        setPendingAlertReport(null)
      }

      const updated = await acknowledgeEmergencyAlert(reportId, dispatcherName)
      return updated
    },
    []
  )

  const value = useMemo(
    () => ({
      isAlarmMuted,
      setIsAlarmMuted,
      pendingAlertReport,
      criticalModalReport: pendingAlertReport,
      acknowledgeReport,
      unacknowledgedAlertCount,
      unacknowledgedCriticalCount: unacknowledgedAlertCount,
    }),
    [
      isAlarmMuted,
      pendingAlertReport,
      acknowledgeReport,
      unacknowledgedAlertCount,
    ]
  )

  return (
    <PriorityAlertContext.Provider value={value}>{children}</PriorityAlertContext.Provider>
  )
}

export function usePriorityAlerts() {
  const context = useContext(PriorityAlertContext)
  if (!context) {
    throw new Error('usePriorityAlerts must be used within PriorityAlertProvider')
  }
  return context
}

/** @deprecated Use usePriorityAlerts — kept for AlarmControl compatibility */
export function useAlarm() {
  const ctx = usePriorityAlerts()
  return { isAlarmMuted: ctx.isAlarmMuted, setIsAlarmMuted: ctx.setIsAlarmMuted }
}
