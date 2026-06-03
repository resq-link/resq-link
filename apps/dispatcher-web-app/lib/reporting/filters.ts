import type { ReportFilters } from './types'
import { applyPreset } from './dates'

export function getDefaultReportFilters(): ReportFilters {
  const { fromDate, toDate } = applyPreset('30d')
  return {
    fromDate,
    toDate,
    selectedTeam: 'all',
    incidentType: 'all',
  }
}

/** Date/type scope for team summary cards — never applies Team On Duty filter. */
export function filtersForTeamSummary(filters: ReportFilters): ReportFilters {
  return { ...filters, selectedTeam: 'all' }
}
