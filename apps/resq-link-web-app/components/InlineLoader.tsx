export default function InlineLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <p className="flex items-center justify-center gap-2 py-10 text-xs font-medium text-admin-fg-subtle">
      <span
        className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border border-admin-fg-subtle/40 border-t-primary-400"
        aria-hidden
      />
      {label}
    </p>
  )
}
