import type { IncidentCategory, IncidentRecord, TeamOnDuty } from '@packages/firebase'

export type DatePreset = '7d' | '30d' | '90d' | 'month' | 'quarter' | 'year' | 'all' | 'custom'

export type ChartPoint = {
  label: string
  dateKey: string
  count: number
}

export type BreakdownItem = {
  label: string
  value: number
}

export type ReportFilters = {
  fromDate: string
  toDate: string
  selectedTeam: TeamOnDuty | 'all'
  incidentType: IncidentCategory | 'all'
}

export type AgencyFilterKey =
  | 'BFP'
  | 'PNP'
  | 'MDRRMO'
  | 'EMS'
  | 'TRAFFIC'
  | 'OTHER'

export type IncidentExportRow = {
  referenceNumber: string
  incidentType: string
  priority: string
  teamOnDuty: string
  agency: string
  location: string
  dateReported: string
  dateResolved: string
  responseTime: string
  resolutionTime: string
}

export type TeamComparisonStats = {
  team: TeamOnDuty
  total: number
  resolved: number
  active: number
  avgResponseTime: string
  avgResolutionTime: string
}

export type TeamSummaryCardStats = {
  team: TeamOnDuty
  completed: number
  criticalCases: number
  topIncidentType: string
}

export type ReportAnalytics = {
  total: number
  resolved: number
  unresolved: number
  criticalOrHigh: number
  externalAgency: number
  resolvedRate: number
  byCategory: BreakdownItem[]
  byPriority: BreakdownItem[]
  byStatus: BreakdownItem[]
  byTeam: BreakdownItem[]
  byLocation: BreakdownItem[]
  byAgency: BreakdownItem[]
  latest: IncidentRecord[]
}
