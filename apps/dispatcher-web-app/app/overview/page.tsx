'use client'

import { useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  subscribeToEmergencyReports,
  subscribeToDispatcherLocations,
  comparePriority,
  normalizePriority,
  applyEmergencyEscalationStep,
  updateEmergencyPriority,
  type EmergencyReport,
  type DispatcherLocation,
} from '@packages/firebase'
import CommandBar from '@/components/CommandBar'
import { Activity, ShieldCheck, Clock, Search, Filter } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false })

type MapIncident = {
  id: string
  type: string
  location: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'pending' | 'resolved'
  lat: number
  lng: number
  reportedAt: Date
  responder: string | null
  dispatcherId?: string | null
}

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

const convertToMapIncident = (report: EmergencyReport): MapIncident => {
  return {
    id: report.id || '',
    type: getIncidentTypeName(report.incidentType),
    location: report.locationText,
    priority: (report.priority || 'medium') as 'low' | 'medium' | 'high' | 'critical',
    status: (report.status === 'resolved' ? 'resolved' : (report.status === 'active' ? 'active' : 'pending')) as 'active' | 'pending' | 'resolved',
    lat: report.latitude || 0,
    lng: report.longitude || 0,
    reportedAt: report.createdAt instanceof Date
      ? report.createdAt
      : (report.createdAt && typeof report.createdAt === 'object' && 'toDate' in report.createdAt)
      ? (report.createdAt as any).toDate()
      : new Date(report.createdAt || Date.now()),
    responder: report.responder || null,
    dispatcherId: report.dispatcherId || null,
  }
}

const getLocationLabel = (locationText: string) => {
  if (!locationText) return 'Unknown'
  const parts = locationText.split(',')
  return parts[0].trim() || locationText
}

const AnalyticsCard = ({ title, badge, children }: { title: string, badge?: string, children: React.ReactNode }) => (
  <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl transition-all hover:bg-slate-900/70 hover:shadow-2xl hover:shadow-primary-900/10 group h-full">
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-400 transition-colors">
        {title}
      </h2>
      {badge && (
        <div className="px-2 py-0.5 rounded bg-slate-800 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
          {badge}
        </div>
      )}
    </div>
    <div className="flex-1 space-y-4">
      {children}
    </div>
  </div>
)

