'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import ReportSubNav from '@/components/reporting/ReportSubNav'

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-full flex-col">
        <ReportSubNav />
        {children}
      </div>
    </ProtectedRoute>
  )
}
