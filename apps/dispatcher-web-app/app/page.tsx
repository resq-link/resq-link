'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import IncidentCard from '@/components/IncidentCard'
import StatusBadge from '@/components/StatusBadge'
import AlarmControl from '@/components/AlarmControl'
import { subscribeToEmergencyReports, type EmergencyReport } from '@packages/firebase'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import CommandBar from '@/components/CommandBar'
import { Activity, Bell, BellOff } from 'lucide-react'

// Map incident type to display name
const getIncidentTypeName = (incidentType: string): string => {
  const typeMap: Record<string, string> = {
    fire: 'Fire',
    medical: 'Medical Emergency',
    vehicular_accident: 'Vehicular Accident',
    police_emergency: 'Police Emergency',
    electrical_powerline_hazard: 'Electrical / Powerline Hazard',
    other_emergency: 'Other Emergency',
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
  const { user } = useAuth()
  const router = useRouter()

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
  }, [user, router])

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
      <div className="flex flex-col h-full">
        <CommandBar 
          pageName="Live Incidents" 
          description="Active emergency responses and high-priority signals"
          statsCategory="Incidents"
          stats={[
            { label: 'Pending', value: pendingCount, highlight: true },
            { label: 'En Route', value: enrouteCount },
            { label: 'On Scene', value: onSceneCount },
            { label: 'Completed', value: doneCount },
            { label: 'Total', value: incidents.length }
          ]}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="w-2 h-2 bg-secondary-400 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider">LIVE FEED</span>
            </div>
            <AlarmControl />
          </div>
        </CommandBar>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar no-scrollbar">


      {/* Live Incidents List */}
        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-100">
              Live Incidents
            </h2>
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
      </div>
    </ProtectedRoute>
  )
}

