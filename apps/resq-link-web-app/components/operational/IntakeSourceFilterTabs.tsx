'use client'

import { Filter, Keyboard, MessageSquare, Smartphone } from 'lucide-react'

export type IntakeSourceTab = 'all' | 'app' | 'sms' | 'manual'

type IntakeSourceFilterTabsProps = {
  activeTab: IntakeSourceTab
  counts: Record<IntakeSourceTab, number>
  onChange: (tab: IntakeSourceTab) => void
  variant?: 'panel' | 'toolbar'
}

const TABS: Array<{
  id: IntakeSourceTab
  label: string
  icon: React.ReactNode
}> = [
  { id: 'all', label: 'All', icon: <Filter className="h-4 w-4" /> },
  { id: 'app', label: 'App', icon: <Smartphone className="h-4 w-4" /> },
  { id: 'sms', label: 'SMS/Call', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'manual', label: 'Manual', icon: <Keyboard className="h-4 w-4" /> },
]

const ACTIVE_TAB_CLASSES = [
  'bg-slate-950 text-white border-t border-x border-slate-800 translate-y-px z-10',
  'shadow-[0_-4px_12px_rgba(0,0,0,0.5)]',
  "before:content-[''] before:absolute before:bottom-0 before:-left-3 before:h-3 before:w-3",
  'before:bg-[radial-gradient(circle_at_0_0,transparent_11px,#1e293b_11px,#1e293b_12.5px,#020617_12.5px)]',
  "after:content-[''] after:absolute after:bottom-0 after:-right-3 after:h-3 after:w-3",
  'after:bg-[radial-gradient(circle_at_100%_0,transparent_11px,#1e293b_11px,#1e293b_12.5px,#020617_12.5px)]',
].join(' ')

const INACTIVE_TAB_CLASSES =
  'text-slate-500 hover:text-slate-300 hover:bg-slate-900/40 border-t border-x border-transparent'

export default function IntakeSourceFilterTabs({
  activeTab,
  counts,
  onChange,
  variant = 'panel',
}: IntakeSourceFilterTabsProps) {
  const isToolbar = variant === 'toolbar'

  const tabButtons = TABS.map((tab) => {
    const isActive = activeTab === tab.id
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className={[
          'relative flex items-center gap-2 rounded-t-lg px-4 py-[14px] text-xs font-bold',
          'transition-[background-color,color,transform] duration-200',
          'focus:outline-none focus-visible:outline-none',
          isActive ? ACTIVE_TAB_CLASSES : INACTIVE_TAB_CLASSES,
        ].join(' ')}
      >
        {tab.icon}
        <span>{tab.label}</span>
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
            isActive ? 'bg-primary-600 text-white' : 'bg-slate-900 text-slate-500'
          }`}
        >
          {counts[tab.id]}
        </span>
      </button>
    )
  })

  if (isToolbar) {
    return <div className="flex min-w-0 flex-1 items-end gap-0">{tabButtons}</div>
  }

  return (
    <div className="shrink-0 border-b border-slate-800 bg-slate-900/30 px-2 pt-1">
      <div className="flex items-end gap-0 overflow-x-auto no-scrollbar">{tabButtons}</div>
    </div>
  )
}

export function categorizeIntakeQueueItemSource(
  item: { channel: 'incident' | 'emergency_report'; rawIncident?: { source?: string } | null },
  smsCallSources: readonly string[],
): IntakeSourceTab {
  if (item.channel === 'emergency_report') return 'app'
  const source = item.rawIncident?.source ?? 'manual'
  if (source === 'civilian_app') return 'app'
  if (smsCallSources.includes(source)) return 'sms'
  return 'manual'
}
