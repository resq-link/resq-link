import { AdminAuthProvider } from '@/contexts/AdminAuthContext'
import { AdminShell } from '@/components/layout/AdminShell'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  )
}
