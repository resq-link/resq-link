import type { ExportBundle } from '@/lib/reporting/export'
import {
  REPORT_HEADER_COPY,
  getReportSummaryItems,
  type ReportSummaryMetrics,
} from '@/lib/reporting/reportDocument'

type ReportPrintFrontMatterProps = {
  reportingPeriod: ExportBundle['reportingPeriod']
  generatedDate: ExportBundle['generatedDate']
  metrics: ReportSummaryMetrics
}

export default function ReportPrintFrontMatter({
  reportingPeriod,
  generatedDate,
  metrics,
}: ReportPrintFrontMatterProps) {
  const copy = REPORT_HEADER_COPY
  const summaryItems = getReportSummaryItems(metrics)

  return (
    <section className="report-front-matter">
      <div className="report-front-accent" aria-hidden />
      <div className="report-front-body">
        <h1 className="report-front-title">{copy.title}</h1>
        <p className="report-front-subtitle">{copy.subtitle}</p>
        <p className="report-front-meta">
          <span>{reportingPeriod}</span>
          <span className="report-front-meta-sep" aria-hidden>
            ·
          </span>
          <span>
            {copy.generatedOnLabel} {generatedDate}
          </span>
        </p>
        <hr className="report-front-divider report-front-divider-meta" aria-hidden />
        <div className="report-front-stats">
          {summaryItems.map((item, index) => (
            <div key={item.label} className="report-front-stat-wrap">
              {index > 0 && <span className="report-front-stat-divider" aria-hidden />}
              <div className="report-front-stat">
                <span className="report-front-stat-label">{item.label}</span>
                <span className="report-front-stat-value">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
        <hr className="report-front-divider report-front-divider-stats" aria-hidden />
      </div>
    </section>
  )
}
