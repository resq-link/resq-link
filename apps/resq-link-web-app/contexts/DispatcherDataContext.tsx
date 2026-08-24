'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  subscribeToDispatcherLocations,
  subscribeToEmergencyReports,
  subscribeToFootageRequests,
  subscribeToIncidentTypeRules,
  subscribeToIncidents,
  subscribeToResources,
  updateResource,
  type DispatcherLocation,
  type EmergencyReport,
  type EmergencyReportsSnapshotMeta,
  type FootageRequest,
  type IncidentRecord,
  type IncidentTypeRule,
  type ResourceRecord,
} from '@packages/firebase'
import { useAuth } from '@/contexts/AuthContext'

type DispatcherDataContextValue = {
  emergencyReports: EmergencyReport[]
  emergencyReportsMeta: EmergencyReportsSnapshotMeta | null
  emergencyReportsLoading: boolean
  incidents: IncidentRecord[]
  incidentsLoading: boolean
  resources: ResourceRecord[]
  resourcesLoading: boolean
  footageRequests: FootageRequest[]
  incidentTypeRules: IncidentTypeRule[]
  dispatcherLocations: DispatcherLocation[]
}

const DispatcherDataContext = createContext<DispatcherDataContextValue | null>(null)

const emptyMeta: EmergencyReportsSnapshotMeta = {
  addedIds: [],
  modifiedIds: [],
  removedIds: [],
  fromCache: false,
  hasPendingWrites: false,
}

function isValidDispatcherLocation(location: DispatcherLocation): boolean {
  return (
    location.latitude != null &&
    location.longitude != null &&
    location.latitude !== 0 &&
    location.longitude !== 0 &&
    !Number.isNaN(location.latitude) &&
    !Number.isNaN(location.longitude)
  )
}

