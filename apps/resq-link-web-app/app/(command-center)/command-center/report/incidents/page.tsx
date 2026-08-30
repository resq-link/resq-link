'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileSpreadsheet, Printer, RotateCcw, FileText } from 'lucide-react'
import IncidentReportTable from '@/components/reporting/IncidentReportTable'
import TeamSummaryCards from '@/components/reporting/TeamSummaryCards'
import type { IncidentCategory } from '@packages/firebase'
import type { ReportFilters } from '@/lib/reporting/types'
import { INCIDENT_TYPE_OPTIONS } from '@/lib/reporting/constants'
import { filterIncidents, toExportRow } from '@/lib/reporting/incidents'
import {
  computeReportAnalytics,
  computeTeamComparison,
  computeTeamSummaryCards,
} from '@/lib/reporting/analytics'
import { useReportIncidents } from '@/lib/reporting/useReportIncidents'
import { filtersForTeamSummary, getDefaultReportFilters } from '@/lib/reporting/filters'
import { buildExportBundle } from '@/lib/reporting/export'
import { printIncidentReport } from '@/lib/reporting/printReport'
import { useOperationalTeams } from '@/contexts/OperationalTeamContext'
import InlineLoader from '@/components/InlineLoader'
import { buildTeamOptions, teamReactKey } from '@/lib/operational/teamUtils'

const inputClass =
  'h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-sm font-medium text-slate-100 outline-none transition-colors focus:border-primary-400'
const selectClass =
  'h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-sm font-medium text-slate-100 outline-none transition-colors focus:border-primary-400'
const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500'
const fieldClass = 'flex min-w-0 flex-1 flex-col'
const actionBtnClass =
  'inline-flex h-9 w-full flex-1 items-center justify-center gap-1.5 rounded-lg border px-3.5 text-[11px] font-bold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50'

