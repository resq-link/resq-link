'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

// Convert EmergencyReport to History Incident format
const convertToHistoryIncident = (report: EmergencyReport) => {
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

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
    .format(date)
    .replace(', ', ' • ')

const formatDurationFromDates = (start: Date, end: Date): string => {
  const totalMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    if (hours > 0) return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`
    return `${days} day${days > 1 ? 's' : ''}`
  }
  if (hours > 0) {
    if (minutes > 0) return `${hours}h ${minutes}m`
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }
  return `${minutes} min`
}

const getPriorityBadgeClass = (priority: string) => {
  const normalized = priority.toLowerCase()
  if (normalized === 'high' || normalized === 'critical') return 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
  if (normalized === 'medium') return 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
  return 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
}

export default function HistoryPage() {
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [history, setHistory] = useState<ReturnType<typeof convertToHistoryIncident>[]>([])
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
      <div className="space-y-4">
        {/* Header Section */}
        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 px-5 py-4">
          <h1 className="text-3xl font-bold text-slate-100 mb-1">Incident History</h1>
          <p className="text-slate-400">View past incidents and response records</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by type or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full px-3 border border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`h-10 px-4 rounded-lg text-sm font-medium transition-colors ${
                  selectedFilter === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedFilter('resolved')}
                className={`h-10 px-4 rounded-lg text-sm font-medium transition-colors ${
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 px-4 py-3 min-h-[98px]">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total Incidents</p>
            <p className="text-3xl font-bold text-slate-100 mt-1">{isLoading ? '...' : totalIncidents}</p>
          </div>
          <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 px-4 py-3 min-h-[98px]">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Resolved Today</p>
            <p className="text-3xl font-bold text-emerald-300 mt-1">{isLoading ? '...' : resolvedToday}</p>
          </div>
          <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 px-4 py-3 min-h-[98px]">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Avg Response Time</p>
            <p className="text-3xl font-bold text-blue-300 mt-1">{isLoading ? '...' : avgResponseTime}</p>
          </div>
        </div>

        {/* History List */}
        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-4">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Past Incidents ({filteredHistory.length})</h2>

          {isLoading ? (
            <div className="space-y-3 py-1">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 animate-pulse"
                >
                  <div className="h-5 w-2/5 rounded bg-slate-800 mb-3" />
                  <div className="h-4 w-full rounded bg-slate-800/80 mb-2" />
                  <div className="h-4 w-4/5 rounded bg-slate-800/80 mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="h-3 w-3/4 rounded bg-slate-800/70" />
                    <div className="h-3 w-2/3 rounded bg-slate-800/70" />
                    <div className="h-3 w-1/2 rounded bg-slate-800/70" />
                    <div className="h-3 w-1/3 rounded bg-slate-800/70" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((incident) => (
                <div
                  key={incident.id}
                  className="border border-slate-800 rounded-lg p-4 bg-slate-950/60 shadow-sm shadow-black/20 transition-all duration-200 hover:border-slate-700 hover:shadow-md hover:shadow-black/30"
                >
                  {/* Top Section */}
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-100">{incident.type}</h3>
                        <StatusBadge status={incident.status} />
                        {incident.priority && (
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${getPriorityBadgeClass(
                              incident.priority
                            )}`}
                          >
                            {incident.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    {incident.resolvedAt && (
                      <span className="text-xs text-slate-400 bg-slate-900/80 border border-slate-800 rounded-md px-2 py-1">
                        Duration: {formatDurationFromDates(incident.reportedAt, incident.resolvedAt)}
                      </span>
                    )}
                  </div>

                  <div className="border-t border-slate-800 my-3" />

                  {/* Middle Section */}
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300 leading-relaxed">{incident.description}</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-sm text-slate-400">
                      <span className="flex items-center gap-2 min-w-0">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <span className="truncate">{incident.location}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>Reported: {formatDateTime(incident.reportedAt)}</span>
                      </span>
                      {incident.resolvedAt && (
                        <span className="flex items-center gap-2 lg:col-span-2">
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>Resolved: {formatDateTime(incident.resolvedAt)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-800 my-3" />

                  {/* Bottom Section */}
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">Responder</p>
                      <p className="font-medium text-slate-100">{incident.responder || 'Unassigned'}</p>
                    </div>
                    {incident.resolvedAt && (
                      <p className="text-slate-300">
                        <span className="text-slate-500 mr-1">Duration</span>
                        <span className="font-semibold text-blue-300">
                          {formatDurationFromDates(incident.reportedAt, incident.resolvedAt)}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && filteredHistory.length === 0 && (
            <div className="text-center py-10 px-4 border border-dashed border-slate-800 rounded-lg bg-slate-950/40">
              <div className="mx-auto mb-3 w-10 h-10 rounded-full border border-slate-700 bg-slate-900/80 flex items-center justify-center text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-slate-300 text-lg font-semibold">No incident history available</p>
              <p className="text-slate-500 text-sm mt-2">
                {history.length === 0
                  ? 'Resolved incidents will appear here once available.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

