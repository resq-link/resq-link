'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import IncidentCard from '@/components/IncidentCard'
import StatusBadge from '@/components/StatusBadge'
import { subscribeToEmergencyReports, type EmergencyReport } from '@packages/firebase'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'

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
  return {
    id: report.id || '',
    type: getIncidentTypeName(report.incidentType),
    location: report.locationText,
    priority: report.priority || 'medium',
    status: report.status === 'resolved' ? 'resolved' : (report.status === 'active' ? 'active' : 'pending') as 'active' | 'pending' | 'resolved',
    reportedAt: report.createdAt instanceof Date 
      ? report.createdAt 
      : (report.createdAt && typeof report.createdAt === 'object' && 'toDate' in report.createdAt)
      ? (report.createdAt as any).toDate()
      : new Date(report.createdAt || Date.now()),
    description: report.description || 'No description provided',
    responder: report.responder || null,
    dispatcherId: report.dispatcherId || null,
  }
}

export default function Home() {
  const [incidents, setIncidents] = useState<ReturnType<typeof convertToIncident>[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
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
        
        // Filter to show only active and pending incidents
        const activeReports = reports.filter(
          (r) => r.status === 'active' || r.status === 'pending'
        )
        
        console.log('Active/pending reports:', activeReports.length)
        
        // Convert to Incident format
        const convertedIncidents = activeReports.map(convertToIncident)
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
    // Update counts
    setActiveCount(incidents.filter(i => i.status === 'active').length)
    setPendingCount(incidents.filter(i => i.status === 'pending').length)
  }, [incidents])

  return (
    <ProtectedRoute>
      <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Live Incident Dashboard
        </h1>
        <p className="text-gray-600">
          Real-time monitoring of emergency incidents
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Incidents</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {incidents.length}
              </p>
            </div>
            <div className="bg-blue-100 rounded-full p-4">
              <svg
                className="w-8 h-8 text-blue-600"
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

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Incidents</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {activeCount}
              </p>
            </div>
            <div className="bg-red-100 rounded-full p-4">
              <svg
                className="w-8 h-8 text-red-600"
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

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Response</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {pendingCount}
              </p>
            </div>
            <div className="bg-yellow-100 rounded-full p-4">
              <svg
                className="w-8 h-8 text-yellow-600"
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
      </div>

      {/* Live Incidents List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Live Incidents
          </h2>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-gray-500 text-lg mt-4">Loading incidents...</p>
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
                <p className="text-gray-500 text-lg">No active incidents</p>
                <p className="text-gray-400 text-sm mt-2">
                  All clear - no emergencies reported
                </p>
                <p className="text-yellow-600 text-sm mt-4">
                  💡 Tip: Check browser console for debugging information
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

