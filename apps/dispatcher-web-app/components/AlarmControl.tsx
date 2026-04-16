'use client'

import { useAlarm } from '@/contexts/AlarmContext'

export default function AlarmControl() {
  const { isAlarmMuted, setIsAlarmMuted } = useAlarm()
  
  return (
    <button
      type="button"
      onClick={() => setIsAlarmMuted(!isAlarmMuted)}
      className={`inline-flex h-10 items-center gap-3 rounded-lg border px-3 text-sm font-medium transition-colors ${
        isAlarmMuted
          ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
          : 'border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20'
      }`}
      title={isAlarmMuted ? 'Turn alarm on' : 'Turn alarm off'}
      aria-pressed={!isAlarmMuted}
    >
      <span>{isAlarmMuted ? 'Alarm Off' : 'Alarm On'}</span>
      <span
        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
          isAlarmMuted ? 'bg-slate-700' : 'bg-red-500/70'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isAlarmMuted ? 'translate-x-1' : 'translate-x-5'
          }`}
        />
      </span>
    </button>
  )
}

