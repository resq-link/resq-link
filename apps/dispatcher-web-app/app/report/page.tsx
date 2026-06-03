'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  MapPin,
  PieChart,
  ShieldAlert,
  Users,
} from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import CommandBar from '@/components/CommandBar'
import ReportDateFilters from '@/components/reporting/ReportDateFilters'
import KpiCard from '@/components/reporting/KpiCard'
import BreakdownBars from '@/components/reporting/BreakdownBars'
import TrendChart from '@/components/reporting/TrendChart'
import type { TeamOnDuty } from '@packages/firebase'
import type { DatePreset } from '@/lib/reporting/types'
import { applyPreset } from '@/lib/reporting/dates'
import { PRIORITY_LABELS } from '@/lib/reporting/constants'
import { filterIncidents, formatIncidentDateTime } from '@/lib/reporting/incidents'
import { computeReportAnalytics, createDailyTrend } from '@/lib/reporting/analytics'
import { useReportIncidents } from '@/lib/reporting/useReportIncidents'

export default function ReportPage() {
  const { incidents, isLoading } = useReportIncidents()
  const [preset, setPreset] = useState<DatePreset>('30d')
  const [selectedTeam, setSelectedTeam] = useState<TeamOnDuty | 'all'>('all')
  const [fromDate, setFromDate] = useState(() => applyPreset('30d').fromDate)
  const [toDate, setToDate] = useState(() => applyPreset('30d').toDate)

  const filteredIncidents = useMemo(
    () =>
      filterIncidents(
        incidents,
        {
          fromDate,
          toDate,
          selectedTeam,
          incidentType: 'all',
        },
        { reportEligibleOnly: true }
      ),
    [incidents, selectedTeam, fromDate, toDate]
  )

  const analytics = useMemo(() => computeReportAnalytics(filteredIncidents), [filteredIncidents])
  const trendPoints = useMemo(() => createDailyTrend(filteredIncidents, fromDate, toDate), [filteredIncidents, fromDate, toDate])

  return (
    <div className="flex h-full flex-col">
      <CommandBar
        pageName="Reports"
        description="Historical incident analytics and operational trends"
        statsCategory="Selected Range"
        stats={[
          { label: 'Incidents', value: isLoading ? '...' : analytics.total, highlight: true },
          { label: 'Resolved', value: isLoading ? '...' : analytics.resolved },
          { label: 'High Risk', value: isLoading ? '...' : analytics.criticalOrHigh },
        ]}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <ReportDateFilters
            preset={preset}
            fromDate={fromDate}
            toDate={toDate}
            selectedTeam={selectedTeam}
            onPresetChange={setPreset}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onTeamChange={setSelectedTeam}
            title="Analytics Dashboard"
            description="Filter by date and team to review workload, risk, resolution, and hotspot trends."
          />

          {isLoading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 py-16 text-center shadow-xl shadow-black/20">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary-500" />
              <p className="mt-4 text-sm font-semibold text-slate-400">Loading historical incidents...</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Total Incidents" value={analytics.total} helper="Cases recorded in the selected range." icon={Activity} />
                <KpiCard label="Resolution Rate" value={`${analytics.resolvedRate}%`} helper={`${analytics.resolved} resolved, ${analytics.unresolved} unresolved.`} icon={CheckCircle2} tone="blue" />
                <KpiCard label="High Risk Cases" value={analytics.criticalOrHigh} helper="Critical and high-priority incidents." icon={ShieldAlert} tone="red" />
                <KpiCard label="External Agency" value={analytics.externalAgency} helper="Incidents requiring external agency support." icon={Users} tone="amber" />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <TrendChart points={trendPoints} />
                <BreakdownBars title="By Priority" subtitle="Risk distribution for selected records." items={analytics.byPriority} />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <BreakdownBars title="By Incident Type" subtitle="Most common categories." items={analytics.byCategory} />
                <BreakdownBars title="By Status" subtitle="Operational progress and closure state." items={analytics.byStatus} />
                <BreakdownBars title="By Team" subtitle="Team workload distribution." items={analytics.byTeam} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-primary-300">
                        <MapPin size={18} aria-hidden />
                        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">Incident Hotspots</h2>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Locations with repeated reports in the selected range.</p>
                    </div>
                    <PieChart className="text-slate-600" size={22} aria-hidden />
                  </div>

                  {analytics.byLocation.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-500">
                      No location records in this range.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.byLocation.slice(0, 6).map((item, index) => (
                        <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-xs font-black text-primary-300">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-200">{item.label}</p>
                            <p className="text-xs text-slate-500">{item.value} incident{item.value === 1 ? '' : 's'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-primary-300">
                        <Clock3 size={18} aria-hidden />
                        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">Recent Historical Records</h2>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Latest matching incidents from the selected range.</p>
                    </div>
                    <BarChart3 className="text-slate-600" size={22} aria-hidden />
                  </div>

                  {analytics.latest.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-500">
                      No incident records match the selected filters.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.latest.map((incident) => (
                        <div key={incident.id ?? incident.referenceNumber} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-black text-slate-100">{incident.referenceNumber}</p>
                                <StatusBadge status={incident.status} />
                              </div>
                              <p className="mt-2 truncate text-sm font-semibold text-slate-300">{incident.incidentSubtypeLabel}</p>
                              <p className="mt-1 truncate text-xs text-slate-500">{incident.locationText}</p>
                            </div>
                            <div className="shrink-0 text-left sm:text-right">
                              <p className="text-xs font-semibold text-slate-300">{formatIncidentDateTime(incident)}</p>
                              <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                {incident.teamOnDuty ?? 'No team'} / {PRIORITY_LABELS[incident.priority]}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {analytics.criticalOrHigh > 0 && (
                <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={20} aria-hidden />
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-[0.18em] text-amber-100">Operational Note</h2>
                      <p className="mt-2 text-sm text-amber-100/80">
                        This range contains {analytics.criticalOrHigh} high-risk incident{analytics.criticalOrHigh === 1 ? '' : 's'}.
                        Review priority mix, hotspot recurrence, and external agency demand before finalizing the report.
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
