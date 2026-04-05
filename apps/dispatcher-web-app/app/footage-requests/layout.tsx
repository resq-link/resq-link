import ProtectedRoute from '@/components/ProtectedRoute'

export default function FootageRequestsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto">{children}</div>
    </ProtectedRoute>
  )
}
