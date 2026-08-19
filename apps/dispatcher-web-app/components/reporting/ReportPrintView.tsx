'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ExportBundle } from '@/lib/reporting/export'
import {
  getReportSummaryMetrics,
  REPORT_LAYOUT,
  reportPrintStyleVars,
} from '@/lib/reporting/reportDocument'
import IncidentReportExportTable from './IncidentReportExportTable'
import ReportPrintFrontMatter from './ReportPrintFrontMatter'
import ReportPrintTeamSummary from './ReportPrintTeamSummary'

type ReportPrintViewProps = {
  bundle: ExportBundle
}

export default function ReportPrintView({ bundle }: ReportPrintViewProps) {
  const [mounted, setMounted] = useState(false)
  const summary = getReportSummaryMetrics(bundle.rows, bundle.analytics)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const printDocument = (
    <div
      className="report-print-root pointer-events-none fixed -left-[10000px] top-0 z-[-1] w-[max(100%,297mm)] bg-white text-black"
      aria-hidden
    >
      <div className="report-print-page" style={reportPrintStyleVars()}>
          <ReportPrintFrontMatter
            reportingPeriod={bundle.reportingPeriod}
            generatedDate={bundle.generatedDate}
            metrics={summary}
          />

          <ReportPrintTeamSummary
            selectedTeam={bundle.filters.selectedTeam}
            teamLabel={
              bundle.teamSummary.find((card) => card.team === bundle.filters.selectedTeam)
                ?.teamLabel
            }
          />

          <section className="report-print-table-section">
            <h2 className="report-print-section-title">{REPORT_LAYOUT.sectionTitle}</h2>
            <IncidentReportExportTable rows={bundle.rows} />
          </section>

          <footer className="report-print-footer" aria-label="Page numbers" />
      </div>
    </div>
  )

  return createPortal(printDocument, document.body)
}
