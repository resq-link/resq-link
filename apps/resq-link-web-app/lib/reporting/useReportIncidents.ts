'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  isReportEligibleIncident,
  subscribeToEmergencyReports,
  subscribeToIncidents,
  type EmergencyReport,
  type IncidentRecord,
} from '@packages/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { convertEmergencyReportToIncident } from './incidents'

const INCIDENT_LIMIT = 1000

function mergeReportIncidents(
  manualIncidents: IncidentRecord[],
  rawEmergencies: EmergencyReport[]
): IncidentRecord[] {
  const resolvedManual = manualIncidents.filter(isReportEligibleIncident)
  const manualIds = new Set(resolvedManual.map((incident) => incident.id))

  const fromApp = rawEmergencies
    .filter((report) => report.status === 'done' || report.status === 'resolved')
    .filter((report) => !report.incidentId || !manualIds.has(report.incidentId))
    .map(convertEmergencyReportToIncident)
    .filter(isReportEligibleIncident)
    .filter((incident) => !manualIds.has(incident.id))

  return [...resolvedManual, ...fromApp]
}

export function useReportIncidents() {
  const { user } = useAuth()
  const router = useRouter()
  const [manualIncidents, setManualIncidents] = useState<IncidentRecord[]>([])
  const [resolvedEmergencies, setResolvedEmergencies] = useState<EmergencyReport[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    setIsLoading(true)
    let loadedManual = false
    let loadedAppReports = false
    const markLoaded = () => {
      if (loadedManual && loadedAppReports) setIsLoading(false)
    }

    const unsubscribeIncidents = subscribeToIncidents(
      (items) => {
        setManualIncidents(items)
        loadedManual = true
        markLoaded()
      },
      INCIDENT_LIMIT,
      { includeAllCommandCenters: true }
    )

    const unsubscribeAppReports = subscribeToEmergencyReports(
      (reports) => {
        setResolvedEmergencies(reports)
        loadedAppReports = true
        markLoaded()
      },
      { statusFilter: 'resolved', limitCount: INCIDENT_LIMIT }
    )

    return () => {
      unsubscribeIncidents()
      unsubscribeAppReports()
    }
  }, [user, router])

  const incidents = useMemo(
    () => mergeReportIncidents(manualIncidents, resolvedEmergencies),
    [manualIncidents, resolvedEmergencies]
  )

  return { incidents, isLoading }
}
