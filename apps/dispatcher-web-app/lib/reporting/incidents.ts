import {
  getAgencyLabel,
  isLiveIncident,
  isReportEligibleIncident as isReportEligibleIncidentRecord,
  isResolvedIncidentRecord,
  normalizeOperationalStatus,
  type AgencyCode,
  type EmergencyReport,
  type IncidentCategory,
  type IncidentRecord,
  type IncidentStatus,
  type OperationalIncidentStatus,
  type TeamOnDuty,
} from '@packages/firebase'
import {
  AGENCY_FILTER_CODES,
  CATEGORY_DEFAULT_AGENCY,
  CATEGORY_LABELS,
  DISPATCHER_ROLE_TO_AGENCY,
  TEAMS_ON_DUTY,
} from './constants'
import { inferTeamOnDuty, toNormalizedExportRow } from './normalizeReportIncident'
import type { AgencyFilterKey, IncidentExportRow, ReportFilters } from './types'
import {
  endOfDay,
  formatDateInput,
  formatDisplayDate,
  formatDurationSeconds,
  getTimestamp,
  parseDateInput,
  startOfDay,
  toDate,
} from './dates'

export function getIncidentDate(incident: IncidentRecord): Date | null {
  const fromIncidentDate = parseDateInput(incident.incidentDate ?? '')
  if (fromIncidentDate) return fromIncidentDate

  const createdAt = getTimestamp(incident.createdAt)
  return createdAt ? new Date(createdAt) : null
}

export function formatReadableDate(value: string): string {
  const date = parseDateInput(value)
  if (!date) return value || 'No date'
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatIncidentDateTime(incident: IncidentRecord): string {
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

function mapEmergencyAgencies(report: EmergencyReport): AgencyCode[] {
  const codes: AgencyCode[] = []
  const role = report.assignedAgency || report.suggestedAgency
  if (role && DISPATCHER_ROLE_TO_AGENCY[role]) {
    codes.push(DISPATCHER_ROLE_TO_AGENCY[role])
  }
  if (codes.length === 0) {
    const category = getEmergencyIncidentCategory(report.incidentType)
    const fallback = CATEGORY_DEFAULT_AGENCY[category]
    if (fallback) codes.push(fallback)
  }
  return codes
}

function inferTeamOnDutyFromEmergency(report: EmergencyReport): TeamOnDuty | null {
  const candidate = report.responder?.trim()
  if (!candidate) return null
  return TEAMS_ON_DUTY.find((team) => team.toLowerCase() === candidate.toLowerCase()) ?? null
}

export function convertEmergencyReportToIncident(report: EmergencyReport): IncidentRecord {
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
  const assignedAgencies = mapEmergencyAgencies(report)

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
    assignedAgencies,
    assignedResourceIds: report.assignedResponderId ? [report.assignedResponderId] : [],
    teamId: report.assignedResponderId || null,
    teamName: report.responder || null,
    incidentDate,
    incidentTime,
    dateOfDuty: incidentDate,
    scheduleOfDuty: incidentTime.includes('PM') ? 'PM' : 'AM',
    teamOnDuty: inferTeamOnDutyFromEmergency(report),
    status: getEmergencyIncidentStatus(report.status),
    resolutionStatus: report.status === 'done' || report.status === 'resolved' ? 'resolved' : 'open',
    createdAt,
    updatedAt,
    acceptedAt: report.acceptedAt,
    touchdownAt: report.touchdownAt,
    responseTimeSeconds: report.responseTimeSeconds,
    resolvedAt,
  }
}

export function getIncidentAgencyLabel(incident: IncidentRecord): string {
  if (incident.assignedAgencies.length > 0) {
    return incident.assignedAgencies.map((code) => getAgencyLabel(code)).join(', ')
  }
  if (incident.requiresExternalAgency) return 'External agency'
  return '—'
}

export function incidentMatchesAgencyFilter(incident: IncidentRecord, agency: AgencyFilterKey): boolean {
  const codes = AGENCY_FILTER_CODES[agency]
  if (incident.assignedAgencies.some((code) => codes.includes(code))) return true
  if (agency === 'OTHER' && incident.requiresExternalAgency && incident.assignedAgencies.length === 0) {
    return true
  }
  return false
}

export function getOperationalStatus(incident: IncidentRecord): OperationalIncidentStatus {
  return normalizeOperationalStatus(incident.status)
}

export function isResolvedIncident(incident: IncidentRecord): boolean {
  return isResolvedIncidentRecord(incident)
}

/** Completed / resolved records only — excludes open, pending, and active cases. */
export function isReportEligibleIncident(incident: IncidentRecord): boolean {
  if (getOperationalStatus(incident) === 'cancelled') return false
  return isReportEligibleIncidentRecord(incident)
}

export function isActiveIncident(incident: IncidentRecord): boolean {
  if (!isLiveIncident(incident)) return false
  const status = getOperationalStatus(incident)
  return status === 'active' || status === 'on_scene' || status === 'pending'
}

export function getResolutionTimeSeconds(incident: IncidentRecord): number | null {
  const created = getTimestamp(incident.createdAt)
  const resolved = getTimestamp(incident.resolvedAt)
  if (!created || !resolved || resolved < created) return null
  return Math.round((resolved - created) / 1000)
}

export type FilterIncidentsOptions = {
  /** Limit to completed / resolved historical records (export center). */
  reportEligibleOnly?: boolean
}

export function filterIncidents(
  incidents: IncidentRecord[],
  filters: ReportFilters,
  options?: FilterIncidentsOptions
): IncidentRecord[] {
  const from = filters.fromDate ? startOfDay(parseDateInput(filters.fromDate) ?? new Date(0)) : null
  const to = filters.toDate ? endOfDay(parseDateInput(filters.toDate) ?? new Date()) : null

  return incidents.filter((incident) => {
    if (options?.reportEligibleOnly && !isReportEligibleIncident(incident)) return false
    if (filters.selectedTeam !== 'all' && inferTeamOnDuty(incident) !== filters.selectedTeam) return false

    const incidentDate = getIncidentDate(incident)
    if (!incidentDate) return false
    if (from && incidentDate < from) return false
    if (to && incidentDate > to) return false

    if (filters.incidentType !== 'all' && incident.incidentCategory !== filters.incidentType) return false

    return true
  })
}

export function toExportRow(incident: IncidentRecord): IncidentExportRow {
  return toNormalizedExportRow(incident)
}
