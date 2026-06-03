import type { ReportAnalytics, ReportFilters, TeamSummaryCardStats } from './types'
import type { IncidentExportRow } from './types'
import { parseDateInput } from './dates'

/** RESQ brand tokens for PDF/print headers (grayscale-safe). */
export const REPORT_HEADER_THEME = {
  primaryRgb: [4, 120, 87] as const,
  primaryHex: '#047857',
  accentRgb: [16, 185, 129] as const,
  backgroundRgb: [236, 253, 245] as const,
  borderRgb: [167, 243, 208] as const,
  subtitleRgb: [55, 65, 81] as const,
  labelRgb: [107, 114, 128] as const,
  valueRgb: [31, 41, 55] as const,
}

export const REPORT_HEADER_COPY = {
  title: 'RESQ-LINK INCIDENT REPORT',
  subtitle: 'Command Center Operations Report',
  reportingPeriodLabel: 'Reporting Period',
  generatedOnLabel: 'Generated On',
} as const

export const EXPORT_TABLE_HEADERS = [
  'Incident #',
  'Type',
  'Priority',
  'Team',
  'Agency',
  'Location',
  'Reported Date',
  'Resolved Date',
] as const

/** Shared layout tokens — PDF export is source of truth; print CSS mirrors these. */
export const REPORT_LAYOUT = {
  pageMarginPt: 48,
  footerZonePt: 52,
  sectionTitle: 'INCIDENT RECORDS',
  tableColumnWidths: [0.09, 0.11, 0.08, 0.08, 0.1, 0.28, 0.13, 0.13] as const,
  fonts: {
    print: "Arial, Helvetica, 'Segoe UI', sans-serif",
  },
  /** Vertical gaps in jsPDF renderPdfFrontMatter / table (pt). */
  spacing: {
    accentHeightPt: 3,
    afterAccentToTitlePt: 17,
    titleToSubtitlePt: 16,
    subtitleToMetaPt: 14,
    metaToDividerPt: 12,
    dividerToStatsPt: 14,
    statLabelToValuePt: 4,
    afterStatsBlockPt: 10,
    afterFrontMatterPt: 10,
    teamFilterTopPt: 8,
    teamLabelToNamePt: 12,
    afterTeamFilterPt: 16,
    sectionTitleToTablePt: 12,
  },
} as const

/** Table styling shared by jsPDF autotable and print CSS. */
export const REPORT_TABLE_THEME = {
  headFillRgb: [30, 41, 59] as const,
  headFillHex: '#1e293b',
  headTextHex: '#ffffff',
  bodyTextHex: '#111827',
  altRowFillHex: '#f8fafc',
  borderRgb: [200, 200, 200] as const,
  borderHex: '#c8c8c8',
  borderWidthPt: 0.25,
  headFontSizePt: 7,
  bodyFontSizePt: 7.5,
  cellPaddingPt: 4,
} as const

/** Tighter header gaps for print (CSS line-height adds space vs jsPDF baselines). */
const PRINT_HEADER_GAP_PT = {
  afterAccentToTitle: 12,
  titleToSubtitle: 10,
  subtitleToMeta: 8,
  metaToDivider: 8,
  dividerToStats: 10,
} as const

/** Print-only @page margins (PDF export keeps REPORT_LAYOUT.pageMarginPt). */
export const REPORT_PRINT_LAYOUT = {
  marginTopPt: REPORT_LAYOUT.pageMarginPt,
  marginBottomPt: REPORT_LAYOUT.footerZonePt,
  marginHorizontalIn: 0,
} as const

/** Injected into document.head for Ctrl+P fallback on the main page. */
export function reportPrintPageStyleCss(): string {
  const { marginTopPt, marginBottomPt, marginHorizontalIn } = REPORT_PRINT_LAYOUT
  const side = `${marginHorizontalIn}in`
  return `@page{size:landscape;margin:${marginTopPt}pt ${side} ${marginBottomPt}pt ${side};}`
}

