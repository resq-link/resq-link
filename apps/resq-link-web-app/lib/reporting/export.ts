import type {
  IncidentExportRow,
  ReportFilters,
  TeamComparisonStats,
  TeamSummaryCardStats,
} from './types'
import type { ReportAnalytics } from './types'
import { formatDisplayDate } from './dates'
import type { IncidentRecord } from '@packages/firebase'
import { toExportRow } from './incidents'
import { computeAgencySummary } from './analytics'
import { formatReportDateOnly, formatReportingPeriod } from './reportDocument'

export type ExportBundle = {
  rows: IncidentExportRow[]
  analytics: ReportAnalytics
  teamComparison: TeamComparisonStats[]
  teamSummary: TeamSummaryCardStats[]
  agencySummary: { label: string; value: number }[]
  filters: ReportFilters
  generatedAt: string
  reportingPeriod: string
  generatedDate: string
}

export function buildExportBundle(
  filteredIncidents: IncidentRecord[],
  analytics: ReportAnalytics,
  teamComparison: TeamComparisonStats[],
  filters: ReportFilters,
  teamSummary: TeamSummaryCardStats[]
): ExportBundle {
  const generatedDate = formatReportDateOnly()
  return {
    rows: filteredIncidents.map(toExportRow),
    analytics,
    teamComparison,
    teamSummary,
    agencySummary: computeAgencySummary(filteredIncidents),
    filters,
    generatedAt: formatDisplayDate(new Date()),
    reportingPeriod: formatReportingPeriod(filters),
    generatedDate,
  }
}
