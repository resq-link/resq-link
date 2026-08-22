'use client'

import dynamic from 'next/dynamic'

const OverviewClient = dynamic(() => import('./OverviewClient'), {
  ssr: false,
})

export default function OverviewLoader() {
  return <OverviewClient />
}
