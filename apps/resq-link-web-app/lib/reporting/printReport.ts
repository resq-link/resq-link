import type { ExportBundle } from './export'
import { buildIncidentReportPrintDocument } from './buildPrintHtml'

function openMaximizedPrintWindow(): Window | null {
  const sw = window.screen.availWidth
  const sh = window.screen.availHeight
  const width = Math.max(sw, sh)
  const height = Math.min(sw, sh)
  const features = `width=${width},height=${height},left=0,top=0,menubar=no,toolbar=no,location=no,status=no`
  const printWindow = window.open('', '_blank', features)
  if (!printWindow) return null

  try {
    printWindow.moveTo(0, 0)
    printWindow.resizeTo(width, height)
  } catch {
    /* Some browsers block resize on pop-ups */
  }

  return printWindow
}

async function tryFullscreenBeforePrint(printWindow: Window): Promise<void> {
  const root = printWindow.document.documentElement
  if (!root.requestFullscreen) return
  try {
    await root.requestFullscreen()
  } catch {
    /* Fullscreen may require a user gesture or be blocked */
  }
}

/**
 * Opens a maximized tab with a self-contained report document, then prints it.
 * HTML is generated from export data (not cloned DOM) so content is never blank.
 */
export function printIncidentReport(bundle: ExportBundle): void {
  const html = buildIncidentReportPrintDocument(bundle)

  const printWindow = openMaximizedPrintWindow()
  if (!printWindow) {
    window.alert('Please allow pop-ups for this site to print the report.')
    return
  }

  let returned = false
  const returnToApp = () => {
    if (returned) return
    returned = true
    printWindow.onafterprint = null
    if (printWindow.document.fullscreenElement) {
      void printWindow.document.exitFullscreen?.()
    }
    if (!printWindow.closed) printWindow.close()
    window.focus()
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  printWindow.onafterprint = returnToApp

  // When print preview closes (print or cancel) in browsers without afterprint
  const media = printWindow.matchMedia('print')
  const onPrintModeEnd = (event: MediaQueryListEvent) => {
    if (!event.matches) returnToApp()
  }
  if (media.addEventListener) {
    media.addEventListener('change', onPrintModeEnd, { once: true })
  } else {
    media.addListener(onPrintModeEnd)
  }

  void tryFullscreenBeforePrint(printWindow)
  printWindow.focus()
  printWindow.print()
}
