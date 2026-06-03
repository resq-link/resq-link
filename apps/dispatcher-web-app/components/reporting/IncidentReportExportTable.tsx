import type { IncidentExportRow } from '@/lib/reporting/types'
import { EXPORT_TABLE_HEADERS, REPORT_LAYOUT } from '@/lib/reporting/reportDocument'

export default function IncidentReportExportTable({ rows }: { rows: IncidentExportRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="report-print-empty py-6 text-center text-sm text-slate-600">
        No completed incident records for this reporting period.
      </p>
    )
  }

  return (
    <div className="report-export-table-wrap">
      <table className="report-export-table">
        <colgroup>
          {REPORT_LAYOUT.tableColumnWidths.map((width, index) => (
            <col key={index} style={{ width: `${width * 100}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {EXPORT_TABLE_HEADERS.map((header) => (
              <th key={header} scope="col" className="report-export-th">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.referenceNumber}-${index}`}
              className={index % 2 === 1 ? 'report-export-row-alt' : undefined}
            >
              <td className="report-export-td">{row.referenceNumber}</td>
              <td className="report-export-td">{row.incidentType}</td>
              <td className="report-export-td">{row.priority}</td>
              <td className="report-export-td">{row.teamOnDuty}</td>
              <td className="report-export-td">{row.agency}</td>
              <td className="report-export-td report-export-td-location">{row.location}</td>
              <td className="report-export-td">{row.dateReported}</td>
              <td className="report-export-td">{row.dateResolved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
