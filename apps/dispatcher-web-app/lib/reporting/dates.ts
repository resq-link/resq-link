import type { DatePreset } from './types'

export function formatDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateInput(value: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function startOfQuarter(date: Date): Date {
  const quarterMonth = Math.floor(date.getMonth() / 3) * 3
  return new Date(date.getFullYear(), quarterMonth, 1)
}

export function applyPreset(preset: DatePreset): { fromDate: string; toDate: string } {
  const today = startOfDay(new Date())
  const toDate = formatDateInput(today)

  switch (preset) {
    case '7d':
      return { fromDate: formatDateInput(addDays(today, -6)), toDate }
    case '30d':
      return { fromDate: formatDateInput(addDays(today, -29)), toDate }
    case '90d':
      return { fromDate: formatDateInput(addDays(today, -89)), toDate }
    case 'month':
      return { fromDate: formatDateInput(startOfMonth(today)), toDate }
    case 'quarter':
      return { fromDate: formatDateInput(startOfQuarter(today)), toDate }
    case 'year':
      return { fromDate: `${today.getFullYear()}-01-01`, toDate }
    case 'all':
      return { fromDate: '', toDate: '' }
    case 'custom':
    default:
      return { fromDate: '', toDate: '' }
  }
}

export function formatDisplayDate(value: unknown): string {
  const date = toDate(value)
  if (!date) return '—'
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

export function getTimestamp(value: unknown): number {
  const date = toDate(value)
  return date ? date.getTime() : 0
}

export function formatDurationSeconds(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

/** Report/export tables — never show em dash for missing durations. */
export function formatReportDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return 'Not Available'
  return formatDurationSeconds(seconds)
}

/** Report/export tables — never show em dash for missing dates. */
export function formatReportDisplayDate(value: unknown): string {
  const date = toDate(value)
  if (!date) return 'Not Available'
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
