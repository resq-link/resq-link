'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, FileSpreadsheet, FileText, Loader2, Printer } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'
import {
  buildExportPayload,
  exportAdminTableExcel,
  exportAdminTablePdf,
  printAdminTable,
  type AdminExportColumn,
  type AdminExportOrientation,
} from '@/lib/adminExport'

type ExportAction = 'print' | 'excel' | 'pdf'

const MENU_WIDTH = 176

type MenuCoords = { top: number; left: number }

export function TableExportMenu<T>({
  title,
  fileSlug,
  sheetName,
  columns,
  getRows,
  filtersSummary,
  orientation = 'portrait',
  disabled = false,
  className = '',
}: {
  title: string
  fileSlug: string
  sheetName?: string
  columns: AdminExportColumn<T>[]
  /** Resolve all filtered rows (across pagination). */
  getRows: () => Promise<T[]>
  filtersSummary?: string[]
  orientation?: AdminExportOrientation
  disabled?: boolean
  className?: string
}) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<MenuCoords | null>(null)
  const [busy, setBusy] = useState<ExportAction | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    const trigger = triggerRef.current?.getBoundingClientRect()
    if (!trigger) return
    const left = Math.max(
      8,
      Math.min(trigger.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)
    )
    const top = Math.min(trigger.bottom + 4, window.innerHeight - 160)
    setCoords({ top, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const runExport = async (action: ExportAction) => {
    if (busy || disabled) return
    setBusy(action)
    setOpen(false)
    try {
      const rows = await getRows()
      if (!rows.length) {
        toast.warning('No records available to export.')
        return
      }
      const payload = buildExportPayload({
        title,
        fileSlug,
        sheetName,
        rows,
        columns,
        filtersSummary,
        orientation,
      })

      if (action === 'print') {
        printAdminTable(payload)
        toast.success('Print view ready.')
      } else if (action === 'excel') {
        await exportAdminTableExcel(payload)
        toast.success('Excel export completed.')
      } else {
        await exportAdminTablePdf(payload)
        toast.success('PDF export completed.')
      }
    } catch (error) {
      console.error('Admin table export failed', error)
      toast.error((error as Error).message || 'Unable to export records.')
    } finally {
      setBusy(null)
    }
  }

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={`${title} export options`}
            style={{
              position: 'fixed',
              top: coords?.top ?? 0,
              left: coords?.left ?? 0,
              width: MENU_WIDTH,
              visibility: coords ? 'visible' : 'hidden',
              zIndex: 60,
            }}
            className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface py-1 shadow-admin-panel animate-admin-menu-in"
          >
            <ExportMenuItem
              icon={Printer}
              label="Print"
              disabled={Boolean(busy)}
              onClick={() => void runExport('print')}
            />
            <ExportMenuItem
              icon={FileSpreadsheet}
              label="Excel"
              disabled={Boolean(busy)}
              onClick={() => void runExport('excel')}
            />
            <ExportMenuItem
              icon={FileText}
              label="PDF"
              disabled={Boolean(busy)}
              onClick={() => void runExport('pdf')}
            />
          </div>,
          document.body
        )
      : null

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || Boolean(busy)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-admin-border bg-admin-surface px-3 text-sm font-medium text-admin-fg-muted shadow-sm transition-colors duration-150 hover:bg-admin-hover hover:text-admin-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 size={15} className="animate-spin text-primary-500" aria-hidden="true" /> : null}
        {busy ? 'Exporting...' : 'Export'}
        {!busy ? <ChevronDown size={14} aria-hidden="true" className="opacity-70" /> : null}
      </button>
      {menu}
    </div>
  )
}

function ExportMenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Printer
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-admin-fg-muted transition-colors duration-150 hover:bg-admin-hover hover:text-admin-fg disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden="true" className="text-admin-fg-subtle" />
      {label}
    </button>
  )
}
