import type { AdminExportPayload } from './types'
import { buildExportFileName } from './format'
import { formatReportTimestamp, formatReportTitle, REPORT_BRAND } from './reportHeader'

export async function exportAdminTableExcel(payload: AdminExportPayload): Promise<void> {
  const XLSX = await import('xlsx')

  const metaRows: string[][] = [
    [REPORT_BRAND, formatReportTimestamp(payload.generatedAt)],
    [formatReportTitle(payload.title)],
  ]

  if (payload.filtersSummary?.length) {
    metaRows.push([`Filters: ${payload.filtersSummary.join(' · ')}`])
  }

  metaRows.push([])

  const sheetData = [...metaRows, payload.headers, ...payload.rows]

  const sheet = XLSX.utils.aoa_to_sheet(sheetData)
  const workbook = XLSX.utils.book_new()
  const sheetName = (payload.sheetName || payload.title).slice(0, 31)
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName)
  XLSX.writeFile(workbook, buildExportFileName(payload.fileSlug, 'xlsx', payload.generatedAt))
}
