import {
  getAgencyLabel,
  getAssignedTeamCode,
  getAssignedTeamName,
  type AgencyCode,
  type IncidentRecord,
} from '@packages/firebase'
import { CATEGORY_DEFAULT_AGENCY, CATEGORY_LABELS } from './constants'
import { formatReportDisplayDate, formatReportDuration, getTimestamp } from './dates'
import type { IncidentExportRow } from './types'

const REPORT_UNAVAILABLE = 'Not Available'
const REPORT_UNASSIGNED_TEAM = 'Unassigned (Needs Fix)'

export function getIncidentAssignedTeam(incident: IncidentRecord): {
  code: string | null
  label: string | null
} {
  return {
    code: getAssignedTeamCode(incident),
    label: getAssignedTeamName(incident),
  }
}

/** @deprecated Use getIncidentAssignedTeam — kept for backward compatibility */
export function inferTeamOnDuty(incident: IncidentRecord): string | null {
  return getAssignedTeamName(incident)
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
  const { label } = getIncidentAssignedTeam(incident)
  const assignedAgencies = enrichAssignedAgencies(incident)

  return {
    ...incident,
    assignedTeamName: label,
    teamOnDuty: label,
    teamName: label ?? incident.teamName,
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
  const { label } = getIncidentAssignedTeam(incident)
  return label ?? REPORT_UNASSIGNED_TEAM
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
