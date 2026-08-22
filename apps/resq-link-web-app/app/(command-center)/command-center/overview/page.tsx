import OverviewLoader from './OverviewLoader'

export default function OverviewPage() {
  if (process.env.NODE_ENV === 'development') {
    console.time('overview:server-render')
  }

  const page = <OverviewLoader />

  if (process.env.NODE_ENV === 'development') {
    console.timeEnd('overview:server-render')
  }

  return page
}
