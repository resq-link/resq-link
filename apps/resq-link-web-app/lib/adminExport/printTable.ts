import type { AdminExportPayload } from './types'
import {
  formatReportTimestamp,
  formatReportTitle,
  REPORT_BRAND,
  REPORT_COLORS,
} from './reportHeader'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function printAdminTable(payload: AdminExportPayload): void {
  const timestamp = formatReportTimestamp(payload.generatedAt)
  const title = formatReportTitle(payload.title)

  const filters =
    payload.filtersSummary?.length
      ? `<p class="filters">Filters: ${escapeHtml(payload.filtersSummary.join(' · '))}</p>`
      : ''

  const headerCells = payload.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const bodyRows = payload.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — ${REPORT_BRAND}</title>
  <style>
    @page { margin: 0.6in; }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: ${REPORT_COLORS.paper} !important;
      color: ${REPORT_COLORS.text} !important;
      font-family: Helvetica, Arial, sans-serif;
    }
    .report-header {
      margin: 0 0 10pt;
    }
    .brand-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12pt;
    }
    .brand {
      margin: 0;
      font-size: 8pt;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${REPORT_COLORS.text} !important;
    }
    .timestamp {
      margin: 0;
      font-size: 8pt;
      font-weight: 400;
      color: ${REPORT_COLORS.muted} !important;
      white-space: nowrap;
    }
    .report-title {
      margin: 8pt 0 6pt;
      font-size: 14pt;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      line-height: 1.15;
      color: ${REPORT_COLORS.text} !important;
    }
    .divider {
      border: none;
      border-top: 0.6pt solid ${REPORT_COLORS.divider};
      margin: 0 0 10pt;
    }
    .filters {
      margin: -4pt 0 10pt;
      font-size: 7.5pt;
      color: ${REPORT_COLORS.muted} !important;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      font-size: 8pt;
      color: ${REPORT_COLORS.text} !important;
    }
    th, td {
      border: 0.25pt solid ${REPORT_COLORS.border} !important;
      padding: 4pt 6pt;
      text-align: left;
      vertical-align: top;
      word-wrap: break-word;
      color: ${REPORT_COLORS.text} !important;
    }
    th {
      background: ${REPORT_COLORS.headerBg} !important;
      color: ${REPORT_COLORS.headerText} !important;
      font-weight: 700;
    }
    tr:nth-child(even) td {
      background: ${REPORT_COLORS.altRow} !important;
    }
    thead { display: table-header-group; }
    tbody tr { page-break-inside: avoid; }
  </style>
</head>
<body>
  <header class="report-header">
    <div class="brand-row">
      <p class="brand">${REPORT_BRAND}</p>
      <p class="timestamp">${escapeHtml(timestamp)}</p>
    </div>
    <h1 class="report-title">${escapeHtml(title)}</h1>
    <hr class="divider" />
    ${filters}
  </header>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`

  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  document.body.appendChild(frame)

  const doc = frame.contentDocument || frame.contentWindow?.document
  if (!doc) {
    document.body.removeChild(frame)
    throw new Error('Unable to open print view.')
  }

  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => {
    window.setTimeout(() => {
      if (frame.parentNode) frame.parentNode.removeChild(frame)
    }, 1000)
  }

  const win = frame.contentWindow
  if (!win) {
    cleanup()
    throw new Error('Unable to open print view.')
  }

  const triggerPrint = () => {
    win.focus()
    win.print()
    cleanup()
  }

  if (doc.readyState === 'complete') {
    window.setTimeout(triggerPrint, 50)
  } else {
    frame.onload = () => window.setTimeout(triggerPrint, 50)
  }
}
