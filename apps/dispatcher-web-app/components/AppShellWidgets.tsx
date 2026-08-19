'use client'

import dynamic from 'next/dynamic'

const CriticalAlertModal = dynamic(() => import('@/components/CriticalAlertModal'), {
  ssr: false,
})
const AudioUnlockBanner = dynamic(() => import('@/components/AudioUnlockBanner'), {
  ssr: false,
})
const IncidentCallNotification = dynamic(
  () => import('@/components/IncidentCallNotification'),
  { ssr: false }
)
const OperationalChatWidget = dynamic(
  () => import('@/components/OperationalChatWidget'),
  { ssr: false }
)
const AgentAssistant = dynamic(() => import('@/components/AgentAssistant'), {
  ssr: false,
})

export default function AppShellWidgets() {
  return (
    <>
      <CriticalAlertModal />
      <AudioUnlockBanner />
      <IncidentCallNotification />
      <OperationalChatWidget />
      <AgentAssistant />
    </>
  )
}
