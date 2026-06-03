import type { TeamSummaryCardStats } from '@/lib/reporting/types'
import {
  TEAM_CARD_THEMES,
  getTeamCardDisplay,
} from '@/lib/reporting/teamSummaryTheme'

type TeamSummaryCardsProps = {
  cards: TeamSummaryCardStats[]
}

function TeamSummaryStat({ label, value, isNumeric, isMuted }: {
  label: string
  value: string
  isNumeric: boolean
  isMuted: boolean
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      {isNumeric ? (
        <p className="mt-px text-xl font-black tabular-nums leading-none text-slate-50">
          {value}
        </p>
      ) : (
        <p
          className={`mt-px text-[11px] font-semibold leading-tight ${
            isMuted ? 'text-slate-500' : 'text-slate-200'
          }`}
        >
          {value}
        </p>
      )}
    </div>
  )
}

export default function TeamSummaryCards({ cards }: TeamSummaryCardsProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 px-2.5 py-2 shadow-md shadow-black/10">
      <div className="mb-1.5">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Team Summary
        </h2>
        <p className="text-[10px] leading-tight text-slate-500">
          Completed incident overview by operational duty team.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const theme = TEAM_CARD_THEMES[card.team]
          const stats = getTeamCardDisplay(card)

          return (
            <div
              key={card.team}
              className={[
                'relative flex w-full flex-col overflow-hidden rounded-lg border border-slate-800/90 border-l-[3px]',
                'bg-gradient-to-b from-slate-900/90 to-slate-950/95',
                theme.accentLeft,
                theme.glow,
              ].join(' ')}
            >
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent"
                aria-hidden
              />

              <header className="relative flex items-center justify-between gap-1.5 border-b border-slate-800/80 px-2.5 py-1.5">
                <h3
                  className={`min-w-0 truncate text-base font-black uppercase tracking-wide ${theme.accentText}`}
                >
                  {theme.name}
                </h3>
                <span
                  className={`shrink-0 rounded px-1.5 py-px text-[8px] font-bold uppercase tracking-wide ring-1 ring-inset ${theme.accentBadge}`}
                >
                  On Duty
                </span>
              </header>

              <div className="relative flex flex-col gap-1.5 px-2.5 py-2">
                {stats.map((stat) => (
                  <TeamSummaryStat key={stat.label} {...stat} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
