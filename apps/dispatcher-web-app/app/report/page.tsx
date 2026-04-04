'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import StatusBadge from '@/components/StatusBadge'
import { subscribeToIncidents, type IncidentRecord, type TeamOnDuty } from '@packages/firebase'
import { useAuth } from '@/contexts/AuthContext'

const teamOnDutyOptions: TeamOnDuty[] = ['Whiskey', 'X-ray', 'Yankee', 'Zulu']
type RangeBasis = 'incidentDate' | 'dateOfDuty'

function getDutyDate(incident: IncidentRecord, basis: RangeBasis): string {
  const value = basis === 'incidentDate' ? incident.incidentDate : incident.dateOfDuty
  return typeof value === 'string' ? value : ''
}

function formatIncidentDateTime(incident: IncidentRecord): string {
  const date = incident.incidentDate ?? incident.dateOfDuty ?? ''
  const time = incident.incidentTime ?? ''
  if (!date) return '—'
  return time ? `${date} ${time}` : date
}

export default function ReportPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [incidents, setIncidents] = useState<IncidentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [selectedTeam, setSelectedTeam] = useState<TeamOnDuty | 'all'>('all')
  const [rangeBasis, setRangeBasis] = useState<RangeBasis>('dateOfDuty')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    const unsubscribe = subscribeToIncidents((items) => {
      setIncidents(items)
      setIsLoading(false)
    }, 600)

    return () => unsubscribe()
  }, [user, router])

  const filteredIncidents = useMemo(() => {
    const from = fromDate ? fromDate : null
    const to = toDate ? toDate : null

    return incidents.filter((incident) => {
      if (selectedTeam !== 'all' && incident.teamOnDuty !== selectedTeam) {
        return false
      }

      const dutyDate = getDutyDate(incident, rangeBasis)
      if (!dutyDate) return false

      if (from && dutyDate < from) return false
      if (to && dutyDate > to) return false

      return true
    })
  }, [incidents, selectedTeam, rangeBasis, fromDate, toDate])

  const teamTotals = useMemo(() => {
    const totals: Record<TeamOnDuty, number> = {
      Whiskey: 0,
      'X-ray': 0,
      Yankee: 0,
      Zulu: 0,
    }

    filteredIncidents.forEach((incident) => {
      const team = incident.teamOnDuty
      if (!team) return
      totals[team] += 1
    })

    return totals
  }, [filteredIncidents])

  const sortedIncidents = useMemo(() => {
    return [...filteredIncidents].sort((a, b) => {
      const aTime =
        a.createdAt instanceof Date
          ? a.createdAt.getTime()
          : a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt
            ? (a.createdAt as any).toDate().getTime()
            : 0
      const bTime =
        b.createdAt instanceof Date
          ? b.createdAt.getTime()
          : b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt
            ? (b.createdAt as any).toDate().getTime()
            : 0
      return bTime - aTime
    })
  }, [filteredIncidents])

  const hasActiveFilters = selectedTeam !== 'all' || rangeBasis !== 'dateOfDuty' || Boolean(fromDate) || Boolean(toDate)

  const clearFilters = () => {
    setSelectedTeam('all')
    setRangeBasis('dateOfDuty')
    setFromDate('')
    setToDate('')
  }

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-5">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100">Incident Reports</h1>
          <p className="mt-1 text-sm text-slate-400">View and filter incident records by team and date.</p>
        </div>

        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Team on Duty</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value as TeamOnDuty | 'all')}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All teams</option>
                {teamOnDutyOptions.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Date Type</label>
              <select
                value={rangeBasis}
                onChange={(e) => setRangeBasis(e.target.value as RangeBasis)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="dateOfDuty">Duty Date</option>
                <option value="incidentDate">Incident Date</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1 flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-4 hover:border-slate-700 transition-colors">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Incidents</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{isLoading ? '...' : filteredIncidents.length}</p>
          </div>
          {teamOnDutyOptions.map((team) => (
            <div
              key={team}
              className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-4 hover:border-slate-700 transition-colors"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{team}</p>
              <p className="mt-2 text-2xl font-bold text-slate-100">{isLoading ? '...' : teamTotals[team]}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-slate-100">
            Incidents ({isLoading ? '...' : filteredIncidents.length})
            </h2>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Sorted by latest created time</p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="text-slate-400 text-lg mt-4">Loading incidents...</p>
            </div>
          ) : sortedIncidents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 py-12 px-4 text-center">
              <p className="text-slate-200 text-lg font-semibold">No incidents match your current filters</p>
              <p className="text-slate-500 text-sm mt-2">Try changing the selected team or date range.</p>
              {hasActiveFilters && (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="border border-slate-800 rounded-lg p-6 hover:shadow-md hover:shadow-black/30 transition-shadow bg-slate-950/60"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-slate-100">
                          {incident.referenceNumber}
                        </h3>
                        <StatusBadge status={incident.status} />
                        <span className="text-xs font-semibold text-slate-300">
                          Priority: {incident.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-slate-400 mb-2">{incident.incidentSubtypeLabel}</p>
                      <p className="text-slate-500 text-sm">{incident.locationText}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-2 text-sm text-slate-600">
                    <div>
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Team on Duty</span>
                      <p className="mt-1 font-semibold text-slate-100">{incident.teamOnDuty ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Incident Date/Time</span>
                      <p className="mt-1 font-semibold text-slate-100">
                        {formatIncidentDateTime(incident)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Duty Date</span>
                      <p className="mt-1 font-semibold text-slate-100">{incident.dateOfDuty ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Schedule of Duty</span>
                      <p className="mt-1 font-semibold text-slate-100">{incident.scheduleOfDuty ?? '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
