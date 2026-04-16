import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import { AuthProvider } from '@/contexts/AuthContext'
import { AlarmProvider } from '@/contexts/AlarmContext'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RESQ-Link - Emergency Response System',
  description: 'Live incident monitoring and management system',
  icons: {
    icon: '/branding/resq-link-icon.png',
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
          <AlarmProvider>
            <Navigation>
              <main className="page-enter min-h-0 flex flex-col h-full">
                {children}
              </main>
            </Navigation>
          </AlarmProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

