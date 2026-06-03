import { getAgencyLabel, type AgencyCode, type IncidentRecord, type TeamOnDuty } from '@packages/firebase'
import { CATEGORY_DEFAULT_AGENCY, CATEGORY_LABELS, TEAMS_ON_DUTY } from './constants'
import { formatReportDisplayDate, formatReportDuration, getTimestamp } from './dates'
import type { IncidentExportRow } from './types'

const REPORT_UNAVAILABLE = 'Not Available'
const REPORT_UNASSIGNED_TEAM = 'Unassigned (Needs Fix)'

function isTeamOnDuty(value: string | null | undefined): value is TeamOnDuty {
  if (!value) return false
  return TEAMS_ON_DUTY.includes(value as TeamOnDuty)
}

export function inferTeamOnDuty(incident: IncidentRecord): TeamOnDuty | null {
  if (isTeamOnDuty(incident.teamOnDuty)) return incident.teamOnDuty
  if (isTeamOnDuty(incident.teamName)) return incident.teamName

  const responder = incident.teamName?.trim() || ''
  const match = TEAMS_ON_DUTY.find((team) => team.toLowerCase() === responder.toLowerCase())
  return match ?? null
}

export function enrichAssignedAgencies(incident: IncidentRecord): AgencyCode[] {
  if (incident.assignedAgencies.length > 0) return incident.assignedAgencies
  const fromCategory = CATEGORY_DEFAULT_AGENCY[incident.incidentCategory]
  if (fromCategory) return [fromCategory]
  if (incident.recommendedAgencies.length > 0) return [incident.recommendedAgencies[0]]
  return []
}

export function inferResponseTimeSeconds(incident: IncidentRecord): number | null {
  if (incident.responseTimeSeconds != null && incident.responseTimeSeconds >= 0) {
    return incident.responseTimeSeconds
  }

  const created = getTimestamp(incident.createdAt)
  if (!created) return null

  const accepted = getTimestamp(incident.acceptedAt)
  if (accepted && accepted >= created) {
    return Math.round((accepted - created) / 1000)
  }

  const touchdown = getTimestamp(incident.touchdownAt)
  if (touchdown && touchdown >= created) {
    return Math.round((touchdown - created) / 1000)
  }

  return null
}

export function inferResolutionTimeSeconds(incident: IncidentRecord): number | null {
  const created = getTimestamp(incident.createdAt)
  const resolved = getTimestamp(incident.resolvedAt)
  if (!created || !resolved || resolved < created) return null
  return Math.round((resolved - created) / 1000)
}

export function normalizeIncidentForReport(incident: IncidentRecord): IncidentRecord {
  const teamOnDuty = inferTeamOnDuty(incident)
  const assignedAgencies = enrichAssignedAgencies(incident)

  return {
    ...incident,
    teamOnDuty,
    teamName: teamOnDuty ?? incident.teamName,
    assignedAgencies,
    responseTimeSeconds: inferResponseTimeSeconds(incident) ?? incident.responseTimeSeconds,
  }
}

export function formatReportAgency(incident: IncidentRecord): string {
  const normalized = normalizeIncidentForReport(incident)

  if (normalized.assignedAgencies.length > 0) {
    return normalized.assignedAgencies.map((code) => getAgencyLabel(code)).join(', ')
  }

  if (normalized.requiresExternalAgency) return 'External agency'

  const fallback = CATEGORY_DEFAULT_AGENCY[normalized.incidentCategory]
  if (fallback) return getAgencyLabel(fallback)

  return 'Not Assigned'
}

export function formatReportTeam(incident: IncidentRecord): string {
  const team = inferTeamOnDuty(incident)
  return team ?? REPORT_UNASSIGNED_TEAM
}

export function toNormalizedExportRow(incident: IncidentRecord): IncidentExportRow {
  const normalized = normalizeIncidentForReport(incident)

  return {
    referenceNumber: normalized.referenceNumber?.trim() || REPORT_UNAVAILABLE,
    incidentType:
      normalized.incidentSubtypeLabel ||
      CATEGORY_LABELS[normalized.incidentCategory] ||
      REPORT_UNAVAILABLE,
    priority: normalized.priority || REPORT_UNAVAILABLE,
    teamOnDuty: formatReportTeam(normalized),
    agency: formatReportAgency(normalized),
    location: normalized.locationText?.trim() || REPORT_UNAVAILABLE,
    dateReported: formatReportDisplayDate(normalized.createdAt),
    dateResolved: formatReportDisplayDate(normalized.resolvedAt),
    responseTime: formatReportDuration(inferResponseTimeSeconds(normalized)),
    resolutionTime: formatReportDuration(inferResolutionTimeSeconds(normalized)),
  }
}
