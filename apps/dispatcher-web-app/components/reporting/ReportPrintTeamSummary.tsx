type ReportPrintTeamSummaryProps = {
  selectedTeam: string | 'all'
  teamLabel?: string | null
}

/** Shown in print/PDF only when the report is filtered to one team. */
export default function ReportPrintTeamSummary({
  selectedTeam,
  teamLabel,
}: ReportPrintTeamSummaryProps) {
  if (selectedTeam === 'all') return null

  return (
    <section className="report-print-team-filter" aria-label={`Report filtered to team ${teamLabel ?? selectedTeam}`}>
      <p className="report-print-team-filter-label">Assigned Team</p>
      <p className="report-print-team-filter-name">{(teamLabel ?? selectedTeam).toUpperCase()}</p>
    </section>
  )
}
