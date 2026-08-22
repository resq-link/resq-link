'use client'

type IntakeOperationsStripProps = {
  activeCases: number
  incoming: number
  awaitingResources: number
  unviewed: number
}

function StatPill({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span
        className={`text-sm font-black tabular-nums leading-none ${
          highlight ? 'text-primary-300' : 'text-slate-100'
        }`}
      >
        {value}
      </span>
    </span>
  )
}

export default function IntakeOperationsStrip({
  activeCases,
  incoming,
  awaitingResources,
  unviewed,
}: IntakeOperationsStripProps) {
  return (
    <div className="shrink-0 border-b border-slate-800 bg-slate-900/25 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">
          Operations
        </span>
        <span className="text-slate-600" aria-hidden>
          |
        </span>
        <StatPill label="Active" value={activeCases} highlight />
        <span className="text-sm text-slate-500" aria-hidden>
          ·
        </span>
        <StatPill label="In" value={incoming} />
        <span className="text-sm text-slate-500" aria-hidden>
          ·
        </span>
        <StatPill label="Await" value={awaitingResources} />
        <span className="text-sm text-slate-500" aria-hidden>
          ·
        </span>
        <StatPill label="Unviewed" value={unviewed} />
      </div>
    </div>
  )
}
