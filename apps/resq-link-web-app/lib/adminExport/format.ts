import type { AdminExportColumn, AdminExportPayload } from './types'
import { formatReportTimestamp } from './reportHeader'

export function formatExportCell(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || '—'
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '—'
    return value.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  // Never stringify raw objects into exports.
  return '—'
}

export function buildExportMatrix<T>(
  rows: T[],
  columns: AdminExportColumn<T>[]
): { headers: string[]; matrix: string[][] } {
  const headers = columns.map((column) => column.header)
  const matrix = rows.map((row) => columns.map((column) => formatExportCell(column.accessor(row))))
  return { headers, matrix }
}

export function buildExportPayload<T>(options: {
  title: string
  fileSlug: string
  sheetName?: string
  rows: T[]
  columns: AdminExportColumn<T>[]
  filtersSummary?: string[]
  orientation?: AdminExportPayload['orientation']
  generatedAt?: Date
}): AdminExportPayload {
  const { headers, matrix } = buildExportMatrix(options.rows, options.columns)
  return {
    title: options.title,
    fileSlug: options.fileSlug,
    sheetName: options.sheetName || options.title.slice(0, 31),
    headers,
    rows: matrix,
    filtersSummary: options.filtersSummary?.filter(Boolean),
    generatedAt: options.generatedAt || new Date(),
    orientation: options.orientation || 'portrait',
  }
}

/** Compact operational timestamp used in exports (`23 AUG 2026 · 1:59 PM`). */
export function formatGeneratedLabel(date: Date): string {
  return formatReportTimestamp(date)
}

export function formatFileDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function buildExportFileName(fileSlug: string, extension: 'xlsx' | 'pdf', date = new Date()): string {
  const safe = fileSlug
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
  return `RESQ-Link-${safe}-${formatFileDate(date)}.${extension}`
}
