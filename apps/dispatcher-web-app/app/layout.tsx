import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import { AuthProvider } from '@/contexts/AuthContext'
import { OperationalTeamProvider } from '@/contexts/OperationalTeamContext'
import { PriorityAlertProvider } from '@/contexts/PriorityAlertContext'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RESQ-Link - Emergency Response System',
  description: 'Live incident monitoring and management system',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/branding/resq-link-icon.png', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.className} antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <OperationalTeamProvider>
            <PriorityAlertProvider>
              <Navigation>
                <main className="page-enter min-h-0 flex flex-col h-full">
                  {children}
                </main>
              </Navigation>
            </PriorityAlertProvider>
          </OperationalTeamProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

