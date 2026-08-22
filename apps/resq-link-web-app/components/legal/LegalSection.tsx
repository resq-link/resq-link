type LegalSectionProps = {
  title: string
  children: React.ReactNode
}

export default function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7">{children}</div>
    </section>
  )
}
