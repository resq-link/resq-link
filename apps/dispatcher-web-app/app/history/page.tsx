'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import IncidentCard from '@/components/IncidentCard'
import StatusBadge from '@/components/StatusBadge'
import { subscribeToEmergencyReports, type EmergencyReport } from '@packages/firebase'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'

type HistoryIncident = {
  id: string
  type: string
  location: string
  priority: string
  status: EmergencyReport['status']
  reportedAt: Date
  resolvedAt: Date | null
  description: string
  responder: string | null
  duration: string | null
}

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

// Convert EmergencyReport to History Incident format
const convertToHistoryIncident = (report: EmergencyReport): HistoryIncident => {
  const reportedAt = report.createdAt instanceof Date 
    ? report.createdAt 
    : (report.createdAt && typeof report.createdAt === 'object' && 'toDate' in report.createdAt)
    ? (report.createdAt as any).toDate()
    : new Date(report.createdAt || Date.now())

  const resolvedAt = report.updatedAt instanceof Date 
    ? report.updatedAt 
    : (report.updatedAt && typeof report.updatedAt === 'object' && 'toDate' in report.updatedAt)
    ? (report.updatedAt as any).toDate()
    : null

  // Calculate duration in minutes
  let duration: string | null = null
  if (resolvedAt && reportedAt) {
    const durationMs = resolvedAt.getTime() - reportedAt.getTime()
    const durationMinutes = Math.round(durationMs / 60000)
    if (durationMinutes < 60) {
      duration = `${durationMinutes} minutes`
    } else {
      const hours = Math.floor(durationMinutes / 60)
      const minutes = durationMinutes % 60
      duration = minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hour${hours > 1 ? 's' : ''}`
    }
  }

  return {
    id: report.id || '',
    type: getIncidentTypeName(report.incidentType),
    location: report.locationText,
    priority: report.priority || 'medium',
    status: report.status === 'done' || report.status === 'resolved' ? 'resolved' : report.status,
    reportedAt,
    resolvedAt,
    description: report.description || 'No description provided',
    responder: report.responder || null,
    duration,
  }
}

export default function HistoryPage() {
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [history, setHistory] = useState<HistoryIncident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  // Subscribe to live data
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      router.push('/login')
      return
    }

    console.log('Setting up emergency reports subscription for history...')
    console.log('✅ User authenticated:', user.uid)
    
    // Subscribe to real-time emergency reports from Firestore
    const unsubscribe = subscribeToEmergencyReports(
      (reports: EmergencyReport[]) => {
        console.log('Received emergency reports for history:', reports.length)
        
        // Filter for resolved/done incidents only
        const resolvedReports = reports.filter(
          report => report.status === 'done' || report.status === 'resolved'
        )
        
        // Convert to history format
        const historyIncidents = resolvedReports.map(convertToHistoryIncident)
        
        // Sort by reportedAt descending (newest first)
        historyIncidents.sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime())
        
        setHistory(historyIncidents)
        setIsLoading(false)
      },
      {
        statusFilter: 'all', // Get all, we'll filter in the callback
        limitCount: 200, // Get more for history
      }
    )

    return () => {
      console.log('Unsubscribing from emergency reports')
      unsubscribe()
    }
  }, [user, router])

  const filteredHistory = history.filter((incident) => {
    const matchesFilter =
      selectedFilter === 'all' || incident.status === selectedFilter
    const matchesSearch =
      searchQuery === '' ||
      incident.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.location.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Calculate statistics
  const totalIncidents = history.length
  const resolvedToday = history.filter(
    (i) =>
      i.resolvedAt &&
      i.resolvedAt.getTime() > Date.now() - 24 * 60 * 60000
  ).length

  // Calculate average response time (time from reported to resolved)
  const incidentsWithDuration = history.filter(i => i.duration !== null)
  const avgResponseTime = incidentsWithDuration.length > 0
    ? (() => {
        const totalMinutes = incidentsWithDuration.reduce((sum, i) => {
          if (!i.resolvedAt || !i.reportedAt) return sum
          const durationMs = i.resolvedAt.getTime() - i.reportedAt.getTime()
          return sum + Math.round(durationMs / 60000)
        }, 0)
        const avgMinutes = Math.round(totalMinutes / incidentsWithDuration.length)
        if (avgMinutes < 60) {
          return `${avgMinutes} min`
        } else {
          const hours = Math.floor(avgMinutes / 60)
          const minutes = avgMinutes % 60
          return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
        }
      })()
    : 'N/A'

  return (
    <ProtectedRoute>
      <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Incident History
        </h1>
        <p className="text-slate-400">
          View past incidents and response records
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by type or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedFilter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedFilter('resolved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedFilter === 'resolved'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              Resolved
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-400">Total Incidents</p>
          <p className="text-3xl font-bold text-slate-100 mt-2">
            {isLoading ? '...' : totalIncidents}
          </p>
        </div>
        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-400">Resolved Today</p>
          <p className="text-3xl font-bold text-emerald-300 mt-2">
            {isLoading ? '...' : resolvedToday}
          </p>
        </div>
        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-400">Avg Response Time</p>
          <p className="text-3xl font-bold text-blue-300 mt-2">
            {isLoading ? '...' : avgResponseTime}
          </p>
        </div>
      </div>

      {/* History List */}
      <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
        <h2 className="text-2xl font-bold text-slate-100 mb-6">
          Past Incidents ({filteredHistory.length})
        </h2>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-slate-400 text-lg mt-4">Loading history...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((incident) => (
            <div
              key={incident.id}
              className="border border-slate-800 rounded-lg p-6 hover:shadow-md hover:shadow-black/30 transition-shadow bg-slate-950/60"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-slate-100">
                      {incident.type}
                    </h3>
                    <StatusBadge status={incident.status} />
                  </div>
                  <p className="text-slate-400 mb-2">{incident.description}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
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
                      {incident.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
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
                      {incident.reportedAt.toLocaleString()}
                    </span>
                    {incident.resolvedAt && (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
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
                        Resolved: {incident.resolvedAt.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Responder</p>
                  <p className="font-medium text-slate-100">
                    {incident.responder}
                  </p>
                  {incident.duration && (
                    <p className="text-sm text-slate-500 mt-1">
                      Duration: {incident.duration}
                    </p>
                  )}
                </div>
              </div>
            </div>
            ))}
          </div>
        )}

        {!isLoading && filteredHistory.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No incidents found</p>
            <p className="text-slate-500 text-sm mt-2">
              {history.length === 0 
                ? 'No resolved incidents in history yet'
                : 'Try adjusting your search or filter criteria'}
            </p>
          </div>
        )}
      </div>
    </div>
    </ProtectedRoute>
  )
}

