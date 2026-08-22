'use client'

import { useState } from 'react'
import { useOperationalTeams } from '@/contexts/OperationalTeamContext'
import { getTeamCardTheme } from '@/lib/reporting/teamSummaryTheme'
import ChangeTeamOnDutyModal from './ChangeTeamOnDutyModal'
import TeamBadge from './TeamBadge'

const TEAM_SECTION_EMOJI: Record<string, string> = {
  Whiskey: '🟠',
  'X-ray': '🔵',
  Yankee: '🟢',
  Zulu: '🟣',
}

type CurrentTeamOnDutyChipProps = {
  variant?: 'chip' | 'compact' | 'header'
}

export default function CurrentTeamOnDutyChip({ variant = 'chip' }: CurrentTeamOnDutyChipProps) {
  const {
    teams,
    isLoading: teamsLoading,
    currentTeamOnDuty,
    isCurrentTeamLoading,
    isSavingCurrentTeam,
    setCurrentTeamOnDuty,
  } = useOperationalTeams()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const changeButton = (
    <button
      type="button"
      onClick={() => setIsModalOpen(true)}
      className="h-7 shrink-0 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-[9px] font-black uppercase tracking-wider text-slate-300 hover:border-primary-500/40 hover:text-primary-200"
    >
      {currentTeamOnDuty ? 'Change' : 'Set Team'}
    </button>
  )

  const modal = (
    <ChangeTeamOnDutyModal
      isOpen={isModalOpen}
      teams={teams}
      teamsLoading={teamsLoading}
      currentTeamName={currentTeamOnDuty?.teamName ?? null}
      currentTeamId={currentTeamOnDuty?.teamId ?? null}
      isSaving={isSavingCurrentTeam}
      onClose={() => setIsModalOpen(false)}
      onSave={async (teamId) => {
        await setCurrentTeamOnDuty(teamId)
        setIsModalOpen(false)
      }}
    />
  )

  if (variant === 'compact' || variant === 'header') {
    const teamName = currentTeamOnDuty?.teamName
    const emoji = teamName ? TEAM_SECTION_EMOJI[teamName] ?? '⚪' : '⚪'
    const theme = teamName ? getTeamCardTheme(teamName) : null
    const isHeader = variant === 'header'

    return (
      <>
        <div
          className={`flex items-center gap-2 ${
            isHeader
              ? 'h-8 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5'
              : 'justify-between'
          }`}
        >
          <div
            className={`flex min-w-0 items-center gap-1 leading-none ${
              isHeader ? 'text-[11px]' : 'text-[10px]'
            }`}
          >
            <span aria-hidden>{emoji}</span>
            <span className="shrink-0 text-slate-400">On Duty:</span>
            {isCurrentTeamLoading ? (
              <span className="text-slate-500">…</span>
            ) : teamName ? (
              <span className={`truncate font-black uppercase ${theme?.accentText ?? 'text-slate-200'}`}>
                {teamName}
              </span>
            ) : (
              <span className="font-bold text-amber-400">Not set</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="h-6 shrink-0 rounded border border-slate-700 bg-slate-950 px-2 text-[9px] font-bold uppercase tracking-wide text-slate-400 hover:border-primary-500/40 hover:text-primary-200"
          >
            {currentTeamOnDuty ? 'Change' : 'Set'}
          </button>
        </div>
        {modal}
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5">
        <div className="hidden sm:block text-right">
          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500 leading-none">
            Team on Duty
          </p>
          {isCurrentTeamLoading ? (
            <p className="mt-0.5 text-[10px] text-slate-500">Loading…</p>
          ) : currentTeamOnDuty ? (
            <div className="mt-0.5">
              <TeamBadge label={currentTeamOnDuty.teamName} size="sm" />
            </div>
          ) : (
            <p className="mt-0.5 text-[10px] font-bold text-amber-400">Not set</p>
          )}
        </div>
        {changeButton}
      </div>
      {modal}
    </>
  )
}
