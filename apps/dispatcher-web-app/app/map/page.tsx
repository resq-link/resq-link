'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { subscribeToEmergencyReports, subscribeToDispatcherLocations, type EmergencyReport, type DispatcherLocation } from '@packages/firebase'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false })

const getIncidentTypeName = (incidentType: string): string => {
  const typeMap: Record<string, string> = {
    fire: 'Fire',
    medical: 'Medical Emergency',
    crime: 'Crime',
    accident: 'Traffic Accident',
    flood: 'Flood',
    other: 'Other Emergency',
  }
  return typeMap[incidentType] || 'Emergency'
}

const convertToMapIncident = (report: EmergencyReport) => ({
  id: report.id || '',
  type: getIncidentTypeName(report.incidentType),
  location: report.locationText,
  priority: (report.priority || 'medium') as 'low' | 'medium' | 'high' | 'critical',
  status: (report.status === 'resolved' ? 'resolved' : report.status === 'active' ? 'active' : 'pending') as 'active' | 'pending' | 'resolved',
  lat: report.latitude || 0,
  lng: report.longitude || 0,
  reportedAt:
    report.createdAt instanceof Date
      ? report.createdAt
      : report.createdAt && typeof report.createdAt === 'object' && 'toDate' in report.createdAt
        ? (report.createdAt as any).toDate()
        : new Date(report.createdAt || Date.now()),
  responder: report.responder || null,
})

type StatusFilter = 'all' | 'active' | 'pending'
type TypeFilter = 'all' | 'fire' | 'police' | 'mdrrmo' | 'medical' | 'coast_guard'

