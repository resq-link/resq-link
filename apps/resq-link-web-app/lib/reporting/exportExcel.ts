import type { ExportBundle } from './export'

export async function exportExcel(bundle: ExportBundle) {
  const XLSX = await import('xlsx')

  const incidentSheet = XLSX.utils.json_to_sheet(
    bundle.rows.map((row) => ({
      'Incident Number': row.referenceNumber,
      'Incident Type': row.incidentType,
      Priority: row.priority,
      'Team On Duty': row.teamOnDuty,
      Agency: row.agency,
      Location: row.location,
      'Date Reported': row.dateReported,
      'Date Resolved': row.dateResolved,
      'Response Time': row.responseTime,
      'Resolution Time': row.resolutionTime,
    }))
  )

  const teamSheet = XLSX.utils.json_to_sheet(
    bundle.teamComparison.map((row) => ({
      Team: row.team,
      'Total Incidents': row.total,
      'Resolved Incidents': row.resolved,
      'Active Incidents': row.active,
      'Average Response Time': row.avgResponseTime,
      'Average Resolution Time': row.avgResolutionTime,
    }))
  )

  const agencySheet = XLSX.utils.json_to_sheet(
    bundle.agencySummary.map((row) => ({
      Agency: row.label,
      Incidents: row.value,
    }))
  )

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, incidentSheet, 'Incident Data')
  XLSX.utils.book_append_sheet(workbook, teamSheet, 'Team Summary')
  XLSX.utils.book_append_sheet(workbook, agencySheet, 'Agency Summary')
  XLSX.writeFile(workbook, `resq-incident-report-${Date.now()}.xlsx`)
}
