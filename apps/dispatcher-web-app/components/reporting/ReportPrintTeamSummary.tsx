import type { TeamOnDuty } from '@packages/firebase'

type ReportPrintTeamSummaryProps = {
  selectedTeam: TeamOnDuty | 'all'
}

/** Shown in print/PDF only when the report is filtered to one team. */
export default function ReportPrintTeamSummary({ selectedTeam }: ReportPrintTeamSummaryProps) {
  if (selectedTeam === 'all') return null

  return (
    <section className="report-print-team-filter" aria-label={`Report filtered to team ${selectedTeam}`}>
      <p className="report-print-team-filter-label">Team On Duty</p>
      <p className="report-print-team-filter-name">{selectedTeam.toUpperCase()}</p>
    </section>
  )
}