export default function MapPage() {
  const [incidents, setIncidents] = useState<ReturnType<typeof convertToMapIncident>[]>([])
  const [dispatcherLocations, setDispatcherLocations] = useState<DispatcherLocation[]>([])
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null)
  const [centerLocation, setCenterLocation] = useState<[number, number] | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  const matchesTypeFilter = (incident: ReturnType<typeof convertToMapIncident>) => {
    if (typeFilter === 'all') return true
    if (typeFilter === 'fire') return incident.type === 'Fire'
    if (typeFilter === 'police') return incident.type === 'Crime'
    if (typeFilter === 'mdrrmo') return incident.type === 'Flood'
    if (typeFilter === 'medical') return incident.type === 'Medical Emergency'
    return incident.type === 'Other Emergency'
  }

  const filteredIncidents = useMemo(
    () =>
      incidents.filter((incident) => {
        if (!incident.lat || !incident.lng || incident.lat === 0 || incident.lng === 0) return false
        if (statusFilter !== 'all' && incident.status !== statusFilter) return false
        return matchesTypeFilter(incident)
      }),
    [incidents, statusFilter, typeFilter]
  )

  const handleIncidentClick = (incidentId: string) => {
    setSelectedIncident(incidentId)
    const incident = filteredIncidents.find((inc) => inc.id === incidentId) || incidents.find((inc) => inc.id === incidentId)
    if (incident && incident.lat && incident.lng && incident.lat !== 0 && incident.lng !== 0) {
      setCenterLocation([incident.lat, incident.lng])
    }
  }

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    const unsubscribe = subscribeToEmergencyReports(
      (reports: EmergencyReport[]) => {
        setIncidents(reports.map(convertToMapIncident))
        setIsLoading(false)
      },
      { statusFilter: 'all', limitCount: 100 }
    )

    return () => unsubscribe()
  }, [user, router])

  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribeToDispatcherLocations((locations: DispatcherLocation[]) => {
      const validLocations = locations.filter(
        (loc) =>
          loc.latitude != null &&
          loc.longitude != null &&
          loc.latitude !== 0 &&
          loc.longitude !== 0 &&
          !isNaN(loc.latitude) &&
          !isNaN(loc.longitude)
      )
      setDispatcherLocations(validLocations)
    })

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    getCurrentLocation()
  }, [])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setIsLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation([latitude, longitude])
        setCenterLocation(null)
        setIsLocating(false)
      },
      (error) => {
        setIsLocating(false)
        if (error.code === error.PERMISSION_DENIED) setLocationError('Location access denied by user')
        else if (error.code === error.POSITION_UNAVAILABLE) setLocationError('Location information unavailable')
        else if (error.code === error.TIMEOUT) setLocationError('Location request timed out')
        else setLocationError('An unknown error occurred')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div>
                <h1 className="text-2xl font-semibold text-slate-100 md:text-3xl">Command Center Map</h1>
                <p className="mt-1 text-sm text-slate-400">Real-time view of incidents and dispatcher locations</p>
              </div>
              <div className="flex items-center gap-4 overflow-x-auto pb-1 text-xs text-slate-300">
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-semibold text-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {dispatcherLocations.length} dispatcher{dispatcherLocations.length !== 1 ? 's' : ''} online
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  Fire
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  Police
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  MDRRMO
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Medical
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-300" />
                  Coast Guard
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <p className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-400">Status</p>
              {[
                { key: 'all', label: 'All' },
                { key: 'active', label: 'Active' },
                { key: 'pending', label: 'Pending' },
              ].map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setStatusFilter(chip.key as StatusFilter)}
                  className={`h-8 rounded-full border px-3.5 text-sm font-medium transition-all duration-200 ${
                    statusFilter === chip.key
                      ? 'border-primary-400/60 bg-primary-600 text-white shadow-sm shadow-primary-900/30'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/70 shadow-md shadow-black/20">
          <div className="flex flex-col gap-2 border-b border-slate-800 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-100">Live Map</h2>
              <p className="text-xs text-slate-400">Incidents and dispatcher positions</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-300">
                {statusFilter.toUpperCase()} {typeFilter !== 'all' ? `• ${typeFilter.replace('_', ' ').toUpperCase()}` : ''}
              </span>
              <button
                onClick={getCurrentLocation}
                disabled={isLocating}
                className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLocating ? 'Locating...' : 'My Location'}
              </button>
            </div>
          </div>
          <div className="relative h-[600px] w-full md:h-[680px] xl:h-[720px]">
            {isLoading ? (
              <div className="flex h-full w-full items-center justify-center bg-slate-950">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
                  <p className="mt-4 text-slate-400">Loading incidents...</p>
                </div>
              </div>
            ) : (
              <MapComponent
                incidents={filteredIncidents}
                dispatcherLocations={dispatcherLocations}
                selectedIncident={selectedIncident}
                onIncidentSelect={handleIncidentClick}
                userLocation={userLocation}
                centerLocation={centerLocation}
              />
            )}
            {locationError && (
              <div className="absolute bottom-3 right-3 z-[1000] max-w-xs rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                {locationError}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/20">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">Incidents on Map</h2>
            <span className="text-xs text-slate-400">({filteredIncidents.length})</span>
          </div>
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
              <p className="mt-4 text-sm text-slate-400">Loading incidents...</p>
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/40 px-4 py-10 text-center">
              <p className="text-sm font-semibold text-slate-200">No incidents on the map</p>
              <p className="mt-1 text-xs text-slate-500">Try changing the selected filters.</p>
            </div>
          ) : (
            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {filteredIncidents.map((incident) => (
                <button
                  key={incident.id}
                  type="button"
                  onClick={() => handleIncidentClick(incident.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-all ${
                    selectedIncident === incident.id
                      ? 'border-primary-500 bg-primary-500/10 shadow-md shadow-black/30'
                      : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">{incident.type}</p>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        incident.priority === 'critical'
                          ? 'border border-red-500/30 bg-red-500/15 text-red-300'
                          : incident.priority === 'high'
                            ? 'border border-orange-500/30 bg-orange-500/15 text-orange-300'
                            : incident.priority === 'medium'
                              ? 'border border-blue-500/30 bg-blue-500/15 text-blue-300'
                              : 'border border-slate-600 bg-slate-800/80 text-slate-300'
                      }`}
                    >
                      {incident.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{incident.location}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{incident.reportedAt.toLocaleTimeString()}</span>
                    <span
                      className={`inline-flex h-2.5 w-2.5 rounded-full ${
                        incident.status === 'active' ? 'bg-red-500' : incident.status === 'pending' ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </ProtectedRoute>
  )
}

