'use client'

import { CalendarDays } from 'lucide-react'
import type { DatePreset } from '@/lib/reporting/types'
import { applyPreset } from '@/lib/reporting/dates'
import { useOperationalTeams } from '@/contexts/OperationalTeamContext'
import { teamReactKey } from '@/lib/operational/teamUtils'

type ReportDateFiltersProps = {
  preset: DatePreset
  fromDate: string
  toDate: string
  selectedTeam: string | 'all'
  onPresetChange: (preset: DatePreset) => void
  onFromDateChange: (value: string) => void
  onToDateChange: (value: string) => void
  onTeamChange: (team: string | 'all') => void
  title: string
  description: string
  showPeriodPresets?: boolean
}

const basePresets: [DatePreset, string][] = [
  ['7d', '7D'],
  ['30d', '30D'],
  ['90d', '90D'],
  ['year', 'YTD'],
  ['all', 'All'],
]

export default function ReportDateFilters({
  preset,
  fromDate,
  toDate,
  selectedTeam,
  onPresetChange,
  onFromDateChange,
  onToDateChange,
  onTeamChange,
  title,
  description,
  showPeriodPresets = true,
}: ReportDateFiltersProps) {
  const { teams } = useOperationalTeams()

  const handlePresetClick = (nextPreset: DatePreset) => {
    onPresetChange(nextPreset)
    const range = applyPreset(nextPreset)
    onFromDateChange(range.fromDate)
    onToDateChange(range.toDate)
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary-300">
            <CalendarDays size={18} aria-hidden />
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">{title}</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        {showPeriodPresets ? (
          <div className="flex flex-wrap gap-2">
            {basePresets.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => handlePresetClick(value)}
                className={`h-9 rounded-xl border px-3 text-[11px] font-black uppercase tracking-wider transition-colors ${
                  preset === value
                    ? 'border-primary-400 bg-primary-500/15 text-primary-200'
                    : 'border-slate-700 bg-slate-950/50 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => {
              onPresetChange('custom')
              onFromDateChange(event.target.value)
            }}
            className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none transition-colors focus:border-primary-400"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">To</span>
          <input
            type="date"
            value={toDate}
            onChange={(event) => {
              onPresetChange('custom')
              onToDateChange(event.target.value)
            }}
            className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none transition-colors focus:border-primary-400"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Assigned Team</span>
          <select
            value={selectedTeam}
            onChange={(event) => onTeamChange(event.target.value)}
            className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none transition-colors focus:border-primary-400"
          >
            <option value="all">All teams</option>
            {teams.map((team, index) => (
              <option key={teamReactKey(team, index)} value={team.code}>
                {team.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
