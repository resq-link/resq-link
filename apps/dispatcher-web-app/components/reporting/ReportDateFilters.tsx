'use client'

import { CalendarDays } from 'lucide-react'
import type { TeamOnDuty } from '@packages/firebase'
import type { DatePreset } from '@/lib/reporting/types'
import { TEAMS_ON_DUTY } from '@/lib/reporting/constants'
import { applyPreset } from '@/lib/reporting/dates'

type ReportDateFiltersProps = {
  preset: DatePreset
  fromDate: string
  toDate: string
  selectedTeam: TeamOnDuty | 'all'
  onPresetChange: (preset: DatePreset) => void
  onFromDateChange: (value: string) => void
  onToDateChange: (value: string) => void
  onTeamChange: (team: TeamOnDuty | 'all') => void
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

const periodPresets: [DatePreset, string][] = [
  ['month', 'Month'],
  ['quarter', 'Quarter'],
  ['year', 'Year'],
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
  showPeriodPresets = false,
}: ReportDateFiltersProps) {
  const presets = showPeriodPresets
    ? [
        ...basePresets.filter(([value]) => value !== 'year'),
        ...periodPresets,
      ]
    : basePresets

  const handlePresetChange = (nextPreset: DatePreset) => {
    onPresetChange(nextPreset)
    if (nextPreset === 'custom') return
    const range = applyPreset(nextPreset)
    onFromDateChange(range.fromDate)
    onToDateChange(range.toDate)
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary-300">
            <CalendarDays size={18} aria-hidden />
            <p className="text-[10px] font-black uppercase tracking-[0.22em]">Filters</p>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-100">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {presets.map(([value, label]) => (
            <button
              key={`${value}-${label}`}
              type="button"
              onClick={() => handlePresetChange(value)}
              className={`h-10 rounded-xl border px-4 text-xs font-black uppercase tracking-wider transition-colors ${
                preset === value
                  ? 'border-primary-400 bg-primary-500/15 text-primary-200'
                  : 'border-slate-700 bg-slate-950/50 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Team On Duty</span>
          <select
            value={selectedTeam}
            onChange={(event) => onTeamChange(event.target.value as TeamOnDuty | 'all')}
            className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none transition-colors focus:border-primary-400"
          >
            <option value="all">All teams</option>
            {TEAMS_ON_DUTY.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