export function reportPrintStyleVars(): Record<string, string> {
  const t = REPORT_TABLE_THEME
  const widths = REPORT_LAYOUT.tableColumnWidths
  const pt = (value: number) => `${value}pt`
  const hg = PRINT_HEADER_GAP_PT

  return {
    ...reportSpacingCssVars(),
    '--report-gap-title': pt(hg.afterAccentToTitle),
    '--report-gap-subtitle': pt(hg.titleToSubtitle),
    '--report-gap-meta': pt(hg.subtitleToMeta),
    '--report-gap-divider-after-meta': pt(hg.metaToDivider),
    '--report-gap-divider-before-stats': pt(hg.dividerToStats),
    '--report-table-head-bg': t.headFillHex,
    '--report-table-head-color': t.headTextHex,
    '--report-table-body-color': t.bodyTextHex,
    '--report-table-alt-bg': t.altRowFillHex,
    '--report-table-border': t.borderHex,
    '--report-table-border-width': pt(t.borderWidthPt),
    '--report-table-head-font-size': pt(t.headFontSizePt),
    '--report-table-body-font-size': pt(t.bodyFontSizePt),
    '--report-table-cell-padding': pt(t.cellPaddingPt),
    ...Object.fromEntries(
      widths.map((width, index) => [`--report-col-${index + 1}-width`, `${width * 100}%`])
    ),
  }
}

export function reportSpacingCssVars(): Record<string, string> {
  const s = REPORT_LAYOUT.spacing
  const pt = (value: number) => `${value}pt`
  return {
    '--report-accent-h': pt(s.accentHeightPt),
    '--report-gap-title': pt(s.afterAccentToTitlePt),
    '--report-gap-subtitle': pt(s.titleToSubtitlePt),
    '--report-gap-meta': pt(s.subtitleToMetaPt),
    '--report-gap-divider-after-meta': pt(s.metaToDividerPt),
    '--report-gap-divider-before-stats': pt(s.dividerToStatsPt),
    '--report-gap-stat-value': pt(s.statLabelToValuePt),
    '--report-gap-after-stats': pt(s.afterStatsBlockPt),
    '--report-gap-after-front': pt(s.afterFrontMatterPt),
    '--report-gap-team-top': pt(s.teamFilterTopPt),
    '--report-gap-team-label': pt(s.teamLabelToNamePt),
    '--report-gap-after-team': pt(s.afterTeamFilterPt),
    '--report-gap-section-table': pt(s.sectionTitleToTablePt),
  }
}

export function formatReportingPeriod(filters: ReportFilters): string {
  const formatLong = (iso: string) => {
    const date = parseDateInput(iso)
    if (!date) return iso || '—'
    return date.toLocaleDateString('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (!filters.fromDate && !filters.toDate) return 'All recorded dates'
  if (filters.fromDate && filters.toDate) {
    return `${formatLong(filters.fromDate)} – ${formatLong(filters.toDate)}`
  }
  if (filters.fromDate) return `From ${formatLong(filters.fromDate)}`
  return `Through ${formatLong(filters.toDate)}`
}

export function formatReportDateOnly(value: Date = new Date()): string {
  return value.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function getReportSummaryMetrics(
  rows: IncidentExportRow[],
  analytics: ReportAnalytics
) {
  const criticalCount = rows.filter((row) => row.priority === 'critical').length
  const mostCommonType =
    analytics.byCategory[0]?.label ??
    (rows.length > 0 ? rows[0].incidentType : '—')

  return {
    totalCompleted: rows.length,
    totalCritical: criticalCount,
    mostCommonType,
    generatedDate: formatReportDateOnly(),
  }
}

export type ReportSummaryMetrics = ReturnType<typeof getReportSummaryMetrics>

export function formatReportSummaryLines(metrics: ReportSummaryMetrics): string[] {
  return [
    `Total Completed Incidents: ${metrics.totalCompleted}`,
    `Total Critical Incidents: ${metrics.totalCritical}`,
    `Most Common Incident Type: ${metrics.mostCommonType}`,
    `Generated Date: ${metrics.generatedDate}`,
  ]
}

export function parseReportSummaryLine(line: string): { label: string; value: string } {
  const colon = line.indexOf(':')
  if (colon < 0) return { label: line, value: '' }
  return {
    label: line.slice(0, colon).trim(),
    value: line.slice(colon + 1).trim(),
  }
}

export function getReportSummaryItems(metrics: ReportSummaryMetrics) {
  return formatReportSummaryLines(metrics).map(parseReportSummaryLine)
}

export function filterTeamSummaryForExport(
  teamSummary: TeamSummaryCardStats[],
  filters: ReportFilters
): TeamSummaryCardStats[] {
  if (filters.selectedTeam === 'all') return teamSummary
  return teamSummary.filter((card) => card.team === filters.selectedTeam)
}

export function truncateLocation(location: string, max = 48): string {
  if (location.length <= max) return location
  return `${location.slice(0, max - 1)}…`
}

export function rowToExportTableCells(row: IncidentExportRow): string[] {
  return [
    row.referenceNumber,
    row.incidentType,
    row.priority,
    row.teamOnDuty,
    row.agency,
    truncateLocation(row.location),
    row.dateReported,
    row.dateResolved,
  ]
}
