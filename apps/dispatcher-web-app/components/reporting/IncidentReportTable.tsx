import type { IncidentExportRow } from '@/lib/reporting/types'

export default function IncidentReportTable({ rows }: { rows: IncidentExportRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 px-4 py-12 text-center text-sm text-slate-500">
        No incidents match the current filters.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
        <thead className="bg-slate-950/80">
          <tr>
            {[
              'Incident #',
              'Type',
              'Priority',
              'Team',
              'Agency',
              'Location',
              'Reported',
              'Resolved',
              'Response',
              'Resolution',
            ].map((header) => (
              <th
                key={header}
                className="whitespace-nowrap px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80 bg-slate-950/30">
          {rows.map((row) => (
            <tr key={row.referenceNumber} className="hover:bg-slate-900/50">
              <td className="whitespace-nowrap px-3 py-2.5 font-bold text-slate-100">{row.referenceNumber}</td>
              <td className="px-3 py-2.5 text-slate-300">{row.incidentType}</td>
              <td className="px-3 py-2.5 capitalize text-slate-300">{row.priority}</td>
              <td className="px-3 py-2.5 text-slate-300">{row.teamOnDuty}</td>
              <td className="max-w-[140px] truncate px-3 py-2.5 text-slate-400">{row.agency}</td>
              <td className="max-w-[180px] truncate px-3 py-2.5 text-slate-400">{row.location}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-400">{row.dateReported}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-400">{row.dateResolved}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-cyan-400">{row.responseTime}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">{row.resolutionTime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
