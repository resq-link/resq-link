'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, FileSpreadsheet } from 'lucide-react'

const tabs = [
  { href: '/report', label: 'Analytics Dashboard', icon: BarChart3, exact: true },
  { href: '/report/incidents', label: 'Incident Reports & Export', icon: FileSpreadsheet, exact: false },
]

export default function ReportSubNav() {
  const pathname = usePathname()

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-slate-800 bg-slate-900/40 px-4 py-3 sm:px-6 print:hidden"
      data-report-chrome
      aria-label="Reports section"
    >
      {tabs.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${
              isActive
                ? 'border-primary-400 bg-primary-500/15 text-primary-200'
                : 'border-slate-700 bg-slate-950/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
            }`}
          >
            <Icon size={16} aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
