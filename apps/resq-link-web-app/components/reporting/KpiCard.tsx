export default function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'emerald',
}: {
  label: string
  value: string | number
  helper: string
  icon: React.ElementType
  tone?: 'emerald' | 'amber' | 'red' | 'blue'
}) {
  const toneClass = {
    emerald: 'border-primary-500/20 bg-primary-500/10 text-primary-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    red: 'border-red-500/20 bg-red-500/10 text-red-300',
    blue: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
  }[tone]

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black tabular-nums text-slate-100">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${toneClass}`}>
          <Icon size={22} aria-hidden />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-400">{helper}</p>
    </div>
  )
}
