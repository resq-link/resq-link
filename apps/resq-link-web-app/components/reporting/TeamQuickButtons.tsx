'use client'

import type { TeamRecord } from '@packages/firebase'

type TeamQuickButtonsProps = {
  teams: TeamRecord[]
  selectedTeam: string | 'all'
  onSelectTeam: (team: string | 'all') => void
  title?: string
}

export default function TeamQuickButtons({
  teams,
  selectedTeam,
  onSelectTeam,
  title = 'Assigned Team',
}: TeamQuickButtonsProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/20">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelectTeam('all')}
          className={`h-10 rounded-xl border px-4 text-xs font-black uppercase tracking-wider transition-colors ${
            selectedTeam === 'all'
              ? 'border-primary-400 bg-primary-500/15 text-primary-200'
              : 'border-slate-700 bg-slate-950/50 text-slate-300 hover:bg-slate-800'
          }`}
        >
          All Teams
        </button>
        {teams.map((team) => (
          <button
            key={team.id || team.code}
            type="button"
            onClick={() => onSelectTeam(team.code)}
            className={`h-10 rounded-xl border px-4 text-xs font-black uppercase tracking-wider transition-colors ${
              selectedTeam === team.code
                ? 'border-primary-400 bg-primary-500/15 text-primary-200'
                : 'border-slate-700 bg-slate-950/50 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {team.label}
          </button>
        ))}
      </div>
    </section>
  )
}
