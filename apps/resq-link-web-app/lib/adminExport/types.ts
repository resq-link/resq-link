export type AdminExportColumn<T> = {
  header: string
  /** Return a printable/exportable string. Avoid objects and secrets. */
  accessor: (row: T) => string
  /** Relative width hint for PDF (optional). */
  width?: number
}

export type AdminExportOrientation = 'portrait' | 'landscape'

export type AdminExportPayload = {
  title: string
  /** Used in filenames, e.g. "Agencies" → RESQ-Link-Agencies-2026-08-23.xlsx */
  fileSlug: string
  /** Excel sheet name (max 31 chars). */
  sheetName?: string
  headers: string[]
  rows: string[][]
  filtersSummary?: string[]
  generatedAt: Date
  orientation?: AdminExportOrientation
}

export type AdminExportGetRowsResult<T> = {
  rows: T[]
}
