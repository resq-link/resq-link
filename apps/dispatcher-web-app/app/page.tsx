'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import IncidentCard from '@/components/IncidentCard'
import StatusBadge from '@/components/StatusBadge'
import AlarmControl from '@/components/AlarmControl'
import { subscribeToEmergencyReports, type EmergencyReport } from '@packages/firebase'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { playAlarmSound, initAudioContext } from '@/utils/alarmSound'

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

  return (
    <ProtectedRoute>
      <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Live Incident Dashboard
        </h1>
        <p className="text-slate-400">
          Real-time monitoring of emergency incidents
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Total Incidents</p>
              <p className="text-3xl font-bold text-slate-100 mt-2">
                {incidents.length}
              </p>
            </div>
            <div className="bg-blue-500/10 rounded-full p-4 border border-blue-500/30">
              <svg
                className="w-8 h-8 text-blue-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Active Incidents</p>
              <p className="text-3xl font-bold text-red-300 mt-2">
                {activeCount}
              </p>
            </div>
            <div className="bg-red-500/10 rounded-full p-4 border border-red-500/30">
              <svg
                className="w-8 h-8 text-red-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Pending</p>
              <p className="text-3xl font-bold text-yellow-300 mt-2">
                {pendingCount}
              </p>
            </div>
            <div className="bg-yellow-500/10 rounded-full p-4 border border-yellow-500/30">
              <svg
                className="w-8 h-8 text-yellow-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">En Route</p>
              <p className="text-3xl font-bold text-blue-300 mt-2">
                {enrouteCount}
              </p>
            </div>
            <div className="bg-blue-500/10 rounded-full p-4 border border-blue-500/30">
              <svg
                className="w-8 h-8 text-blue-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">On Scene</p>
              <p className="text-3xl font-bold text-purple-300 mt-2">
                {onSceneCount}
              </p>
            </div>
            <div className="bg-purple-500/10 rounded-full p-4 border border-purple-500/30">
              <svg
                className="w-8 h-8 text-purple-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Done</p>
              <p className="text-3xl font-bold text-emerald-300 mt-2">
                {doneCount}
              </p>
            </div>
            <div className="bg-emerald-500/10 rounded-full p-4 border border-emerald-500/30">
              <svg
                className="w-8 h-8 text-emerald-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Live Incidents List */}
      <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-100">
            Live Incidents
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-secondary-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-400">Live</span>
            </div>
            <AlarmControl
              isMuted={isAlarmMuted}
              onToggle={() => setIsAlarmMuted(!isAlarmMuted)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-slate-400 text-lg mt-4">Loading incidents...</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {incidents.map((incident) => (
                <IncidentCard 
                  key={incident.id} 
                  incident={incident}
                  onUpdate={() => {
                    // The subscription will automatically update, but we can force a refresh if needed
                    console.log('Incident updated, subscription will refresh automatically')
                  }}
                />
              ))}
            </div>

            {incidents.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-slate-400 text-lg">No active incidents</p>
                <p className="text-slate-500 text-sm mt-2">
                  All clear - no emergencies reported
                </p>
                <p className="text-yellow-300 text-sm mt-4">
                  Tip: Check browser console for debugging information
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </ProtectedRoute>
  )
}

