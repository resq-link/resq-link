import type { BreakdownItem } from '@/lib/reporting/types'

export default function BreakdownBars({
  title,
  subtitle,
  items,
}: {
  title: string
  subtitle: string
  items: BreakdownItem[]
}) {
  const max = Math.max(...items.map((item) => item.value), 1)

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20">
      <div className="mb-5">
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-500">
          No records in this range.
        </p>
      ) : (
        <div className="space-y-4">
          {items.slice(0, 8).map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-slate-200">{item.label}</span>
                <span className="font-black tabular-nums text-slate-100">{item.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-300"
                  style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
