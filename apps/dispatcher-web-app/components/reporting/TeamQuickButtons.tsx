'use client'

import type { TeamOnDuty } from '@packages/firebase'
import { TEAMS_ON_DUTY } from '@/lib/reporting/constants'

type TeamQuickButtonsProps = {
  selectedTeam: TeamOnDuty | 'all'
  onSelectTeam: (team: TeamOnDuty | 'all') => void
}

export default function TeamQuickButtons({ selectedTeam, onSelectTeam }: TeamQuickButtonsProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/20">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Quick Team Reports</p>
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
        {TEAMS_ON_DUTY.map((team) => (
          <button
            key={team}
            type="button"
            onClick={() => onSelectTeam(team)}
            className={`h-10 rounded-xl border px-4 text-xs font-black uppercase tracking-wider transition-colors ${
              selectedTeam === team
                ? 'border-primary-400 bg-primary-500/15 text-primary-200'
                : 'border-slate-700 bg-slate-950/50 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {team}
          </button>
        ))}
      </div>
    </section>
  )
}
