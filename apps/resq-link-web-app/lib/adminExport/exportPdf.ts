import type { AdminExportPayload } from './types'
import { buildExportFileName } from './format'
import {
  formatReportTimestamp,
  formatReportTitle,
  REPORT_BRAND,
  REPORT_COLORS_RGB,
} from './reportHeader'

const MARGIN = 40

export async function exportAdminTablePdf(payload: AdminExportPayload): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const landscape = payload.orientation === 'landscape'
  const doc = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentRight = pageWidth - MARGIN
  let y = MARGIN

  const timestamp = formatReportTimestamp(payload.generatedAt)
  const title = formatReportTitle(payload.title)

  // Brand row: RESQ-LINK (left) · timestamp (right)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...REPORT_COLORS_RGB.text)
  doc.text(REPORT_BRAND, MARGIN, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...REPORT_COLORS_RGB.muted)
  doc.text(timestamp, contentRight, y, { align: 'right' })
  y += 18

  // Primary report title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...REPORT_COLORS_RGB.text)
  doc.text(title, MARGIN, y)
  y += 10

  // Subtle divider
  doc.setDrawColor(...REPORT_COLORS_RGB.divider)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, y, contentRight, y)
  y += 12

  if (payload.filtersSummary?.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...REPORT_COLORS_RGB.muted)
    doc.text(`Filters: ${payload.filtersSummary.join(' · ')}`, MARGIN, y, {
      maxWidth: contentRight - MARGIN,
    })
    y += 12
  }

  autoTable(doc, {
    startY: y,
    head: [payload.headers],
    body: payload.rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: landscape ? 7.5 : 8,
      cellPadding: 4,
      textColor: REPORT_COLORS_RGB.text,
      lineColor: REPORT_COLORS_RGB.border,
      lineWidth: 0.25,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: REPORT_COLORS_RGB.headerBg,
      textColor: REPORT_COLORS_RGB.headerText,
      fontStyle: 'bold',
      fontSize: landscape ? 7 : 7.5,
    },
    alternateRowStyles: {
      fillColor: REPORT_COLORS_RGB.altRow,
    },
    margin: { left: MARGIN, right: MARGIN, bottom: 42 },
    didDrawPage: (data) => {
      const page = data.pageNumber
      const total = doc.getNumberOfPages()
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...REPORT_COLORS_RGB.muted)
      doc.text(`Page ${page} of ${total}`, pageWidth / 2, pageHeight - 22, { align: 'center' })
    },
  })

  doc.save(buildExportFileName(payload.fileSlug, 'pdf', payload.generatedAt))
}
