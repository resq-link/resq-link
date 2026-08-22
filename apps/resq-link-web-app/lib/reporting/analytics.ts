import type { IncidentRecord } from '@packages/firebase'
import { CATEGORY_LABELS, PRIORITY_LABELS } from './constants'
import type {
  BreakdownItem,
  ChartPoint,
  ReportAnalytics,
  TeamComparisonStats,
  TeamSummaryCardStats,
} from './types'
import type { ReportFilters } from './types'
import { filterIncidents } from './incidents'
import { formatDateInput, formatDurationSeconds, getTimestamp, parseDateInput, startOfDay, addDays } from './dates'
import {
  getIncidentAgencyLabel,
  getIncidentDate,
  getOperationalStatus,
  getResolutionTimeSeconds,
  isActiveIncident,
  isResolvedIncident,
} from './incidents'
import {
  formatReportAgency,
  inferResponseTimeSeconds,
  inferResolutionTimeSeconds,
  getIncidentAssignedTeam,
} from './normalizeReportIncident'
import { incidentMatchesTeamFilter } from '@packages/firebase'

export type OperationalTeamOption = {
  code: string
  label: string
}

export function countBy<T extends string>(
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

export function createDailyTrend(incidents: IncidentRecord[], fromDate: string, toDate: string): ChartPoint[] {
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

export function buildLinePath(points: ChartPoint[], width: number, height: number): string {
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

export function computeReportAnalytics(
  filteredIncidents: IncidentRecord[],
  teams: OperationalTeamOption[] = []
): ReportAnalytics {
  const total = filteredIncidents.length
  const resolved = filteredIncidents.filter(isResolvedIncident).length
  const unresolved = filteredIncidents.filter(
    (incident) => incident.resolutionStatus === 'unresolved' || incident.status === 'unresolved'
  ).length
  const criticalOrHigh = filteredIncidents.filter(
    (incident) => incident.priority === 'critical' || incident.priority === 'high'
  ).length
  const externalAgency = filteredIncidents.filter((incident) => incident.requiresExternalAgency).length
  const resolvedRate = total > 0 ? Math.round((resolved / total) * 100) : 0

  const byCategory = countBy(
    filteredIncidents,
    (incident) => CATEGORY_LABELS[incident.incidentCategory] ?? 'Other'
  )
  const byPriority = countBy(
    filteredIncidents,
    (incident) => PRIORITY_LABELS[incident.priority] ?? 'Unknown'
  )
  const byStatus = countBy(filteredIncidents, (incident) => {
    const op = getOperationalStatus(incident)
    return op.charAt(0).toUpperCase() + op.slice(1).replace('_', ' ')
  })
  const byTeam = teams.length
    ? teams.map((team) => ({
        label: team.label,
        value: filteredIncidents.filter((incident) =>
          incidentMatchesTeamFilter(incident, team.code)
        ).length,
      }))
    : countBy(filteredIncidents, (incident) => getIncidentAssignedTeam(incident).label)
  const byLocation = countBy(filteredIncidents, (incident) => incident.locationText || 'Unspecified location')
  const byAgency = countBy(filteredIncidents, (incident) => {
    const label = getIncidentAgencyLabel(incident)
    return label === '—' ? null : label
  })

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
    byAgency,
    latest,
  }
}

function averageSeconds(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function getTopIncidentTypeLabel(incidents: IncidentRecord[]): string {
  if (incidents.length === 0) return '—'
  const breakdown = countBy(
    incidents,
    (incident) => CATEGORY_LABELS[incident.incidentCategory] ?? 'Other'
  )
  return breakdown[0]?.label ?? '—'
}

function buildTeamCardStats(
  team: OperationalTeamOption,
  teamIncidents: IncidentRecord[]
): TeamSummaryCardStats {
  const responseValues = teamIncidents
    .map((incident) => inferResponseTimeSeconds(incident))
    .filter((value): value is number => value != null)
  const resolutionValues = teamIncidents
    .map((incident) => inferResolutionTimeSeconds(incident) ?? getResolutionTimeSeconds(incident))
    .filter((value): value is number => value != null)

  return {
    team: team.code,
    teamLabel: team.label,
    completed: teamIncidents.length,
    criticalCases: teamIncidents.filter((incident) => incident.priority === 'critical').length,
    topIncidentType: getTopIncidentTypeLabel(teamIncidents),
    avgResponseTime: formatDurationSeconds(averageSeconds(responseValues)),
    avgResolutionTime: formatDurationSeconds(averageSeconds(resolutionValues)),
  }
}

/**
 * Per-team stats for the export center summary cards.
 * Uses date range (and incident type) only — ignores team filter on the table.
 */
export function computeTeamSummaryCards(
  incidents: IncidentRecord[],
  filters: ReportFilters,
  teams: OperationalTeamOption[]
): TeamSummaryCardStats[] {
  const summaryScoped = filterIncidents(
    incidents,
    { ...filters, selectedTeam: 'all' },
    { reportEligibleOnly: true }
  )

  return teams.map((team) => {
    const teamIncidents = summaryScoped.filter((incident) =>
      incidentMatchesTeamFilter(incident, team.code)
    )
    return buildTeamCardStats(team, teamIncidents)
  })
}

export function computeTeamComparison(
  filteredIncidents: IncidentRecord[],
  teams: OperationalTeamOption[]
): TeamComparisonStats[] {
  return teams.map((team) => {
    const teamIncidents = filteredIncidents.filter((incident) =>
      incidentMatchesTeamFilter(incident, team.code)
    )
    const responseValues = teamIncidents
      .map((incident) => inferResponseTimeSeconds(incident))
      .filter((value): value is number => value != null)
    const resolutionValues = teamIncidents
      .map((incident) => inferResolutionTimeSeconds(incident) ?? getResolutionTimeSeconds(incident))
      .filter((value): value is number => value != null)

    return {
      team: team.code,
      teamLabel: team.label,
      total: teamIncidents.length,
      resolved: teamIncidents.filter(isResolvedIncident).length,
      active: teamIncidents.filter(isActiveIncident).length,
      avgResponseTime: formatDurationSeconds(averageSeconds(responseValues)),
      avgResolutionTime: formatDurationSeconds(averageSeconds(resolutionValues)),
    }
  })
}

export function computeAgencySummary(filteredIncidents: IncidentRecord[]): BreakdownItem[] {
  return countBy(filteredIncidents, (incident) => {
    return formatReportAgency(incident)
  })
}
