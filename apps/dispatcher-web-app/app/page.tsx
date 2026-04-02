'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import IncidentCard from '@/components/IncidentCard'
import AlarmControl from '@/components/AlarmControl'
import { subscribeToEmergencyReports, type EmergencyReport } from '@packages/firebase'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { playAlarmSound, initAudioContext } from '@/utils/alarmSound'
import { Search, Siren } from 'lucide-react'

// Map incident type to display name
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

// Convert EmergencyReport to Incident format
const convertToIncident = (report: EmergencyReport) => {
  // Map status to new system, keeping legacy support
  let status: 'pending' | 'enroute' | 'on_scene' | 'done' | 'active' | 'resolved' = 'pending'
  if (['pending', 'enroute', 'on_scene', 'done'].includes(report.status)) {
    status = report.status as 'pending' | 'enroute' | 'on_scene' | 'done'
  } else if (report.status === 'active') {
    status = 'active' // Legacy support
  } else if (report.status === 'resolved') {
    status = 'resolved' // Legacy support, map to 'done' for new system
  }

  return {
    id: report.id || '',
    type: getIncidentTypeName(report.incidentType),
    location: report.locationText,
    priority: report.priority || 'medium',
    status,
    reportedAt: report.createdAt instanceof Date 
      ? report.createdAt 
      : (report.createdAt && typeof report.createdAt === 'object' && 'toDate' in report.createdAt)
      ? (report.createdAt as any).toDate()
      : new Date(report.createdAt || Date.now()),
    description: report.description || 'No description provided',
    responder: report.responder || null,
    dispatcherId: report.dispatcherId || null,
    imageUrl: report.imageUrl || null,
    latitude: report.latitude || null,
    longitude: report.longitude || null,
  }
}

