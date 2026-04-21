'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  PieChart,
  ShieldAlert,
  Users,
} from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'
import StatusBadge from '@/components/StatusBadge'
import CommandBar from '@/components/CommandBar'
import { useAuth } from '@/contexts/AuthContext'
import {
  subscribeToEmergencyReports,
  subscribeToIncidents,
  type EmergencyReport,
  type IncidentCategory,
  type IncidentPriority,
  type IncidentRecord,
  type IncidentStatus,
  type TeamOnDuty,
} from '@packages/firebase'

type DatePreset = '7d' | '30d' | '90d' | 'year' | 'all' | 'custom'

type ChartPoint = {
  label: string
  dateKey: string
  count: number
}

type BreakdownItem = {
  label: string
  value: number
}

const teams: TeamOnDuty[] = ['Whiskey', 'X-ray', 'Yankee', 'Zulu']

const categoryLabels: Record<IncidentCategory, string> = {
  fire: 'Fire',
  peace_and_order: 'Peace and Order',
  medical: 'Medical',
  vehicular: 'Vehicular',
  utility: 'Utility',
  community: 'Community',
  other: 'Other',
}

const priorityLabels: Record<IncidentPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

const statusLabels: Partial<Record<IncidentStatus, string>> = {
  new: 'New',
  awaiting_resources: 'Awaiting Resources',
  liaison_pending: 'Liaison Pending',
  dispatched: 'Dispatched',
  enroute: 'En Route',
  on_scene: 'On Scene',
  resolved: 'Resolved',
  unresolved: 'Unresolved',
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateInput(value: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function getTimestamp(value: IncidentRecord['createdAt'] | IncidentRecord['resolvedAt']): number {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'object' && 'toDate' in value) return value.toDate().getTime()
  return 0
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate()
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

function getIncidentDate(incident: IncidentRecord): Date | null {
  const fromIncidentDate = parseDateInput(incident.incidentDate ?? '')
  if (fromIncidentDate) return fromIncidentDate

  const createdAt = getTimestamp(incident.createdAt)
  return createdAt ? new Date(createdAt) : null
}

function formatReadableDate(value: string): string {
  const date = parseDateInput(value)
  if (!date) return value || 'No date'
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatIncidentDateTime(incident: IncidentRecord): string {
  const date = incident.incidentDate ?? incident.dateOfDuty ?? ''
  const time = incident.incidentTime ?? ''
  if (!date) return 'No date recorded'
  return time ? `${formatReadableDate(date)} at ${time}` : formatReadableDate(date)
}

function getEmergencyIncidentCategory(type: EmergencyReport['incidentType']): IncidentCategory {
  switch (type) {
    case 'fire':
      return 'fire'
    case 'medical':
      return 'medical'
    case 'vehicular_accident':
      return 'vehicular'
    case 'police_emergency':
      return 'peace_and_order'
    case 'electrical_powerline_hazard':
      return 'utility'
    case 'other_emergency':
    default:
      return 'other'
  }
}

function getEmergencyIncidentLabel(type: EmergencyReport['incidentType']): string {
  switch (type) {
    case 'fire':
      return 'Fire'
    case 'medical':
      return 'Medical Emergency'
    case 'vehicular_accident':
      return 'Vehicular Accident'
    case 'police_emergency':
      return 'Police Emergency'
    case 'electrical_powerline_hazard':
      return 'Electrical / Powerline Hazard'
    case 'other_emergency':
    default:
      return 'Other Emergency'
  }
}

function getEmergencyIncidentStatus(status: EmergencyReport['status']): IncidentStatus {
  switch (status) {
    case 'pending':
      return 'new'
    case 'active':
      return 'dispatched'
    case 'enroute':
      return 'enroute'
    case 'on_scene':
      return 'on_scene'
    case 'done':
    case 'resolved':
      return 'resolved'
    default:
      return 'new'
  }
}

function convertEmergencyReportToIncident(report: EmergencyReport): IncidentRecord {
  const createdAt = toDate(report.createdAt) ?? new Date()
  const updatedAt = toDate(report.updatedAt) ?? undefined
  const resolvedAt =
    report.status === 'done' || report.status === 'resolved'
      ? toDate(report.movedToHistoryAt) ?? updatedAt ?? createdAt
      : null
  const incidentDate = formatDateInput(createdAt)
  const incidentTime = createdAt.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return {
    id: report.id ? `emergency-${report.id}` : `emergency-${createdAt.getTime()}`,
    referenceNumber: report.id ? `APP-${report.id.slice(-6).toUpperCase()}` : 'APP-REPORT',
    source: 'civilian_app',
    createdByUserId: report.userId || '',
    commandCenterAdminId: report.viewedByDispatcherId || '',
    incidentCategory: getEmergencyIncidentCategory(report.incidentType),
    incidentSubtypeId: report.incidentType,
    incidentSubtypeLabel: getEmergencyIncidentLabel(report.incidentType),
    priority: report.priority || 'medium',
    locationText: report.locationText || 'Unspecified location',
    landmark: report.landmark || null,
    quadrant: null,
    latitude: report.latitude,
    longitude: report.longitude,
    callerName: null,
    callerContact: null,
    description: report.description || null,
    vehicularAccidentReason: null,
    notes: report.postIncidentReport?.notes || null,
    requiresExternalAgency: Boolean(report.assignedAgency || report.suggestedAgency),
    recommendedAgencies: [],
    assignedAgencies: [],
    assignedResourceIds: [],
    teamId: report.assignedResponderId || null,
    teamName: report.responder || null,
    incidentDate,
    incidentTime,
    dateOfDuty: incidentDate,
    scheduleOfDuty: incidentTime.includes('PM') ? 'PM' : 'AM',
    teamOnDuty: null,
    status: getEmergencyIncidentStatus(report.status),
    resolutionStatus: report.status === 'done' || report.status === 'resolved' ? 'resolved' : 'open',
    createdAt,
    updatedAt,
    resolvedAt,
  }
}

function countBy<T extends string>(
  incidents: IncidentRecord[],
  getKey: (incident: IncidentRecord) => T | null | undefined,
  fallbackLabel?: string
): BreakdownItem[] {
  const totals = new Map<string, number>()

  incidents.forEach((incident) => {
    const key = getKey(incident) ?? fallbackLabel
    if (!key) return
    totals.set(key, (totals.get(key) ?? 0) + 1)
  })

  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
}

function createDailyTrend(incidents: IncidentRecord[], fromDate: string, toDate: string): ChartPoint[] {
  const from = parseDateInput(fromDate)
  const to = parseDateInput(toDate)
  if (!from || !to) return []

  const counts = new Map<string, number>()
  incidents.forEach((incident) => {
    const date = getIncidentDate(incident)
    if (!date) return
    const key = formatDateInput(date)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  const days: ChartPoint[] = []
  let cursor = startOfDay(from)
  const last = startOfDay(to)

  while (cursor <= last) {
    const key = formatDateInput(cursor)
    days.push({
      dateKey: key,
      label: cursor.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      count: counts.get(key) ?? 0,
    })
    cursor = addDays(cursor, 1)
  }

  return days
}

function buildLinePath(points: ChartPoint[], width: number, height: number): string {
  const max = Math.max(...points.map((point) => point.count), 1)
  if (points.length === 0) return ''

  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
      const y = height - (point.count / max) * (height - 16) - 8
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function applyPreset(preset: DatePreset): { fromDate: string; toDate: string } {
  const today = startOfDay(new Date())
  const toDate = formatDateInput(today)

  switch (preset) {
    case '7d':
      return { fromDate: formatDateInput(addDays(today, -6)), toDate }
    case '30d':
      return { fromDate: formatDateInput(addDays(today, -29)), toDate }
    case '90d':
      return { fromDate: formatDateInput(addDays(today, -89)), toDate }
    case 'year':
      return { fromDate: `${today.getFullYear()}-01-01`, toDate }
    case 'all':
      return { fromDate: '', toDate: '' }
    case 'custom':
    default:
      return { fromDate: '', toDate }
  }
}

function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'emerald',
}: {
  label: string
  value: string | number
  helper: string
  icon: React.ElementType
  tone?: 'emerald' | 'amber' | 'red' | 'blue'
}) {
  const toneClass = {
    emerald: 'border-primary-500/20 bg-primary-500/10 text-primary-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    red: 'border-red-500/20 bg-red-500/10 text-red-300',
    blue: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
  }[tone]

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black tabular-nums text-slate-100">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${toneClass}`}>
          <Icon size={22} aria-hidden />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-400">{helper}</p>
    </div>
  )
}

function BreakdownBars({ title, subtitle, items }: { title: string; subtitle: string; items: BreakdownItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 1)

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20">
      <div className="mb-5">
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-500">
          No records in this range.
        </p>
      ) : (
        <div className="space-y-4">
          {items.slice(0, 8).map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-slate-200">{item.label}</span>
                <span className="font-black tabular-nums text-slate-100">{item.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-300"
                  style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function TrendChart({ points }: { points: ChartPoint[] }) {
  const width = 640
  const height = 190
  const path = buildLinePath(points, width, height)
  const max = Math.max(...points.map((point) => point.count), 0)
  const total = points.reduce((sum, point) => sum + point.count, 0)

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20 lg:col-span-2">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">Incident Volume Trend</h2>
          <p className="mt-1 text-xs text-slate-500">Daily incidents recorded in the selected date range.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Total</p>
            <p className="text-lg font-black text-slate-100">{total}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Peak Day</p>
            <p className="text-lg font-black text-slate-100">{max}</p>
          </div>
        </div>
      </div>

      {points.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 px-4 py-16 text-center text-sm text-slate-500">
          Choose a date range to show the trend chart.
        </p>
      ) : (
        <div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full overflow-visible" role="img" aria-label="Incident trend line chart">
              <defs>
                <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((line) => (
                <line
                  key={line}
                  x1="0"
                  x2={width}
                  y1={(height / 4) * line + 8}
                  y2={(height / 4) * line + 8}
                  stroke="rgb(30 41 59)"
                  strokeDasharray="4 8"
                />
              ))}
              {path && (
                <>
                  <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill="url(#trendFill)" />
                  <path d={path} fill="none" stroke="rgb(52 211 153)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}
              {points.map((point, index) => {
                const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
                const y = height - (point.count / Math.max(max, 1)) * (height - 16) - 8
                return (
                  <circle
                    key={point.dateKey}
                    cx={x}
                    cy={y}
                    r={point.count > 0 ? 4 : 2.5}
                    className="fill-slate-950 stroke-primary-300"
                    strokeWidth="3"
                  />
                )
              })}
            </svg>
          </div>
          <div className="mt-3 flex justify-between gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            <span>{points[0]?.label}</span>
            <span>{points[Math.floor(points.length / 2)]?.label}</span>
            <span>{points[points.length - 1]?.label}</span>
          </div>
        </div>
      )}
    </section>
  )
}

export default function ReportPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [manualIncidents, setManualIncidents] = useState<IncidentRecord[]>([])
  const [appReportIncidents, setAppReportIncidents] = useState<IncidentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [preset, setPreset] = useState<DatePreset>('30d')
  const [selectedTeam, setSelectedTeam] = useState<TeamOnDuty | 'all'>('all')
  const [fromDate, setFromDate] = useState(() => applyPreset('30d').fromDate)
  const [toDate, setToDate] = useState(() => applyPreset('30d').toDate)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    let loadedManual = false
    let loadedAppReports = false
    const markLoaded = () => {
      if (loadedManual && loadedAppReports) setIsLoading(false)
    }

    const unsubscribeIncidents = subscribeToIncidents(
      (items) => {
        setManualIncidents(items)
        loadedManual = true
        markLoaded()
      },
      1000,
      { includeAllCommandCenters: true }
    )

    const unsubscribeAppReports = subscribeToEmergencyReports(
      (reports) => {
        setAppReportIncidents(reports.map(convertEmergencyReportToIncident))
        loadedAppReports = true
        markLoaded()
      },
      { statusFilter: 'all', limitCount: 1000 }
    )

    return () => {
      unsubscribeIncidents()
      unsubscribeAppReports()
    }
  }, [user, router])

  const incidents = useMemo(
    () => [...manualIncidents, ...appReportIncidents],
    [manualIncidents, appReportIncidents]
  )

  const filteredIncidents = useMemo(() => {
    const from = fromDate ? startOfDay(parseDateInput(fromDate) ?? new Date(0)) : null
    const to = toDate ? endOfDay(parseDateInput(toDate) ?? new Date()) : null

    return incidents.filter((incident) => {
      if (selectedTeam !== 'all' && incident.teamOnDuty !== selectedTeam) return false

      const incidentDate = getIncidentDate(incident)
      if (!incidentDate) return false

      if (from && incidentDate < from) return false
      if (to && incidentDate > to) return false

      return true
    })
  }, [incidents, selectedTeam, fromDate, toDate])

  const analytics = useMemo(() => {
    const total = filteredIncidents.length
    const resolved = filteredIncidents.filter((incident) => incident.resolutionStatus === 'resolved' || incident.status === 'resolved').length
    const unresolved = filteredIncidents.filter((incident) => incident.resolutionStatus === 'unresolved' || incident.status === 'unresolved').length
    const criticalOrHigh = filteredIncidents.filter((incident) => incident.priority === 'critical' || incident.priority === 'high').length
    const externalAgency = filteredIncidents.filter((incident) => incident.requiresExternalAgency).length
    const resolvedRate = total > 0 ? Math.round((resolved / total) * 100) : 0

    const byCategory = countBy(filteredIncidents, (incident) => categoryLabels[incident.incidentCategory] ?? 'Other')
    const byPriority = countBy(filteredIncidents, (incident) => priorityLabels[incident.priority] ?? 'Unknown')
    const byStatus = countBy(filteredIncidents, (incident) => statusLabels[incident.status] ?? incident.status.replace(/_/g, ' '))
    const byTeam = teams.map((team) => ({
      label: team,
      value: filteredIncidents.filter((incident) => incident.teamOnDuty === team).length,
    }))
    const byLocation = countBy(filteredIncidents, (incident) => incident.locationText || 'Unspecified location')

    const latest = [...filteredIncidents]
      .sort((left, right) => getTimestamp(right.createdAt) - getTimestamp(left.createdAt))
      .slice(0, 6)

    return {
      total,
      resolved,
      unresolved,
      criticalOrHigh,
      externalAgency,
      resolvedRate,
      byCategory,
      byPriority,
      byStatus,
      byTeam,
      byLocation,
      latest,
    }
  }, [filteredIncidents])

  const trendPoints = useMemo(() => createDailyTrend(filteredIncidents, fromDate, toDate), [filteredIncidents, fromDate, toDate])

  const handlePresetChange = (nextPreset: DatePreset) => {
    setPreset(nextPreset)
    if (nextPreset === 'custom') return
    const range = applyPreset(nextPreset)
    setFromDate(range.fromDate)
    setToDate(range.toDate)
  }

  const setCustomFromDate = (value: string) => {
    setPreset('custom')
    setFromDate(value)
  }

  const setCustomToDate = (value: string) => {
    setPreset('custom')
    setToDate(value)
  }

  return (
    <ProtectedRoute>
      <div className="flex h-full flex-col">
        <CommandBar
          pageName="Reports"
          description="Historical incident analytics and operational trends"
          statsCategory="Selected Range"
          stats={[
            { label: 'Incidents', value: isLoading ? '...' : analytics.total, highlight: true },
            { label: 'Resolved', value: isLoading ? '...' : analytics.resolved },
            { label: 'High Risk', value: isLoading ? '...' : analytics.criticalOrHigh },
          ]}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary-300">
                    <CalendarDays size={18} aria-hidden />
                    <p className="text-[10px] font-black uppercase tracking-[0.22em]">Date Picker</p>
                  </div>
                  <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-100">Historical Reports Dashboard</h1>
                  <p className="mt-1 text-sm text-slate-400">Filter by date and team to review workload, risk, resolution, and hotspot trends.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    ['7d', '7D'],
                    ['30d', '30D'],
                    ['90d', '90D'],
                    ['year', 'YTD'],
                    ['all', 'All'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handlePresetChange(value as DatePreset)}
                      className={`h-10 rounded-xl border px-4 text-xs font-black uppercase tracking-wider transition-colors ${
                        preset === value
                          ? 'border-primary-400 bg-primary-500/15 text-primary-200'
                          : 'border-slate-700 bg-slate-950/50 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">From</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(event) => setCustomFromDate(event.target.value)}
                    className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none transition-colors focus:border-primary-400"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">To</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(event) => setCustomToDate(event.target.value)}
                    className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none transition-colors focus:border-primary-400"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Team</span>
                  <select
                    value={selectedTeam}
                    onChange={(event) => setSelectedTeam(event.target.value as TeamOnDuty | 'all')}
                    className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none transition-colors focus:border-primary-400"
                  >
                    <option value="all">All teams</option>
                    {teams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            {isLoading ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 py-16 text-center shadow-xl shadow-black/20">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary-500" />
                <p className="mt-4 text-sm font-semibold text-slate-400">Loading historical incidents...</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <KpiCard label="Total Incidents" value={analytics.total} helper="Cases recorded in the selected range." icon={Activity} />
                  <KpiCard label="Resolution Rate" value={`${analytics.resolvedRate}%`} helper={`${analytics.resolved} resolved, ${analytics.unresolved} unresolved.`} icon={CheckCircle2} tone="blue" />
                  <KpiCard label="High Risk Cases" value={analytics.criticalOrHigh} helper="Critical and high-priority incidents." icon={ShieldAlert} tone="red" />
                  <KpiCard label="External Agency" value={analytics.externalAgency} helper="Incidents requiring external agency support." icon={Users} tone="amber" />
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <TrendChart points={trendPoints} />
                  <BreakdownBars title="By Priority" subtitle="Risk distribution for selected records." items={analytics.byPriority} />
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <BreakdownBars title="By Incident Type" subtitle="Most common categories." items={analytics.byCategory} />
                  <BreakdownBars title="By Status" subtitle="Operational progress and closure state." items={analytics.byStatus} />
                  <BreakdownBars title="By Team" subtitle="Team workload distribution." items={analytics.byTeam} />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-primary-300">
                          <MapPin size={18} aria-hidden />
                          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">Incident Hotspots</h2>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Locations with repeated reports in the selected range.</p>
                      </div>
                      <PieChart className="text-slate-600" size={22} aria-hidden />
                    </div>

                    {analytics.byLocation.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-500">
                        No location records in this range.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {analytics.byLocation.slice(0, 6).map((item, index) => (
                          <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-xs font-black text-primary-300">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-200">{item.label}</p>
                              <p className="text-xs text-slate-500">{item.value} incident{item.value === 1 ? '' : 's'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-primary-300">
                          <Clock3 size={18} aria-hidden />
                          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">Recent Historical Records</h2>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Latest matching incidents from the selected range.</p>
                      </div>
                      <BarChart3 className="text-slate-600" size={22} aria-hidden />
                    </div>

                    {analytics.latest.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-500">
                        No incident records match the selected filters.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {analytics.latest.map((incident) => (
                          <div key={incident.id ?? incident.referenceNumber} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-black text-slate-100">{incident.referenceNumber}</p>
                                  <StatusBadge status={incident.status} />
                                </div>
                                <p className="mt-2 truncate text-sm font-semibold text-slate-300">{incident.incidentSubtypeLabel}</p>
                                <p className="mt-1 truncate text-xs text-slate-500">{incident.locationText}</p>
                              </div>
                              <div className="shrink-0 text-left sm:text-right">
                                <p className="text-xs font-semibold text-slate-300">{formatIncidentDateTime(incident)}</p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                  {incident.teamOnDuty ?? 'No team'} / {priorityLabels[incident.priority]}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                {analytics.criticalOrHigh > 0 && (
                  <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
                    <div className="flex gap-3">
                      <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={20} aria-hidden />
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-amber-100">Operational Note</h2>
                        <p className="mt-2 text-sm text-amber-100/80">
                          This range contains {analytics.criticalOrHigh} high-risk incident{analytics.criticalOrHigh === 1 ? '' : 's'}.
                          Review priority mix, hotspot recurrence, and external agency demand before finalizing the report.
                        </p>
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
