import CommandCenterGuard from '@/components/auth/CommandCenterGuard'
import Navigation from '@/components/Navigation'
import { DispatcherDataProvider } from '@/contexts/DispatcherDataContext'
import { OperationalTeamProvider } from '@/contexts/OperationalTeamContext'
import { PriorityAlertProvider } from '@/contexts/PriorityAlertContext'

export default function CommandCenterLayout({ children }: { children: React.ReactNode }) {
  return (
    <CommandCenterGuard>
      <DispatcherDataProvider>
        <OperationalTeamProvider>
          <PriorityAlertProvider>
            <Navigation>
              <main className="min-h-0 flex flex-col h-full">{children}</main>
            </Navigation>
          </PriorityAlertProvider>
        </OperationalTeamProvider>
      </DispatcherDataProvider>
    </CommandCenterGuard>
  )
}