export default function Home() {
  const [incidents, setIncidents] = useState<ReturnType<typeof convertToIncident>[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [enrouteCount, setEnrouteCount] = useState(0)
  const [onSceneCount, setOnSceneCount] = useState(0)
  const [doneCount, setDoneCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isAlarmMuted, setIsAlarmMuted] = useState(false)
  const [quickFilter, setQuickFilter] = useState<'all' | 'pending' | 'active' | 'enroute' | 'on_scene' | 'done'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const { user } = useAuth()
  const router = useRouter()
  
  // Track previous incident IDs to detect new ones
  const previousIncidentIdsRef = useRef<Set<string>>(new Set())
  const isInitialLoadRef = useRef(true)
  const audioInitializedRef = useRef(false)

  useEffect(() => {
    // Initialize audio context on first user interaction
    const initAudio = () => {
      if (!audioInitializedRef.current) {
        const ctx = initAudioContext()
        if (ctx) {
          console.log('✅ Audio context initialized')
          audioInitializedRef.current = true
        }
      }
    }
    
    // Initialize audio on any user interaction (required for browser autoplay policies)
    const events = ['click', 'touchstart', 'keydown', 'mousedown']
    const handlers: Array<() => void> = []
    
    events.forEach(event => {
      const handler = initAudio
      window.addEventListener(event, handler, { once: true, passive: true })
      handlers.push(() => window.removeEventListener(event, handler))
    })
    
    return () => {
      handlers.forEach(cleanup => cleanup())
    }
  }, [])

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      router.push('/login')
      return
    }

    console.log('Setting up emergency reports subscription...')
    console.log('✅ User authenticated:', user.uid)
    
    // Subscribe to real-time emergency reports from Firestore
    const unsubscribe = subscribeToEmergencyReports(
      (reports: EmergencyReport[]) => {
        console.log('Received emergency reports:', reports.length)
        
        // Debug: Check imageUrl in raw reports
        reports.forEach((report, index) => {
          if (report.imageUrl) {
            console.log(`Report ${index} (ID: ${report.id}) has imageUrl:`, report.imageUrl)
          } else {
            console.log(`Report ${index} (ID: ${report.id}) has NO imageUrl`)
          }
        })
        
        // Show all incidents including done/resolved
        const activeReports = reports
        
        console.log('Active/pending reports:', activeReports.length)
        
        // Convert to Incident format
        const convertedIncidents = activeReports.map(convertToIncident)
        
        // Debug: Log imageUrl in converted incidents
        convertedIncidents.forEach(inc => {
          console.log(`Incident ${inc.id} - imageUrl:`, inc.imageUrl || 'NO IMAGE URL')
        })
        
        // Detect new incidents by comparing IDs
        if (!isInitialLoadRef.current) {
          const currentIds = new Set(convertedIncidents.map(inc => inc.id))
          const previousIds = previousIncidentIdsRef.current
          
          // Find new incidents (in current but not in previous)
          // Only trigger alarm for new incidents that are not done/resolved
          const newIncidents = convertedIncidents.filter(
            inc => !previousIds.has(inc.id) && inc.status !== 'done' && inc.status !== 'resolved'
          )
          
          if (newIncidents.length > 0) {
            console.log(`🚨 New incident(s) detected: ${newIncidents.length}`)
            console.log('New incident IDs:', newIncidents.map(inc => inc.id))
            
            // Play alarm sound for new incidents (only non-done cases)
            if (!isAlarmMuted) {
              console.log('Playing alarm sound for new incidents...')
              playAlarmSound(false)
            } else {
              console.log('Alarm is muted, skipping sound')
            }
          }
        } else {
          // Mark initial load as complete after first data arrives
          isInitialLoadRef.current = false
        }
        
        // Update previous IDs for next comparison
        previousIncidentIdsRef.current = new Set(convertedIncidents.map(inc => inc.id))
        
        setIncidents(convertedIncidents)
        setIsLoading(false)
      },
      {
        statusFilter: 'all', // Get all, we'll filter in the callback
        limitCount: 100,
      }
    )

    return () => {
      console.log('Unsubscribing from emergency reports')
      unsubscribe()
    }
  }, [user, router, isAlarmMuted])

  useEffect(() => {
    // Update counts for all statuses
    setPendingCount(incidents.filter(i => i.status === 'pending').length)
    setEnrouteCount(incidents.filter(i => i.status === 'enroute').length)
    setOnSceneCount(incidents.filter(i => i.status === 'on_scene').length)
    setDoneCount(incidents.filter(i => i.status === 'done' || i.status === 'resolved').length)
    // Active count includes pending, enroute, on_scene, and legacy active
    setActiveCount(
      incidents.filter(i => 
        i.status === 'pending' || 
        i.status === 'enroute' || 
        i.status === 'on_scene' || 
        i.status === 'active'
      ).length
    )
  }, [incidents])

  const filteredIncidents = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase()
    return incidents
      .filter((incident) => {
        const normalizedStatus =
          incident.status === 'resolved' ? 'done' : incident.status === 'active' ? 'active' : incident.status
        const matchesQuickFilter =
          quickFilter === 'all' ||
          (quickFilter === 'done'
            ? normalizedStatus === 'done'
            : quickFilter === 'active'
              ? ['pending', 'enroute', 'on_scene', 'active'].includes(normalizedStatus)
              : normalizedStatus === quickFilter)
        const matchesPriority =
          priorityFilter === 'all' ||
          (priorityFilter === 'high'
            ? incident.priority === 'high' || incident.priority === 'critical'
            : incident.priority === priorityFilter)
        const matchesSearch =
          !needle ||
          incident.type.toLowerCase().includes(needle) ||
          incident.location.toLowerCase().includes(needle)
        return matchesQuickFilter && matchesPriority && matchesSearch
      })
      .sort((left, right) => {
        const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 }
        const leftUnassigned = left.dispatcherId ? 0 : 1
        const rightUnassigned = right.dispatcherId ? 0 : 1
        if (rightUnassigned !== leftUnassigned) return rightUnassigned - leftUnassigned
        if (priorityWeight[right.priority] !== priorityWeight[left.priority]) {
          return priorityWeight[right.priority] - priorityWeight[left.priority]
        }
        return right.reportedAt.getTime() - left.reportedAt.getTime()
      })
  }, [incidents, priorityFilter, quickFilter, searchTerm])

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/20 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 md:text-3xl">Live Incident Dashboard</h1>
              <p className="mt-1 text-sm text-slate-400">Real-time monitoring of emergency incidents</p>
            </div>
            <AlarmControl isMuted={isAlarmMuted} onToggle={() => setIsAlarmMuted(!isAlarmMuted)} />
          </div>
        </section>

        <section className="space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Total Incidents</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{incidents.length}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Active Incidents</p>
              <p className="mt-1 text-2xl font-semibold text-red-300">{activeCount}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-amber-200/90">Pending</p>
              <p className="mt-1 text-2xl font-semibold text-amber-200">{pendingCount}</p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-blue-200/90">En Route</p>
              <p className="mt-1 text-2xl font-semibold text-blue-200">{enrouteCount}</p>
            </div>
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-violet-200/90">On Scene</p>
              <p className="mt-1 text-2xl font-semibold text-violet-200">{onSceneCount}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-emerald-200/90">Done</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-200">{doneCount}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'active', label: 'Active' },
              { key: 'enroute', label: 'En Route' },
              { key: 'on_scene', label: 'On Scene' },
              { key: 'done', label: 'Done' },
            ].map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setQuickFilter(filter.key as typeof quickFilter)}
                className={`h-9 rounded-lg px-3 text-sm font-medium transition-colors ${
                  quickFilter === filter.key
                    ? 'bg-primary-600 text-white'
                    : 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by incident type or location"
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)}
              className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All priorities</option>
              <option value="high">High / Critical</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xl font-semibold text-slate-100">Live Incidents ({filteredIncidents.length})</h2>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-secondary-400" />
              Live
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
              <p className="mt-4 text-slate-400">Loading incidents...</p>
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300">
                <Siren size={20} />
              </div>
              <p className="text-lg font-medium text-slate-200">No active incidents</p>
              <p className="mt-2 text-sm text-slate-500">New emergency reports will appear here in real-time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  onUpdate={() => {
                    console.log('Incident updated, subscription will refresh automatically')
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </ProtectedRoute>
  )
}

