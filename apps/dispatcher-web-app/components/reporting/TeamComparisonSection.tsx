import type { TeamComparisonStats } from '@/lib/reporting/types'

export default function TeamComparisonSection({ teams }: { teams: TeamComparisonStats[] }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20">
      <div className="mb-5">
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">Team Comparison</h2>
        <p className="mt-1 text-xs text-slate-500">Workload and performance across operational teams.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {teams.map((team) => (
          <div
            key={team.team}
            className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
          >
            <p className="text-lg font-black text-primary-300">{team.team}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Total</dt>
                <dd className="font-bold tabular-nums text-slate-100">{team.total}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Resolved</dt>
                <dd className="font-bold tabular-nums text-emerald-400">{team.resolved}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Active</dt>
                <dd className="font-bold tabular-nums text-amber-300">{team.active}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Avg response</dt>
                <dd className="font-semibold text-cyan-300">{team.avgResponseTime}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Avg resolution</dt>
                <dd className="font-semibold text-slate-200">{team.avgResolutionTime}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  )
}
