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
import {
  EXPORT_TABLE_HEADERS,
  REPORT_HEADER_COPY,
  REPORT_HEADER_THEME,
  formatReportDateOnly,
  formatReportingPeriod,
  getReportSummaryItems,
  getReportSummaryMetrics,
  REPORT_LAYOUT,
  REPORT_TABLE_THEME,
  rowToExportTableCells,
} from './reportDocument'
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

const PDF_MARGIN = REPORT_LAYOUT.pageMarginPt
const PDF_FOOTER_ZONE = REPORT_LAYOUT.footerZonePt

type PdfDoc = {
  setDrawColor: (r: number, g: number, b: number) => void
  setFillColor: (r: number, g: number, b: number) => void
  setLineWidth: (width: number) => void
  line: (x1: number, y1: number, x2: number, y2: number) => void
  rect: (x: number, y: number, w: number, h: number, style?: 'S' | 'F' | 'FD') => void
  roundedRect: (
    x: number,
    y: number,
    w: number,
    h: number,
    rx: number,
    ry: number,
    style?: 'S' | 'F' | 'FD'
  ) => void
  setFontSize: (size: number) => void
  setFont: (font: string, style: string) => void
  setTextColor: (r: number, g: number, b: number) => void
  text: (
    text: string | string[],
    x: number,
    y: number,
    options?: { align?: 'center' | 'right' }
  ) => void
  splitTextToSize: (text: string, maxWidth: number) => string[]
  addPage: () => void
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } }
  setPage: (page: number) => void
  getNumberOfPages: () => number
  save: (filename: string) => void
}

