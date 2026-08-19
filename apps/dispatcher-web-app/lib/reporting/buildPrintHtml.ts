import type { ExportBundle } from './export'
import {
  EXPORT_TABLE_HEADERS,
  REPORT_HEADER_COPY,
  REPORT_LAYOUT,
  REPORT_PRINT_LAYOUT,
  REPORT_TABLE_THEME,
  getReportSummaryItems,
  getReportSummaryMetrics,
  rowToExportTableCells,
} from './reportDocument'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Self-contained print CSS (no app stylesheet, no display:none rules). */
function buildPrintStyles(): string {
  const { marginTopPt, marginBottomPt, marginHorizontalIn } = REPORT_PRINT_LAYOUT
  const side = `${marginHorizontalIn}in`
  const pageMargin = `${marginTopPt}pt ${side} ${marginBottomPt}pt ${side}`
  const t = REPORT_TABLE_THEME
  const w = REPORT_LAYOUT.tableColumnWidths

  const pageRules = `
@page{size:A4 landscape;margin:${pageMargin};page-orientation:landscape;}
`

  return `
${pageRules}
html,body{margin:0;padding:0;width:100%;background:#fff;color:#111827;font-family:Arial,Helvetica,'Segoe UI',sans-serif;}
.report-print-root,.report-print-page{width:100%;max-width:none;margin:0;padding:0;box-sizing:border-box;}
.report-front-matter{margin:0;text-align:center;page-break-inside:avoid;}
.report-front-accent{height:3pt;background:#047857;margin:0;}
.report-front-title{margin:12pt 0 0;font-size:14pt;font-weight:700;letter-spacing:.03em;line-height:1;text-transform:uppercase;color:#047857;}
.report-front-subtitle{margin:10pt 0 0;font-size:9pt;color:#374151;}
.report-front-meta{margin:8pt 0 0;font-size:8pt;color:#6b7280;}
.report-front-meta-sep{margin:0 .25em;color:#9ca3af;}
.report-front-divider{border:none;border-top:1px solid #dcdcdc;height:0;margin:0;padding:0;}
.report-front-divider-meta{margin:8pt 0 10pt;}
.report-front-divider-stats{margin:10pt 0 10pt;}
.report-front-stats{display:flex;width:100%;margin:0;padding:0;text-align:center;}
.report-front-stat-wrap{display:flex;flex:1;align-items:stretch;justify-content:center;min-width:0;}
.report-front-stat-divider{width:1px;align-self:stretch;background:#dcdcdc;flex-shrink:0;}
.report-front-stat{display:flex;flex:1;flex-direction:column;align-items:center;gap:4pt;min-width:0;padding:0 4pt;}
.report-front-stat-label{font-size:6.5pt;font-weight:500;color:#6b7280;}
.report-front-stat-value{font-size:9pt;font-weight:700;color:#111827;}
.report-print-team-filter{margin:8pt 0 0;text-align:left;page-break-inside:avoid;}
.report-print-team-filter-label{margin:0 0 12pt;font-size:7.5pt;color:#6b7280;}
.report-print-team-filter-name{margin:0;font-size:11pt;font-weight:700;text-transform:uppercase;color:#047857;}
.report-print-section-title{font-size:9pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1f2937;margin:10pt 0 12pt;}
.report-print-team-filter+.report-print-table-section .report-print-section-title{margin-top:16pt;}
.report-print-table-section{width:100%;}
.report-export-table-wrap,.report-export-table{width:100%;max-width:100%;}
.report-export-table{border-collapse:collapse;table-layout:fixed;font-size:${t.bodyFontSizePt}pt;line-height:1.25;}
.report-export-table col:nth-child(1){width:${w[0] * 100}%;}
.report-export-table col:nth-child(2){width:${w[1] * 100}%;}
.report-export-table col:nth-child(3){width:${w[2] * 100}%;}
.report-export-table col:nth-child(4){width:${w[3] * 100}%;}
.report-export-table col:nth-child(5){width:${w[4] * 100}%;}
.report-export-table col:nth-child(6){width:${w[5] * 100}%;}
.report-export-table col:nth-child(7){width:${w[6] * 100}%;}
.report-export-table col:nth-child(8){width:${w[7] * 100}%;}
.report-export-th{background:${t.headFillHex}!important;color:${t.headTextHex}!important;font-size:${t.headFontSizePt}pt;font-weight:700;padding:${t.cellPaddingPt}pt!important;border:${t.borderWidthPt}pt solid ${t.borderHex}!important;vertical-align:middle;text-align:left;}
.report-export-td{padding:${t.cellPaddingPt}pt!important;border:${t.borderWidthPt}pt solid ${t.borderHex}!important;font-size:${t.bodyFontSizePt}pt;color:${t.bodyTextHex}!important;vertical-align:top;word-wrap:break-word;overflow-wrap:break-word;}
.report-export-td-location{word-break:break-word;}
.report-export-row-alt .report-export-td{background:${t.altRowFillHex}!important;}
.report-print-empty{margin:24pt 0;text-align:center;font-size:10pt;color:#4b5563;}
.report-print-footer::after{content:'Page ' counter(page) ' of ' counter(pages);display:block;margin-top:8pt;font-size:8pt;color:#646464;text-align:center;}
thead{display:table-header-group;}
tbody tr{page-break-inside:avoid;}
@media print{
  @page{size:A4 landscape;margin:${pageMargin};page-orientation:landscape;}
  html,body{width:100%!important;height:auto!important;margin:0!important;padding:0!important;overflow:visible!important;}
  .report-print-root,.report-print-page,.report-print-table-section,.report-export-table-wrap,.report-export-table{width:100%!important;max-width:none!important;margin-left:0!important;margin-right:0!important;padding-left:0!important;padding-right:0!important;}
  .report-export-table{table-layout:fixed!important;}
  html,body,.report-export-th,.report-export-td,.report-export-row-alt .report-export-td,.report-front-accent{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
}
@media screen{
  html,body{width:100%;min-height:100vh;}
}
`.replace(/\s+/g, ' ').trim()
}

