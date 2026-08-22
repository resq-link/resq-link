'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TeamRecord } from '@packages/firebase'
import TeamBadge from './TeamBadge'

type ChangeTeamOnDutyModalProps = {
  isOpen: boolean
  teams: TeamRecord[]
  currentTeamName: string | null
  currentTeamId: string | null
  isSaving: boolean
  onClose: () => void
  onSave: (teamId: string) => void
}

export default function ChangeTeamOnDutyModal({
  isOpen,
  teams,
  currentTeamName,
  currentTeamId,
  isSaving,
  onClose,
  onSave,
}: ChangeTeamOnDutyModalProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!isOpen) return
    setSelectedId(currentTeamId || teams[0]?.id || '')
  }, [isOpen, currentTeamId, teams])

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">Change Current Team</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">Only new incidents use the updated team.</p>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Current</p>
            <div className="mt-1.5">
              <TeamBadge label={currentTeamName} size="sm" />
            </div>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Select Team</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {teams.map((team) => {
                const id = team.id || team.code
                const isSelected = selectedId === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={`h-10 rounded-lg border px-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                      isSelected
                        ? 'border-primary-400 bg-primary-500/15 text-primary-200'
                        : 'border-slate-700 bg-slate-950/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {team.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-800 bg-slate-950/40 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-slate-700 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedId || isSaving || selectedId === currentTeamId}
            onClick={() => onSave(selectedId)}
            className="h-9 rounded-lg bg-primary-600 px-4 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
