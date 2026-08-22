'use client'

import ReportSubNav from '@/components/reporting/ReportSubNav'

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <ReportSubNav />
      {children}
    </div>
  )
}