function buildFrontMatterHtml(bundle: ExportBundle): string {
  const copy = REPORT_HEADER_COPY
  const items = getReportSummaryItems(
    getReportSummaryMetrics(bundle.rows, bundle.analytics)
  )

  const stats = items
    .map((item, index) => {
      const divider =
        index > 0 ? '<span class="report-front-stat-divider" aria-hidden="true"></span>' : ''
      return (
        `<div class="report-front-stat-wrap">${divider}` +
        `<div class="report-front-stat">` +
        `<span class="report-front-stat-label">${escapeHtml(item.label)}</span>` +
        `<span class="report-front-stat-value">${escapeHtml(item.value)}</span>` +
        `</div></div>`
      )
    })
    .join('')

  return (
    `<section class="report-front-matter">` +
    `<div class="report-front-accent" aria-hidden="true"></div>` +
    `<div class="report-front-body">` +
    `<h1 class="report-front-title">${escapeHtml(copy.title)}</h1>` +
    `<p class="report-front-subtitle">${escapeHtml(copy.subtitle)}</p>` +
    `<p class="report-front-meta">` +
    `<span>${escapeHtml(bundle.reportingPeriod)}</span>` +
    `<span class="report-front-meta-sep" aria-hidden="true"> · </span>` +
    `<span>${escapeHtml(copy.generatedOnLabel)} ${escapeHtml(bundle.generatedDate)}</span>` +
    `</p>` +
    `<hr class="report-front-divider report-front-divider-meta" />` +
    `<div class="report-front-stats">${stats}</div>` +
    `<hr class="report-front-divider report-front-divider-stats" />` +
    `</div></section>`
  )
}

function buildTeamFilterHtml(bundle: ExportBundle): string {
  if (bundle.filters.selectedTeam === 'all') return ''
  const teamLabel =
    bundle.teamSummary.find((card) => card.team === bundle.filters.selectedTeam)?.teamLabel ??
    bundle.filters.selectedTeam
  return (
    `<section class="report-print-team-filter">` +
    `<p class="report-print-team-filter-label">Assigned Team</p>` +
    `<p class="report-print-team-filter-name">${escapeHtml(teamLabel.toUpperCase())}</p>` +
    `</section>`
  )
}

function buildTableHtml(bundle: ExportBundle): string {
  const title = REPORT_LAYOUT.sectionTitle

  if (bundle.rows.length === 0) {
    return (
      `<section class="report-print-table-section">` +
      `<h2 class="report-print-section-title">${escapeHtml(title)}</h2>` +
      `<p class="report-print-empty">No completed incident records for this reporting period.</p>` +
      `</section>`
    )
  }

  const headers = EXPORT_TABLE_HEADERS.map(
    (header) => `<th scope="col" class="report-export-th">${escapeHtml(header)}</th>`
  ).join('')

  const colgroup = REPORT_LAYOUT.tableColumnWidths
    .map((width) => `<col style="width:${width * 100}%" />`)
    .join('')

  const bodyRows = bundle.rows
    .map((row, index) => {
      const cells = rowToExportTableCells(row)
        .map((cell, cellIndex) => {
          const locationClass = cellIndex === 5 ? ' report-export-td-location' : ''
          return `<td class="report-export-td${locationClass}">${escapeHtml(cell)}</td>`
        })
        .join('')
      const altClass = index % 2 === 1 ? ' class="report-export-row-alt"' : ''
      return `<tr${altClass}>${cells}</tr>`
    })
    .join('')

  return (
    `<section class="report-print-table-section">` +
    `<h2 class="report-print-section-title">${escapeHtml(title)}</h2>` +
    `<div class="report-export-table-wrap">` +
    `<table class="report-export-table"><colgroup>${colgroup}</colgroup>` +
    `<thead><tr>${headers}</tr></thead>` +
    `<tbody>${bodyRows}</tbody></table></div></section>`
  )
}

/** Full HTML document for a dedicated print window (built from data, not DOM clone). */
export function buildIncidentReportPrintDocument(bundle: ExportBundle): string {
  const styles = buildPrintStyles()
  const body =
    `<div class="report-print-root"><div class="report-print-page">` +
    buildFrontMatterHtml(bundle) +
    buildTeamFilterHtml(bundle) +
    buildTableHtml(bundle) +
    `<footer class="report-print-footer" aria-hidden="true"></footer>` +
    `</div></div>`

  return (
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    '<title>RESQ-LINK Incident Report</title>' +
    `<style>${styles}</style></head>` +
    `<body style="margin:0;padding:0;width:100%;">${body}</body></html>`
  )
}
