'use client'

import { memo } from 'react'
import dynamic from 'next/dynamic'
import DeferredOperationalChatWidget from '@/components/DeferredOperationalChatWidget'

const CriticalAlertModal = dynamic(() => import('@/components/CriticalAlertModal'), {
  ssr: false,
})
const AudioUnlockBanner = dynamic(() => import('@/components/AudioUnlockBanner'), {
  ssr: false,
})
const IncomingCallAlertBanner = dynamic(() => import('@/components/calls/IncomingCallAlertBanner'), {
  ssr: false,
})
const DispatcherCallQueueSidebar = dynamic(() => import('@/components/calls/DispatcherCallQueueSidebar'), {
  ssr: false,
})

function AppShellWidgets() {
  return (
    <>
      <CriticalAlertModal />
      <AudioUnlockBanner />
      <IncomingCallAlertBanner />
      <DispatcherCallQueueSidebar />
      <DeferredOperationalChatWidget />
    </>
  )
}

export default memo(AppShellWidgets)
