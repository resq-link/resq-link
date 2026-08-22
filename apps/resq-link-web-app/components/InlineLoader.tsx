export default function InlineLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <p className="flex items-center justify-center gap-2 py-10 text-xs font-medium text-slate-500">
      <span
        className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border border-slate-600 border-t-primary-400"
        aria-hidden
      />
      {label}
    </p>
  )
}