export function DispatcherDataProvider({ children }: { children: ReactNode }) {
  const { user, workspace } = useAuth()
  const [emergencyReports, setEmergencyReports] = useState<EmergencyReport[]>([])
  const [emergencyReportsMeta, setEmergencyReportsMeta] = useState<EmergencyReportsSnapshotMeta | null>(null)
  const [emergencyReportsLoading, setEmergencyReportsLoading] = useState(true)
  const [incidents, setIncidents] = useState<IncidentRecord[]>([])
  const [incidentsLoading, setIncidentsLoading] = useState(true)
  const [resources, setResources] = useState<ResourceRecord[]>([])
  const [resourcesLoading, setResourcesLoading] = useState(true)
  const [footageRequests, setFootageRequests] = useState<FootageRequest[]>([])
  const [incidentTypeRules, setIncidentTypeRules] = useState<IncidentTypeRule[]>([])
  const [dispatcherLocations, setDispatcherLocations] = useState<DispatcherLocation[]>([])

  useEffect(() => {
    if (!user || workspace !== 'command_center') {
      setEmergencyReports([])
      setEmergencyReportsMeta(null)
      setEmergencyReportsLoading(false)
      setIncidents([])
      setIncidentsLoading(false)
      setResources([])
      setResourcesLoading(false)
      setFootageRequests([])
      setIncidentTypeRules([])
      setDispatcherLocations([])
      return
    }

    setEmergencyReportsLoading(true)
    setIncidentsLoading(true)
    setResourcesLoading(true)

    let reportsTimed = false
    let incidentsTimed = false
    let resourcesTimed = false
    if (process.env.NODE_ENV === 'development') {
      console.time('dispatcher-data:emergencyReports')
      console.time('dispatcher-data:incidents')
      console.time('dispatcher-data:resources')
      console.time('dispatcher-data:footageRequests')
      console.time('dispatcher-data:incidentTypeRules')
      console.time('dispatcher-data:dispatcherLocations')
    }

    const unsubscribeReports = subscribeToEmergencyReports(
      (reports, meta) => {
        if (process.env.NODE_ENV === 'development' && !reportsTimed) {
          reportsTimed = true
          console.timeEnd('dispatcher-data:emergencyReports')
        }
        setEmergencyReports(reports)
        setEmergencyReportsMeta(meta ?? emptyMeta)
        setEmergencyReportsLoading(false)
      },
      { statusFilter: 'all', limitCount: 200 }
    )

    const unsubscribeIncidents = subscribeToIncidents((items) => {
      if (process.env.NODE_ENV === 'development' && !incidentsTimed) {
        incidentsTimed = true
        console.timeEnd('dispatcher-data:incidents')
      }
      setIncidents(items)
      setIncidentsLoading(false)
    }, 200)

    const unsubscribeResources = subscribeToResources((nextResources) => {
      if (process.env.NODE_ENV === 'development' && !resourcesTimed) {
        resourcesTimed = true
        console.timeEnd('dispatcher-data:resources')
      }
      setResources(nextResources)
      setResourcesLoading(false)
    })

    let footageTimed = false
    let rulesTimed = false
    let locationsTimed = false
    const unsubscribeFootage = subscribeToFootageRequests((requests) => {
      if (process.env.NODE_ENV === 'development' && !footageTimed) {
        footageTimed = true
        console.timeEnd('dispatcher-data:footageRequests')
      }
      setFootageRequests(requests)
    })
    const unsubscribeRules = subscribeToIncidentTypeRules((rules) => {
      if (process.env.NODE_ENV === 'development' && !rulesTimed) {
        rulesTimed = true
        console.timeEnd('dispatcher-data:incidentTypeRules')
      }
      setIncidentTypeRules(rules)
    })
    const unsubscribeLocations = subscribeToDispatcherLocations((locations) => {
      if (process.env.NODE_ENV === 'development' && !locationsTimed) {
        locationsTimed = true
        console.timeEnd('dispatcher-data:dispatcherLocations')
      }
      setDispatcherLocations(locations.filter(isValidDispatcherLocation))
    })

    return () => {
      unsubscribeReports()
      unsubscribeIncidents()
      unsubscribeResources()
      unsubscribeFootage()
      unsubscribeRules()
      unsubscribeLocations()
    }
  }, [user, workspace])

  // Auto-heal / reconcile resources assigned to resolved/closed incidents
  useEffect(() => {
    if (!user || incidentsLoading || resourcesLoading || !resources.length || !incidents.length) {
      return
    }

    const incidentById = new Map(incidents.map((inc) => [inc.id, inc]))

    resources.forEach((resource) => {
      if (
        resource.id &&
        (resource.status === 'en_route' || resource.status === 'on_scene' || resource.status === 'assigned') &&
        resource.assignedIncidentId
      ) {
        const assignedInc = incidentById.get(resource.assignedIncidentId)
        if (
          assignedInc &&
          (assignedInc.status === 'resolved' ||
            assignedInc.resolutionStatus === 'resolved' ||
            Boolean(assignedInc.movedToHistoryAt))
        ) {
          updateResource(resource.id, {
            status: 'available',
            assignedIncidentId: null,
          }).catch((err) =>
            console.warn('[DispatcherDataContext] Failed to auto-reconcile resource:', err)
          )
        }
      }
    })
  }, [user, incidents, resources, incidentsLoading, resourcesLoading])

  const value = useMemo<DispatcherDataContextValue>(
    () => ({
      emergencyReports,
      emergencyReportsMeta,
      emergencyReportsLoading,
      incidents,
      incidentsLoading,
      resources,
      resourcesLoading,
      footageRequests,
      incidentTypeRules,
      dispatcherLocations,
    }),
    [
      emergencyReports,
      emergencyReportsMeta,
      emergencyReportsLoading,
      incidents,
      incidentsLoading,
      resources,
      resourcesLoading,
      footageRequests,
      incidentTypeRules,
      dispatcherLocations,
    ]
  )

  return (
    <DispatcherDataContext.Provider value={value}>{children}</DispatcherDataContext.Provider>
  )
}

export function useDispatcherData() {
  const context = useContext(DispatcherDataContext)
  if (!context) {
    throw new Error('useDispatcherData must be used within DispatcherDataProvider')
  }
  return context
}
