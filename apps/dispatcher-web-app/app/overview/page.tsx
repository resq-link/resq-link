'use client'

import { useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { subscribeToEmergencyReports, type EmergencyReport } from '@packages/firebase'

const TIME_ZONE = 'Asia/Manila'
const TIME_FORMATTER = new Intl.DateTimeFormat('en-PH', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
})

function formatTime(value: Date | null): string {
  if (!value) return '—'
  return TIME_FORMATTER.format(value)
}

const STATUS_BADGE_STYLES: Record<'active' | 'pending' | 'resolved', string> = {
  active: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  resolved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
}

const PRIORITY_BADGE_STYLES: Record<'low' | 'medium' | 'high' | 'critical', string> = {
  low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  medium: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200',
  high: 'border-orange-500/30 bg-orange-500/10 text-orange-200',
  critical: 'border-red-500/30 bg-red-500/10 text-red-200',
}

const SUMMARY_CARD_STYLES = {
  total: 'text-slate-100',
  active: 'text-blue-300',
  pending: 'text-yellow-200',
  resolved: 'text-emerald-300',
}

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
    crime: 'Crime',
    accident: 'Traffic Accident',
    flood: 'Flood',
    other: 'Other Emergency',
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
      : new Date(0),
    responder: report.responder || null,
  }
}

const getLocationLabel = (locationText: string) => {
  if (!locationText) return 'Unknown'
  const parts = locationText.split(',')
  return parts[0].trim() || locationText
}

export default function OverviewPage() {
  const router = useRouter()
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
  const activeAndPendingIncidents = useMemo(
    () => incidentsWithCoords.filter((incident) => incident.status !== 'resolved'),
    [incidentsWithCoords]
  )
  const handleMapIncidentSelect = useMemo(() => () => undefined, [])

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

  const topIncidentTypeMax = useMemo(
    () => Math.max(1, ...incidentTypeMix.map(([, count]) => count)),
    [incidentTypeMix]
  )

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
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/20 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary-300">Overview</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-100 md:text-3xl">RESQ-Link Command Overview</h1>
              <p className="mt-1 text-sm text-slate-400">Live operational picture with real-time incident intelligence.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                🟢 System Online
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
                Live Data
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
                Total Feed: {totals.total}
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 shadow-md shadow-black/20">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Incidents</p>
            <div className="mt-1 flex items-end justify-between">
              <span className={`text-2xl font-semibold ${SUMMARY_CARD_STYLES.total}`}>{totals.total}</span>
              <span className="text-xs text-slate-400">All reports</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 shadow-md shadow-black/20">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active Incidents</p>
            <div className="mt-1 flex items-end justify-between">
              <span className={`text-2xl font-semibold ${SUMMARY_CARD_STYLES.active}`}>{totals.active}</span>
              <span className="text-xs text-blue-300">In response</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 shadow-md shadow-black/20">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pending</p>
            <div className="mt-1 flex items-end justify-between">
              <span className={`text-2xl font-semibold ${SUMMARY_CARD_STYLES.pending}`}>{totals.pending}</span>
              <span className="text-xs text-yellow-200">Awaiting dispatch</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 shadow-md shadow-black/20">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resolved</p>
            <div className="mt-1 flex items-end justify-between">
              <span className={`text-2xl font-semibold ${SUMMARY_CARD_STYLES.resolved}`}>{totals.resolved}</span>
              <span className="text-xs text-emerald-300">Closed cases</span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_2.3fr_1fr]">
          <aside className="order-3 space-y-4 xl:order-1">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5">
              <h2 className="text-base font-semibold text-slate-100">Priority Mix</h2>
              <div className="mt-4 space-y-3">
                {priorityMix.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{item.label}</span>
                      <span className="text-slate-200">{item.value}%</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-slate-800">
                      <div className={`h-2 rounded-full ${item.color} transition-all duration-300`} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5">
              <h2 className="text-base font-semibold text-slate-100">Top Incident Types</h2>
              <div className="mt-4 space-y-3">
                {incidentTypeMix.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                    No incidents recorded yet.
                  </div>
                ) : (
                  incidentTypeMix.map(([label, count]) => {
                    const width = Math.max(12, Math.round((count / topIncidentTypeMax) * 100))
                    return (
                      <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{label}</span>
                          <span className="font-medium text-slate-100">{count}</span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                          <div className="h-1.5 rounded-full bg-blue-400/80" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </aside>

          <div className="order-1 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/20 md:p-5 xl:order-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100 md:text-lg">Live Incident Map</h2>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-300">
                Active + Pending
              </span>
            </div>
            <div className="mt-4 h-[420px] overflow-hidden rounded-xl border border-slate-800 md:h-[500px] xl:h-[560px]">
              {isLoading ? (
                <div className="flex h-full items-center justify-center bg-slate-950 text-slate-400">
                  Loading map data...
                </div>
              ) : (
                <MapComponent
                  incidents={activeAndPendingIncidents}
                  selectedIncident={null}
                  onIncidentSelect={handleMapIncidentSelect}
                />
              )}
            </div>
          </div>

          <aside className="order-2 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5 xl:order-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100 md:text-lg">Latest Reports</h2>
              <span className="text-xs text-slate-500">{recentIncidents.length} items</span>
            </div>
            <div className="max-h-[320px] flex-1 space-y-2 overflow-y-auto pr-1 md:max-h-[360px] xl:max-h-[560px]">
              {recentIncidents.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                  No reports yet.
                </div>
              ) : (
                recentIncidents.map((incident) => (
                  <button
                    key={incident.id}
                    type="button"
                    onClick={() => router.push('/')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left transition-all hover:border-slate-600 hover:bg-slate-900/80"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-100">{incident.type}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE_STYLES[incident.status]}`}>
                          {incident.status}
                        </span>
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_BADGE_STYLES[incident.priority]}`}>
                          {incident.priority}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      {formatTime(incident.reportedAt)} • {incident.location || 'Unknown location'}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100 md:text-lg">Incident Trends (Last 12 Hours)</h2>
            <span className="text-xs text-slate-400">By location</span>
          </div>
          <div className="mt-4">
            {incidentTimeline.series.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">
                No incident data available for the timeline yet.
              </div>
            ) : (
              <div className="space-y-6">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="h-52 w-full md:h-56"
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