function drawPdfFooter(
  doc: PdfDoc,
  pageNumber: number,
  pageCount: number,
  pageWidth: number,
  pageHeight: number
) {
  const footerY = pageHeight - 28
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Page ${pageNumber} of ${pageCount}`, pageWidth / 2, footerY, { align: 'center' })
  doc.setTextColor(0, 0, 0)
}

function renderPdfFrontMatter(doc: PdfDoc, bundle: ExportBundle, startY: number, pageWidth: number) {
  const centerX = pageWidth / 2
  const boxLeft = PDF_MARGIN
  const boxWidth = pageWidth - PDF_MARGIN * 2
  const boxTop = startY
  const theme = REPORT_HEADER_THEME
  const copy = REPORT_HEADER_COPY
  const metrics = getReportSummaryMetrics(bundle.rows, bundle.analytics)
  const summaryItems = getReportSummaryItems(metrics)
  const metaLine = `${bundle.reportingPeriod}  ·  ${copy.generatedOnLabel} ${bundle.generatedDate}`
  const sp = REPORT_LAYOUT.spacing

  doc.setFillColor(...theme.primaryRgb)
  doc.rect(boxLeft, boxTop, boxWidth, sp.accentHeightPt, 'F')

  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.5)
  doc.line(boxLeft, boxTop + sp.accentHeightPt, boxLeft + boxWidth, boxTop + sp.accentHeightPt)

  let y = boxTop + sp.accentHeightPt + sp.afterAccentToTitlePt

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...theme.primaryRgb)
  doc.text(copy.title, centerX, y, { align: 'center' })
  y += sp.titleToSubtitlePt

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...theme.subtitleRgb)
  doc.text(copy.subtitle, centerX, y, { align: 'center' })
  y += sp.subtitleToMetaPt

  doc.setFontSize(8)
  doc.setTextColor(...theme.labelRgb)
  doc.text(metaLine, centerX, y, { align: 'center' })
  y += sp.metaToDividerPt

  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.5)
  doc.line(boxLeft, y, boxLeft + boxWidth, y)
  y += sp.dividerToStatsPt

  const statsTop = y
  const colWidth = boxWidth / summaryItems.length
  let maxStatBottom = statsTop + 12

  summaryItems.forEach((item, index) => {
    const x = boxLeft + colWidth * index + colWidth / 2

    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...theme.labelRgb)
    const labelLines = doc.splitTextToSize(item.label, colWidth - 12)
    doc.text(labelLines, x, statsTop, { align: 'center' })

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...theme.valueRgb)
    const valueY = statsTop + labelLines.length * 7 + sp.statLabelToValuePt
    doc.text(item.value, x, valueY, { align: 'center' })
    maxStatBottom = Math.max(maxStatBottom, valueY + 12)
  })

  for (let index = 1; index < summaryItems.length; index += 1) {
    const dividerX = boxLeft + colWidth * index
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.5)
    doc.line(dividerX, statsTop, dividerX, maxStatBottom)
  }

  y = maxStatBottom + sp.afterStatsBlockPt

  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.5)
  doc.line(boxLeft, y, boxLeft + boxWidth, y)

  doc.setTextColor(0, 0, 0)
  return y + sp.afterFrontMatterPt
}

function renderPdfTeamFilter(doc: PdfDoc, bundle: ExportBundle, startY: number): number {
  if (bundle.filters.selectedTeam === 'all') return startY

  const sp = REPORT_LAYOUT.spacing
  const boxLeft = PDF_MARGIN
  let y = startY + sp.teamFilterTopPt

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(107, 114, 128)
  doc.text('Team On Duty', boxLeft, y)
  y += sp.teamLabelToNamePt

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(4, 120, 87)
  doc.text(bundle.filters.selectedTeam.toUpperCase(), boxLeft, y)

  doc.setTextColor(0, 0, 0)
  return y + sp.afterTeamFilterPt
}

export async function exportPdf(bundle: ExportBundle) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const tableWidth = pageWidth - PDF_MARGIN * 2
  let y = renderPdfFrontMatter(doc, bundle, PDF_MARGIN, pageWidth)
  y = renderPdfTeamFilter(doc, bundle, y)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(31, 41, 55)
  if (y + 20 > pageHeight - PDF_FOOTER_ZONE) {
    doc.addPage()
    y = PDF_MARGIN
  }
  doc.text(REPORT_LAYOUT.sectionTitle, PDF_MARGIN, y)
  y += REPORT_LAYOUT.spacing.sectionTitleToTablePt

  autoTable(doc, {
    startY: y,
    head: [Array.from(EXPORT_TABLE_HEADERS)],
    body: bundle.rows.map(rowToExportTableCells),
    theme: 'striped',
    styles: {
      fontSize: REPORT_TABLE_THEME.bodyFontSizePt,
      font: 'helvetica',
      fontStyle: 'normal',
      cellPadding: REPORT_TABLE_THEME.cellPaddingPt,
      overflow: 'linebreak',
      valign: 'top',
      halign: 'left',
      textColor: [17, 24, 39],
      lineColor: [...REPORT_TABLE_THEME.borderRgb],
      lineWidth: REPORT_TABLE_THEME.borderWidthPt,
    },
    headStyles: {
      fillColor: [...REPORT_TABLE_THEME.headFillRgb],
      textColor: [255, 255, 255],
      font: 'helvetica',
      fontStyle: 'bold',
      halign: 'left',
      valign: 'middle',
      fontSize: REPORT_TABLE_THEME.headFontSizePt,
      cellPadding: REPORT_TABLE_THEME.cellPaddingPt,
      lineColor: [...REPORT_TABLE_THEME.borderRgb],
      lineWidth: REPORT_TABLE_THEME.borderWidthPt,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: Object.fromEntries(
      REPORT_LAYOUT.tableColumnWidths.map((width, index) => [
        index,
        { cellWidth: tableWidth * width },
      ])
    ),
    margin: { left: PDF_MARGIN, right: PDF_MARGIN, bottom: PDF_FOOTER_ZONE, top: PDF_MARGIN },
    tableWidth,
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
  })

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    drawPdfFooter(doc, page, pageCount, pageWidth, pageHeight)
  }

  doc.save(`resq-incident-report-${Date.now()}.pdf`)
}

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
