'use client'

import { useOperationalTeams } from '@/contexts/OperationalTeamContext'
import { teamReactKey } from '@/lib/operational/teamUtils'

type TeamListFilterSelectProps = {
  className?: string
}

export default function TeamListFilterSelect({ className = '' }: TeamListFilterSelectProps) {
  const { teams, listTeamFilter, setListTeamFilter, isLoading } = useOperationalTeams()

  return (
    <select
      value={listTeamFilter}
      onChange={(event) => setListTeamFilter(event.target.value)}
      disabled={isLoading}
      className={`h-8 rounded-lg border border-slate-800 bg-slate-950 px-2 text-[11px] font-semibold text-slate-200 outline-none focus:ring-1 focus:ring-primary-500/50 ${className}`}
      aria-label="Filter by assigned team"
    >
      <option value="all">Team: All</option>
      {teams.map((team, index) => (
        <option key={teamReactKey(team, index)} value={team.code}>
          Team: {team.label}
        </option>
      ))}
    </select>
  )
}
