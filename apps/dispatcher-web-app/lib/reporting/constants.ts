import type {
  AgencyCode,
  IncidentCategory,
  IncidentPriority,
  IncidentStatus,
  TeamOnDuty,
} from '@packages/firebase'
import type { AgencyFilterKey } from './types'

export const TEAMS_ON_DUTY: TeamOnDuty[] = ['Whiskey', 'X-ray', 'Yankee', 'Zulu']

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  fire: 'Fire',
  peace_and_order: 'Peace and Order',
  medical: 'Medical',
  vehicular: 'Vehicular',
  utility: 'Utility',
  community: 'Community',
  other: 'Other',
}

export const PRIORITY_LABELS: Record<IncidentPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const STATUS_LABELS: Partial<Record<IncidentStatus, string>> = {
  new: 'New',
  awaiting_resources: 'Awaiting Resources',
  liaison_pending: 'Liaison Pending',
  dispatched: 'Dispatched',
  enroute: 'En Route',
  on_scene: 'On Scene',
  resolved: 'Resolved',
  unresolved: 'Unresolved',
}

export const OPERATIONAL_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'on_scene', label: 'On Scene' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const

export const AGENCY_FILTER_OPTIONS: { value: AgencyFilterKey | 'all'; label: string }[] = [
  { value: 'all', label: 'All Agencies' },
  { value: 'BFP', label: 'BFP' },
  { value: 'PNP', label: 'PNP' },
  { value: 'MDRRMO', label: 'MDRRMO' },
  { value: 'EMS', label: 'EMS' },
  { value: 'TRAFFIC', label: 'Traffic Management' },
  { value: 'OTHER', label: 'Others' },
]

export const INCIDENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'fire', label: 'Fire' },
  { value: 'medical', label: 'Medical' },
  { value: 'vehicular', label: 'Vehicular' },
  { value: 'peace_and_order', label: 'Peace and Order' },
  { value: 'utility', label: 'Utility' },
  { value: 'community', label: 'Community' },
  { value: 'other', label: 'Other' },
] as const

/** Agency codes matched by each export/filter group */
export const AGENCY_FILTER_CODES: Record<AgencyFilterKey, AgencyCode[]> = {
  BFP: ['BFP'],
  PNP: ['PNP'],
  MDRRMO: ['RESCUE_1111', 'TFLC', 'COMMAND_CENTER'],
  EMS: ['TCPGH', 'CHO'],
  TRAFFIC: ['PSSO_TCTMG', 'TFLC'],
  OTHER: ['OTHER', 'BARANGAY_OFFICIALS', 'WATER_DISTRICT', 'CAGELCO_1', 'PCG', 'WATER_DISTRICT'],
}

export const DISPATCHER_ROLE_TO_AGENCY: Record<string, AgencyCode> = {
  BFP: 'BFP',
  PNP: 'PNP',
  MDRRMO: 'RESCUE_1111',
  AMBULANCE: 'TCPGH',
  PCG: 'PCG',
}

/** Default agency when intake records omit assignedAgencies (report display only). */
export const CATEGORY_DEFAULT_AGENCY: Record<IncidentCategory, AgencyCode> = {
  fire: 'BFP',
  peace_and_order: 'PNP',
  medical: 'TCPGH',
  vehicular: 'TFLC',
  utility: 'CAGELCO_1',
  community: 'RESCUE_1111',
  other: 'RESCUE_1111',
}