const StatBar = ({ label, count, percentage, color = 'bg-slate-600' }: { label: string, count: number, percentage: number, color?: string }) => (
  <div className="group/item border-b border-slate-800/30 last:border-0 pb-3 last:pb-0">
    <div className="flex items-center justify-between gap-4">
      <span className="text-[11px] font-medium text-slate-400 group-hover/item:text-slate-200 transition-colors truncate w-24 shrink-0 uppercase tracking-tighter">
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-slate-800/50 rounded-full overflow-hidden relative">
        <div 
          className={`absolute inset-y-0 left-0 rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-baseline gap-1.5 w-16 justify-end shrink-0">
        <span className="text-[11px] font-black text-slate-200 tabular-nums">{count}</span>
        <span className="text-[9px] font-bold text-slate-500 tabular-nums">({Math.round(percentage)}%)</span>
      </div>
    </div>
  </div>
)

export default function OverviewPage() {
  const [reports, setReports] = useState<EmergencyReport[]>([])
  const [dispatcherLocations, setDispatcherLocations] = useState<DispatcherLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reportFilter, setReportFilter] = useState<'all' | 'critical' | 'medical' | 'fire'>('all')
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null)
  const [timelineRange, setTimelineRange] = useState<'today' | 'week' | 'month' | 'year'>('today')
  const { user } = useAuth()
  const chartWidth = 640
  const chartHeight = 180
  const chartPadding = 24
  const seriesColors = ['#34d399', '#60a5fa', '#fbbf24']

  useEffect(() => {
    if (!user) return

    const unsubscribe = subscribeToDispatcherLocations(
      (locations: DispatcherLocation[]) => {
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
      }
    )

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    const unsubscribe = subscribeToEmergencyReports(
      (incomingReports: EmergencyReport[]) => {
        setReports(incomingReports)
        setIsLoading(false)
      },
      { statusFilter: 'all', limitCount: 200 }
    )

    return () => unsubscribe()
  }, [])

  const mapIncidents = useMemo(() => reports.map(convertToMapIncident), [reports])
  const incidentsWithCoords = useMemo(
    () => mapIncidents.filter((incident) => incident.lat && incident.lng && incident.lat !== 0 && incident.lng !== 0),
    [mapIncidents]
  )

  const totals = useMemo(() => {
    const total = reports.length
    const active = reports.filter((report) => report.status === 'active').length
    const pending = reports.filter((report) => report.status === 'pending').length
    const resolved = reports.filter((report) => report.status === 'resolved' || report.status === 'done').length
    return { total, active, pending, resolved }
  }, [reports])

  // Track previous totals for trend micro-context
  const [prevTotals, setPrevTotals] = useState(totals)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPrevTotals(totals)
    }, 30000) // Update trend baseline every 30s
    return () => clearTimeout(timer)
  }, [totals])

  const priorityMix = useMemo(() => {
    const buckets = { critical: 0, high: 0, medium: 0, low: 0 }
    reports.forEach((report) => {
      const key = (report.priority || 'medium') as keyof typeof buckets
      buckets[key] += 1
    })
    const total = Math.max(1, reports.length)
    return [
      { label: 'Critical', count: buckets.critical, percentage: (buckets.critical / total) * 100, color: 'bg-red-500' },
      { label: 'High', count: buckets.high, percentage: (buckets.high / total) * 100, color: 'bg-violet-500' },
      { label: 'Medium', count: buckets.medium, percentage: (buckets.medium / total) * 100, color: 'bg-amber-500' },
      { label: 'Low', count: buckets.low, percentage: (buckets.low / total) * 100, color: 'bg-emerald-500' },
    ]
  }, [reports])

  const locationMix = useMemo(() => {
    const counters: Record<string, number> = {}
    reports.forEach((report) => {
      const name = getLocationLabel(report.locationText || 'Unknown')
      counters[name] = (counters[name] || 0) + 1
    })
    const total = Math.max(1, reports.length)
    return Object.entries(counters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({
        label,
        count,
        percentage: (count / total) * 100
      }))
  }, [reports])

  const incidentTypeMix = useMemo(() => {
    const counters: Record<string, number> = {}
    reports.forEach((report) => {
      const name = getIncidentTypeName(report.incidentType)
      counters[name] = (counters[name] || 0) + 1
    })
    const total = Math.max(1, reports.length)
    return Object.entries(counters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({
        label,
        count,
        percentage: (count / total) * 100
      }))
  }, [reports])

  const statusMix = useMemo(() => {
    const total = Math.max(1, reports.length)
    return [
      { label: 'Pending', count: totals.pending, percentage: (totals.pending / total) * 100, color: 'bg-amber-500' },
      { label: 'Active', count: totals.active, percentage: (totals.active / total) * 100, color: 'bg-emerald-500' },
      { label: 'Resolved', count: totals.resolved, percentage: (totals.resolved / total) * 100, color: 'bg-blue-500' },
    ]
  }, [reports, totals])

  const recentIncidents = useMemo(() => {
    let filtered = [...mapIncidents]
    if (reportFilter === 'critical') filtered = filtered.filter(i => i.priority === 'critical')
    if (reportFilter === 'medical') filtered = filtered.filter(i => i.type.toLowerCase().includes('medical'))
    if (reportFilter === 'fire') filtered = filtered.filter(i => i.type.toLowerCase().includes('fire'))

    return filtered
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime())
  }, [mapIncidents, reportFilter])

  const handleAction = async (id: string, action: 'dispatch' | 'resolve' | 'escalate') => {
    setIsActionLoading(id)
    try {
      if (action === 'dispatch') {
        const { getFirebaseAuth, assignDispatcherToEmergency } = await import('@packages/firebase')
        const auth = getFirebaseAuth()
        if (auth.currentUser) {
          await assignDispatcherToEmergency(id, auth.currentUser.uid)
        }
      } else if (action === 'resolve') {
        const { moveEmergencyReportToHistory } = await import('@packages/firebase')
        await moveEmergencyReportToHistory(id)
      } else if (action === 'escalate') {
        await updateEmergencyPriority(id, 'critical')
        await applyEmergencyEscalationStep(id, 2)
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error)
    } finally {
      setIsActionLoading(null)
    }
  }

  const incidentTimeline = useMemo(() => {
    const now = new Date()
    let bucketCount = 12
    let bucketMinutes = 60
    let windowStart = new Date(now.getTime() - 12 * 60 * 60000) // Default 12h

    if (timelineRange === 'today') {
      bucketCount = 24
      bucketMinutes = 60
      windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (timelineRange === 'week') {
      bucketCount = 7
      bucketMinutes = 1440 // 1 day
      windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60000)
    } else if (timelineRange === 'month') {
      bucketCount = 30
      bucketMinutes = 1440 // 1 day
      windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60000)
    } else if (timelineRange === 'year') {
      bucketCount = 12
      bucketMinutes = 43200 // Approx 30 days
      windowStart = new Date(now.getFullYear(), 0, 1) // Start of year
    }

    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const date = new Date(windowStart.getTime() + index * bucketMinutes * 60000)
      let label = ''
      if (timelineRange === 'today') label = date.toLocaleTimeString([], { hour: '2-digit' })
      else if (timelineRange === 'year') label = date.toLocaleDateString([], { month: 'short' })
      else label = date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      
      return { index, label, date }
    })

    const locationCounts: Record<string, number> = {}
    reports.forEach((report) => {
      const label = getLocationLabel(report.locationText || 'Unknown')
      locationCounts[label] = (locationCounts[label] || 0) + 1
    })

    const topLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label]) => label)

    const locationSeries = topLocations.map((label) => ({
      label,
      values: Array(bucketCount).fill(0) as number[],
    }))

    reports.forEach((report) => {
      if (!report.createdAt) return
      const createdAt = report.createdAt instanceof Date
        ? report.createdAt
        : (report.createdAt && typeof report.createdAt === 'object' && 'toDate' in report.createdAt)
        ? (report.createdAt as any).toDate()
        : new Date(report.createdAt)
      if (createdAt < windowStart || createdAt > now) return

      const diffMinutes = Math.floor((createdAt.getTime() - windowStart.getTime()) / 60000)
      const bucketIndex = Math.min(bucketCount - 1, Math.max(0, Math.floor(diffMinutes / bucketMinutes)))
      const locationLabel = getLocationLabel(report.locationText || 'Unknown')
      const seriesIndex = topLocations.indexOf(locationLabel)
      if (seriesIndex !== -1) {
        locationSeries[seriesIndex].values[bucketIndex] += 1
      }
    })

    const maxValue = Math.max(1, ...locationSeries.flatMap((series) => series.values))

    return {
      buckets,
      series: locationSeries,
      maxValue,
    }
  }, [reports, timelineRange])

  const chartPoints = (values: number[]) => {
    if (values.length === 0) return ''
    const maxValue = incidentTimeline.maxValue
    return values
      .map((value, index) => {
        const x = chartPadding + (index / (values.length - 1)) * (chartWidth - chartPadding * 2)
        const y = chartHeight - chartPadding - (value / maxValue) * (chartHeight - chartPadding * 2)
        return `${x},${y}`
      })
      .join(' ')
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-full">
        <CommandBar 
          pageName="Overview" 
          description="Real-time operational picture and system metrics"
          statsCategory="Incidents"
          stats={[
            { label: 'Active', value: reports.filter(r => r.status === 'active').length, highlight: true },
            { label: 'Pending', value: reports.filter(r => r.status === 'pending').length },
            { label: 'Completed', value: reports.filter(r => r.status === 'resolved').length },
            { label: 'Total', value: reports.length }
          ]}
        >
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <Search size={16} />
            </button>
            <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
              <Filter size={16} />
            </button>
          </div>
        </CommandBar>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar no-scrollbar">

        <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
          {/* Main Map Area (75%ish) */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-0 overflow-hidden shadow-2xl shadow-black/40 relative">
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <div className="rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 p-3 shadow-xl">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <span className="flex h-1.5 w-1.5 items-center justify-center">
                      <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    </span>
                    Live
                  </h2>
                </div>
              </div>
              
              <div className="h-[520px] w-full">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center bg-slate-950 text-slate-400 italic">
                    Acquiring satellite data...
                  </div>
                ) : (
                  <MapComponent
                    incidents={incidentsWithCoords.filter((incident) => incident.status !== 'resolved')}
                    dispatcherLocations={dispatcherLocations}
                    selectedIncident={null}
                    onIncidentSelect={() => undefined}
                  />
                )}
              </div>
            </div>

            {/* Unified Analytics Grid */}
            <div className="grid gap-6 md:grid-cols-3">
              <AnalyticsCard title="Priority Mix" badge="Live Dist.">
                {priorityMix.map((item) => (
                  <StatBar 
                    key={item.label} 
                    label={item.label} 
                    count={item.count} 
                    percentage={item.percentage} 
                    color={item.color} 
                  />
                ))}
              </AnalyticsCard>

              <AnalyticsCard title="Incident Types" badge="Top 5">
                {incidentTypeMix.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-slate-600 italic">No historical data</div>
                ) : (
                  incidentTypeMix.map((item) => (
                    <StatBar 
                      key={item.label} 
                      label={item.label} 
                      count={item.count} 
                      percentage={item.percentage} 
                      color="bg-slate-500"
                    />
                  ))
                )}
              </AnalyticsCard>

              <AnalyticsCard title="Incidents by Location" badge="Geography">
                {locationMix.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-slate-600 italic">No spatial data</div>
                ) : (
                  locationMix.map((item) => (
                    <StatBar 
                      key={item.label} 
                      label={item.label} 
                      count={item.count} 
                      percentage={item.percentage} 
                      color="bg-primary-500/60"
                    />
                  ))
                )}
              </AnalyticsCard>
            </div>
          </div>

          {/* Right Sidebar - Latest Reports */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col h-full shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-100">Latest Reports</h2>
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 mb-4 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
                {(['all', 'critical', 'medical', 'fire'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setReportFilter(tab)}
                    className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
                      reportFilter === tab 
                        ? 'bg-slate-100 text-slate-950' 
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              
              <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {recentIncidents.slice(0, 5).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-600 text-center">
                    <p className="text-xs italic">No {reportFilter !== 'all' ? reportFilter : ''} signals matching filter...</p>
                  </div>
                ) : (
                  recentIncidents.slice(0, 5).map((incident) => {
                    const priorityColor = 
                      incident.priority === 'critical' ? 'bg-red-500' :
                      incident.priority === 'high' ? 'bg-violet-500' :
                      incident.priority === 'medium' ? 'bg-amber-500' :
                      'bg-emerald-500';

                    const isOperating = isActionLoading === incident.id;

                    return (
                      <div key={incident.id} className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-950/60 transition-all group">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityColor}`} />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-slate-100 leading-tight">{incident.type}</p>
                            <p className="mt-1 text-[10px] text-slate-500 line-clamp-1">{incident.location}</p>
                          </div>
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 whitespace-nowrap">
                            {incident.reportedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between">
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${
                            incident.status === 'active' ? 'text-emerald-400' : 
                            incident.status === 'pending' ? 'text-amber-400' : 'text-slate-500'
                          }`}>
                            {incident.status}
                          </span>
                          
                          <div className={`flex gap-1 transition-all duration-300 ${isOperating ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            {incident.status === 'pending' && (
                              <button 
                                disabled={isOperating}
                                onClick={() => handleAction(incident.id, 'dispatch')}
                                className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-[9px] text-emerald-400 font-bold transition-colors border border-emerald-500/30"
                              >
                                {isOperating ? '...' : 'DISPATCH'}
                              </button>
                            )}
                            {incident.status === 'active' && (
                              <button 
                                disabled={isOperating}
                                onClick={() => handleAction(incident.id, 'resolve')}
                                className="px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-[9px] text-blue-400 font-bold transition-colors border border-blue-500/30"
                              >
                                {isOperating ? '...' : 'RESOLVE'}
                              </button>
                            )}
                            {incident.priority !== 'critical' && (
                              <button 
                                disabled={isOperating}
                                onClick={() => handleAction(incident.id, 'escalate')}
                                className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-[9px] text-red-500 font-bold transition-colors border border-red-500/30"
                              >
                                ↑
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              
              <button className="mt-4 w-full py-2 rounded-lg border border-slate-800 bg-slate-900/50 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all">
                View All Activity
              </button>
            </div>

            {/* Quick Actions Panel */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">System Actions</h2>
              <div className="grid grid-cols-2 gap-2">
                <button className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group">
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-400">INTAKE</span>
                </button>
                <button className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all group">
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-400">SEARCH</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Timeline Chart */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl relative overflow-hidden group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
              <div className="flex flex-col">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-400 transition-colors">
                  Incidents Over Time
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  {(['today', 'week', 'month', 'year'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimelineRange(range)}
                      className={`text-[9px] font-black uppercase tracking-widest transition-all ${
                        timelineRange === range 
                          ? 'text-emerald-400 border-b border-emerald-400/50 pb-0.5' 
                          : 'text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {incidentTimeline.series.map((series, index) => (
                  <div key={series.label} className="flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                      style={{ backgroundColor: seriesColors[index % seriesColors.length] }}
                    />
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      {series.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative h-48 w-full">
              {incidentTimeline.series.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/20 text-[11px] text-slate-600 italic">
                  No longitudinal data available
                </div>
              ) : (
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="h-full w-full overflow-visible"
                  preserveAspectRatio="none"
                >
                {/* Y-Axis Grid Lines & Labels */}
                {Array.from({ length: 5 }).map((_, index) => {
                  const y = chartPadding + (index / 4) * (chartHeight - chartPadding * 2)
                  const labelValue = Math.round(incidentTimeline.maxValue - (index / 4) * incidentTimeline.maxValue)
                  
                  return (
                    <g key={`grid-${index}`}>
                      <line
                        x1={chartPadding}
                        x2={chartWidth - chartPadding}
                        y1={y}
                        y2={y}
                        stroke="#1e293b"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={chartPadding - 6}
                        y={y + 3}
                        textAnchor="end"
                        fill="#475569"
                        className="text-[8px] font-bold tabular-nums"
                      >
                        {labelValue}
                      </text>
                    </g>
                  )
                })}

                  {/* X-Axis Labels */}
                {incidentTimeline.buckets.map((bucket, index) => {
                  // Only show a subset of labels if there are too many to avoid crowding
                  const step = Math.ceil(incidentTimeline.buckets.length / 8);
                  if (index % step !== 0 && index !== incidentTimeline.buckets.length - 1) return null;

                  const x = chartPadding + (index / (incidentTimeline.buckets.length - 1)) * (chartWidth - chartPadding * 2)
                  return (
                    <text
                      key={`label-${index}`}
                      x={x}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      fill="#475569"
                      className="text-[9px] font-bold uppercase tracking-tighter"
                    >
                      {bucket.label}
                    </text>
                  )
                })}

                {/* Data Series */}
                  {incidentTimeline.series.map((series, index) => {
                    const points = chartPoints(series.values)
                    const color = seriesColors[index % seriesColors.length]
                    const fillPoints = `${points} ${chartWidth - chartPadding},${chartHeight - chartPadding} ${chartPadding},${chartHeight - chartPadding}`
                    
                    return (
                      <g key={series.label} className="transition-all duration-500 hover:opacity-100 opacity-70">
                        <path
                          d={`M ${fillPoints.split(' ').join(' L ')} Z`}
                          fill={color}
                          fillOpacity="0.04"
                          className="transition-all duration-300"
                        />
                        <polyline
                          fill="none"
                          stroke={color}
                          strokeWidth="3"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          points={points}
                          className="drop-shadow-[0_0_8px_rgba(0,0,0,0.4)]"
                        />
                      </g>
                    )
                  })}
                </svg>
              )}
            </div>
          </div>

          {/* Status Distribution Card */}
          <AnalyticsCard title="Operational Throughput" badge="By Status">
            <div className="flex flex-col h-full justify-between pb-2">
              <div className="space-y-6">
                {statusMix.map((item) => (
                  <StatBar 
                    key={item.label} 
                    label={item.label} 
                    count={item.count} 
                    percentage={item.percentage} 
                    color={item.color} 
                  />
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-slate-800/50">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-500 uppercase tracking-widest">Efficiency</span>
                  <span className="font-black text-emerald-400 tabular-nums">
                    {reports.length > 0 ? Math.round((totals.resolved / reports.length) * 100) : 0}%
                  </span>
                </div>
                <div className="mt-3 h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000"
                    style={{ width: `${reports.length > 0 ? (totals.resolved / reports.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </AnalyticsCard>
        </section>
        </div>
      </div>
    </ProtectedRoute>
  )
}
