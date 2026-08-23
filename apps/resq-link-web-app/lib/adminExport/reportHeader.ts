/** Shared visual tokens for Super Admin Print / PDF table reports. */
export const REPORT_BRAND = 'RESQ-LINK'

export const REPORT_COLORS = {
  text: '#111827',
  muted: '#64748b',
  divider: '#d1d5db',
  border: '#e5e7eb',
  altRow: '#f8fafc',
  headerBg: '#111827',
  headerText: '#ffffff',
  paper: '#ffffff',
} as const

/** RGB tuples for jsPDF (same values as REPORT_COLORS). */
export const REPORT_COLORS_RGB = {
  text: [17, 24, 39] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  divider: [209, 213, 219] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  altRow: [248, 250, 252] as [number, number, number],
  headerBg: [17, 24, 39] as [number, number, number],
  headerText: [255, 255, 255] as [number, number, number],
}

const MONTHS_SHORT = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const

/** Compact operational timestamp: `23 AUG 2026 · 1:59 PM` */
export function formatReportTimestamp(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = MONTHS_SHORT[date.getMonth()]
  const year = date.getFullYear()

  let hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const period = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12

  return `${day} ${month} ${year} · ${hours}:${minutes} ${period}`
}

/** Module title for report header (e.g. KYC Review → KYC REVIEW). */
export function formatReportTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toUpperCase()
}
