'use client'

import { memo } from 'react'
import dynamic from 'next/dynamic'
import DeferredOperationalChatWidget from '@/components/DeferredOperationalChatWidget'
import DeferredAgentAssistant from '@/components/DeferredAgentAssistant'

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

function AppShellWidgets() {
  return (
    <>
      <CriticalAlertModal />
      <AudioUnlockBanner />
      <IncidentCallNotification />
      <DeferredOperationalChatWidget />
      <DeferredAgentAssistant />
    </>
  )
}

export default memo(AppShellWidgets)
