import { buildLinePath } from '@/lib/reporting/analytics'
import type { ChartPoint } from '@/lib/reporting/types'

export default function TrendChart({ points }: { points: ChartPoint[] }) {
  const width = 640
  const height = 190
  const path = buildLinePath(points, width, height)
  const max = Math.max(...points.map((point) => point.count), 0)
  const total = points.reduce((sum, point) => sum + point.count, 0)

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20 lg:col-span-2">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">Incident Volume Trend</h2>
          <p className="mt-1 text-xs text-slate-500">Daily incidents recorded in the selected date range.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Total</p>
            <p className="text-lg font-black text-slate-100">{total}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Peak Day</p>
            <p className="text-lg font-black text-slate-100">{max}</p>
          </div>
        </div>
      </div>

      {points.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 px-4 py-16 text-center text-sm text-slate-500">
          Choose a date range to show the trend chart.
        </p>
      ) : (
        <div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full overflow-visible" role="img" aria-label="Incident trend line chart">
              <defs>
                <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((line) => (
                <line
                  key={line}
                  x1="0"
                  x2={width}
                  y1={(height / 4) * line + 8}
                  y2={(height / 4) * line + 8}
                  stroke="rgb(30 41 59)"
                  strokeDasharray="4 8"
                />
              ))}
              {path && (
                <>
                  <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill="url(#trendFill)" />
                  <path d={path} fill="none" stroke="rgb(52 211 153)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}
              {points.map((point, index) => {
                const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
                const y = height - (point.count / Math.max(max, 1)) * (height - 16) - 8
                return (
                  <circle
                    key={point.dateKey}
                    cx={x}
                    cy={y}
                    r={point.count > 0 ? 4 : 2.5}
                    className="fill-slate-950 stroke-primary-300"
                    strokeWidth="3"
                  />
                )
              })}
            </svg>
          </div>
          <div className="mt-3 flex justify-between gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            <span>{points[0]?.label}</span>
            <span>{points[Math.floor(points.length / 2)]?.label}</span>
            <span>{points[points.length - 1]?.label}</span>
          </div>
        </div>
      )}
    </section>
  )
}