export default function IncidentReportsExportPage() {
  const { incidents, isLoading } = useReportIncidents()
  const { teams } = useOperationalTeams()

  const teamOptions = useMemo(() => buildTeamOptions(teams), [teams])

  const [draftFilters, setDraftFilters] = useState<ReportFilters>(getDefaultReportFilters)
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  const didAutoApplyReport = useRef(false)

  useEffect(() => {
    if (isLoading || didAutoApplyReport.current) return
    didAutoApplyReport.current = true
    setAppliedFilters((current) => current ?? getDefaultReportFilters())
  }, [isLoading])

  const filteredIncidents = useMemo(() => {
    if (!appliedFilters) return []
    return filterIncidents(incidents, appliedFilters, { reportEligibleOnly: true })
  }, [incidents, appliedFilters])

  const exportRows = useMemo(() => filteredIncidents.map(toExportRow), [filteredIncidents])

  const summaryFilters = appliedFilters ?? draftFilters

  const teamSummaryCards = useMemo(
    () => computeTeamSummaryCards(incidents, filtersForTeamSummary(summaryFilters), teamOptions),
    [incidents, summaryFilters.fromDate, summaryFilters.toDate, summaryFilters.incidentType, teamOptions]
  )

  const exportBundle = useMemo(() => {
    if (!appliedFilters) return null
    const analytics = computeReportAnalytics(filteredIncidents, teamOptions)
    const teamComparison = computeTeamComparison(filteredIncidents, teamOptions)
    return buildExportBundle(
      filteredIncidents,
      analytics,
      teamComparison,
      appliedFilters,
      teamSummaryCards
    )
  }, [filteredIncidents, appliedFilters, teamSummaryCards])

  const updateDraft = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
    setDraftFilters((current) => ({ ...current, [key]: value }))
  }

  const handleGenerateReport = () => {
    setAppliedFilters({ ...draftFilters })
  }

  const handleResetFilters = () => {
    const defaults = getDefaultReportFilters()
    setDraftFilters(defaults)
    setAppliedFilters({ ...defaults })
  }

  const handleExportPdf = async () => {
    if (!exportBundle) return
    setExporting('pdf')
    try {
      const { exportPdf } = await import('@/lib/reporting/exportPdf')
      await exportPdf(exportBundle)
    } finally {
      setExporting(null)
    }
  }

  const handleExportExcel = async () => {
    if (!exportBundle) return
    setExporting('excel')
    try {
      const { exportExcel } = await import('@/lib/reporting/exportExcel')
      await exportExcel(exportBundle)
    } finally {
      setExporting(null)
    }
  }

  const handlePrint = () => {
    if (!exportBundle) return
    printIncidentReport(exportBundle)
  }

  const hasGeneratedReport = appliedFilters != null
  const canExport = hasGeneratedReport && exportRows.length > 0 && !isLoading

  return (
    <>
      <div className="report-screen flex h-full flex-col">
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar print:hidden">
          <div className="mx-auto flex max-w-[96rem] flex-col gap-3">
            <header className="border-b border-slate-800/80 pb-2">
              <h1 className="text-lg font-black tracking-tight text-slate-100 sm:text-xl">
                Incident Reports & Export Center
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Completed and resolved incident records for reporting and export.
              </p>
            </header>

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3 shadow-md shadow-black/10">
              <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:flex lg:flex-row lg:items-end">
                <label className={fieldClass}>
                  <span className={labelClass}>From Date</span>
                  <input
                    type="date"
                    value={draftFilters.fromDate}
                    onChange={(event) => updateDraft('fromDate', event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>To Date</span>
                  <input
                    type="date"
                    value={draftFilters.toDate}
                    onChange={(event) => updateDraft('toDate', event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>Assigned Team</span>
                  <select
                    value={draftFilters.selectedTeam}
                    onChange={(event) =>
                      updateDraft('selectedTeam', event.target.value)
                    }
                    className={selectClass}
                  >
                    <option value="all">All Teams</option>
                    {teams.map((team, index) => (
                      <option key={teamReactKey(team, index)} value={team.code}>
                        {team.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>Incident Type</span>
                  <select
                    value={draftFilters.incidentType}
                    onChange={(event) =>
                      updateDraft('incidentType', event.target.value as IncidentCategory | 'all')
                    }
                    className={selectClass}
                  >
                    {INCIDENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex w-full gap-2 sm:col-span-2 lg:col-span-1 lg:flex-1">
                  <button
                    type="button"
                    onClick={handleGenerateReport}
                    disabled={isLoading}
                    className={`${actionBtnClass} border-primary-500/50 bg-primary-500/15 text-primary-200 hover:bg-primary-500/25`}
                  >
                    <FileText size={14} aria-hidden />
                    Generate Report
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className={`${actionBtnClass} border-slate-700 bg-slate-950/50 text-slate-300 hover:bg-slate-800`}
                  >
                    <RotateCcw size={14} aria-hidden />
                    Reset
                  </button>
                </div>
              </div>
            </section>

            <TeamSummaryCards cards={teamSummaryCards} />

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5 shadow-md shadow-black/10">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Export Actions
              </p>
              <div className="flex w-full gap-2">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={!canExport || exporting != null}
                  className={`${actionBtnClass} border-slate-700 bg-slate-950 text-slate-200 hover:border-primary-500/50 hover:bg-slate-800`}
                >
                  <Download size={14} aria-hidden />
                  {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={!canExport || exporting != null}
                  className={`${actionBtnClass} border-slate-700 bg-slate-950 text-slate-200 hover:border-primary-500/50 hover:bg-slate-800`}
                >
                  <FileSpreadsheet size={14} aria-hidden />
                  {exporting === 'excel' ? 'Exporting…' : 'Export Excel'}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!canExport}
                  className={`${actionBtnClass} border-primary-500/40 bg-primary-500/10 text-primary-200 hover:bg-primary-500/20`}
                >
                  <Printer size={14} aria-hidden />
                  Print Report
                </button>
              </div>
              {!hasGeneratedReport && !isLoading && (
                <p className="mt-2 text-xs text-slate-500">
                  Generate a report to enable export and print.
                </p>
              )}
              {hasGeneratedReport && exportRows.length === 0 && !isLoading && (
                <p className="mt-2 text-xs text-amber-400/90">
                  No completed incidents match the selected filters. Adjust filters and generate again.
                </p>
              )}
            </section>

            <section className="min-h-0 flex-1 rounded-xl border border-slate-800 bg-slate-900/70 p-3 shadow-md shadow-black/10">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-100">
                  Report Preview
                </h2>
                {hasGeneratedReport && (
                  <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {exportRows.length} record{exportRows.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {isLoading ? (
                <InlineLoader label="Loading records..." />
              ) : !hasGeneratedReport ? (
                <p className="rounded-lg border border-dashed border-slate-800 bg-slate-950/50 px-4 py-10 text-center text-sm text-slate-500">
                  Set filters and click Generate Report to preview completed incident records.
                </p>
              ) : (
                <IncidentReportTable rows={exportRows} />
              )}
            </section>
          </div>
        </div>
      </div>

    </>
  )
}
