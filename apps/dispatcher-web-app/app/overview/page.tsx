'use client'

import { useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import ProtectedRoute from '@/components/ProtectedRoute'
import { subscribeToEmergencyReports, type EmergencyReport } from '@packages/firebase'

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
  }
}

const getLocationLabel = (locationText: string) => {
  if (!locationText) return 'Unknown'
  const parts = locationText.split(',')
  return parts[0].trim() || locationText
}

export default function OverviewPage() {
  const [reports, setReports] = useState<EmergencyReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const chartWidth = 640
  const chartHeight = 180
  const chartPadding = 24
  const seriesColors = ['#34d399', '#60a5fa', '#fbbf24']

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

  const priorityMix = useMemo(() => {
    const buckets = { critical: 0, high: 0, medium: 0, low: 0 }
    reports.forEach((report) => {
      const key = (report.priority || 'medium') as keyof typeof buckets
      buckets[key] += 1
    })
    const total = Math.max(1, reports.length)
    return [
      { label: 'Critical', value: Math.round((buckets.critical / total) * 100), color: 'bg-red-400' },
      { label: 'High', value: Math.round((buckets.high / total) * 100), color: 'bg-orange-300' },
      { label: 'Medium', value: Math.round((buckets.medium / total) * 100), color: 'bg-yellow-300' },
      { label: 'Low', value: Math.round((buckets.low / total) * 100), color: 'bg-emerald-300' },
    ]
  }, [reports])

  const incidentTypeMix = useMemo(() => {
    const counters: Record<string, number> = {}
    reports.forEach((report) => {
      const name = getIncidentTypeName(report.incidentType)
      counters[name] = (counters[name] || 0) + 1
    })
    return Object.entries(counters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [reports])

  const recentIncidents = useMemo(() => {
    return [...mapIncidents]
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime())
      .slice(0, 20)
  }, [mapIncidents])

  const incidentTimeline = useMemo(() => {
    const bucketCount = 12
    const bucketMinutes = 60
    const now = new Date()
    const windowStart = new Date(now.getTime() - bucketCount * bucketMinutes * 60000)

    const buckets = Array.from({ length: bucketCount }, (_, index) => ({
      index,
      label: new Date(windowStart.getTime() + index * bucketMinutes * 60000),
    }))

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
  }, [reports])

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
      <div className="space-y-6">
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/30 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary-300">Overview</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">RESQ-Link Command Overview</h1>
            <p className="mt-2 text-sm text-slate-400">
              Live operational picture with real-time incident intelligence.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              System Online
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs text-slate-400">
              Live Data
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs text-slate-400">
              Total Feed: {totals.total}
            </span>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/20">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Total Incidents</p>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-semibold text-slate-100">{totals.total}</span>
              <span className="text-xs text-secondary-300">All reports</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/20">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Active Incidents</p>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-semibold text-emerald-200">{totals.active}</span>
              <span className="text-xs text-emerald-200">In response</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/20">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Pending</p>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-semibold text-yellow-200">{totals.pending}</span>
              <span className="text-xs text-yellow-200">Awaiting dispatch</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/20">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Resolved</p>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-semibold text-secondary-300">{totals.resolved}</span>
              <span className="text-xs text-secondary-300">Closed cases</span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_2fr_1.1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Priority Mix</h2>
              <span className="text-xs text-slate-400">Live distribution</span>
            </div>
            <div className="mt-6 space-y-4">
              {priorityMix.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>{item.label}</span>
                    <span className="text-slate-200">{item.value}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
              {incidentTypeMix.length === 0 ? (
                <p>No incidents recorded yet.</p>
              ) : (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Top Incident Types</p>
                  <div className="mt-3 space-y-2">
                    {incidentTypeMix.map(([label, count]) => (
                      <div key={label} className="flex items-center justify-between">
                        <span>{label}</span>
                        <span className="text-slate-100">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Live Incident Map</h2>
              <span className="text-xs text-slate-400">Active + pending</span>
            </div>
            <div className="mt-6 h-[410px] overflow-hidden rounded-2xl border border-slate-800">
              {isLoading ? (
                <div className="flex h-full items-center justify-center bg-slate-950 text-slate-400">
                  Loading map data...
                </div>
              ) : (
                <MapComponent
                  incidents={incidentsWithCoords.filter((incident) => incident.status !== 'resolved')}
                  selectedIncident={null}
                  onIncidentSelect={() => undefined}
                />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-100">Latest Reports</h2>
              <span className="text-xs text-slate-400">Newest first</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto pr-2 max-h-[410px]">
              {recentIncidents.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                  No reports yet.
                </div>
              ) : (
                recentIncidents.map((incident) => (
                  <div key={incident.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-100">{incident.type}</p>
                      <span className="text-xs text-slate-400">{incident.reportedAt.toLocaleTimeString()}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{incident.location}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span className="uppercase tracking-[0.2em] text-secondary-300">{incident.status}</span>
                      <span>{incident.priority}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Incidents Over Time by Location</h2>
            <span className="text-xs text-slate-400">Last 12 hours</span>
          </div>
          <div className="mt-6">
            {incidentTimeline.series.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">
                No incident data available for the timeline yet.
              </div>
            ) : (
              <div className="space-y-6">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="h-56 w-full"
                  preserveAspectRatio="none"
                >
                  <rect width={chartWidth} height={chartHeight} rx="18" fill="transparent" />
                  {Array.from({ length: 4 }).map((_, index) => {
                    const y = chartPadding + (index / 3) * (chartHeight - chartPadding * 2)
                    return (
                      <line
                        key={`grid-${index}`}
                        x1={chartPadding}
                        x2={chartWidth - chartPadding}
                        y1={y}
                        y2={y}
                        stroke="#1f2937"
                        strokeDasharray="4 6"
                      />
                    )
                  })}
                  {incidentTimeline.series.map((series, index) => (
                    <polyline
                      key={series.label}
                      fill="none"
                      stroke={seriesColors[index % seriesColors.length]}
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={chartPoints(series.values)}
                    />
                  ))}
                </svg>
                <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                  {incidentTimeline.series.map((series, index) => (
                    <div key={series.label} className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: seriesColors[index % seriesColors.length] }}
                      />
                      <span>{series.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </ProtectedRoute>
  )
}
