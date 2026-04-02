'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import {
  createIncident,
  dispatchIncidentResources,
  getAgencyLabel,
  getIncidentResourceMatch,
  subscribeToIncidents,
  subscribeToIncidentTypeRules,
  subscribeToResources,
  type CreateIncidentInput,
  type IncidentRecord,
  type IncidentSource,
  type IncidentTypeRule,
  type ResourceRecord,
  type TeamOnDuty,
} from '@packages/firebase'
import { Calendar } from 'lucide-react'

type IncidentFormState = {
  source: IncidentSource
  incidentSubtypeId: string
  callerName: string
  callerContact: string
  locationText: string
  landmark: string
  latitude: string
  longitude: string
  description: string
  vehicularAccidentReason: string
  notes: string
  // Duty fields (Phase 1)
  teamOnDuty: TeamOnDuty | ''
  incidentDate: string // YYYY-MM-DD
  incidentTime: string // hh:mm AM/PM
}

const emptyForm: IncidentFormState = {
  source: 'manual',
  incidentSubtypeId: '',
  callerName: '',
  callerContact: '',
  locationText: '',
  landmark: '',
  latitude: '',
  longitude: '',
  description: '',
  vehicularAccidentReason: '',
  notes: '',
  teamOnDuty: '',
  incidentDate: '',
  incidentTime: '',
}

const sourceOptions: { value: IncidentSource; label: string }[] = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'call', label: 'Call' },
  { value: 'sms', label: 'SMS' },
  { value: 'radio', label: 'Radio' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'civilian_app', label: 'Civilian App' },
]

const statusTone: Record<IncidentRecord['status'], string> = {
  new: 'border-slate-600 bg-slate-800/80 text-slate-200',
  awaiting_resources: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  liaison_pending: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  dispatched: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  enroute: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200',
  on_scene: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  resolved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  unresolved: 'border-red-500/30 bg-red-500/10 text-red-200',
}

const priorityTone: Record<IncidentRecord['priority'], string> = {
  low: 'text-slate-300',
  medium: 'text-blue-300',
  high: 'text-amber-300',
  critical: 'text-red-300',
}

const teamOnDutyOptions: TeamOnDuty[] = ['Whiskey', 'X-ray', 'Yankee', 'Zulu']

const TIME_ZONE = 'Asia/Manila'
const INCIDENT_TIME_REGEX = /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i

function getPhilippineDateString(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value

  if (!year || !month || !day) return ''
  return `${year}-${month}-${day}`
}

function getPhilippineTimeString(now: Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(now)
}

function normalizeIncidentTimeForInput(value: string): string | null {
  const match = value.trim().match(INCIDENT_TIME_REGEX)
  if (!match) return null

  const hour = Number(match[1])
  const minute = match[2]
  const period = match[3].toUpperCase()
  const hh = String(hour).padStart(2, '0')

  return `${hh}:${minute} ${period}`
}

const formatStatus = (status: IncidentRecord['status']) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())

const toNumberOrNull = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

const toDateLabel = (value: IncidentRecord['createdAt']) => {
  if (!value) return 'N/A'
  const date =
    value instanceof Date
      ? value
      : typeof value === 'object' && value && 'toDate' in value
        ? (value as { toDate: () => Date }).toDate()
        : new Date(value)

  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString()
}

const sortResourcesByName = (resources: ResourceRecord[]) =>
  [...resources].sort((left, right) => left.name.localeCompare(right.name))

function formatIncidentDateForDisplay(date: string | null | undefined): string {
  // Store format is usually YYYY-MM-DD; display as MM/DD/YYYY for readability.
  if (!date) return '—'
  const trimmed = date.trim()
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return trimmed
  const [, year, month, day] = match
  return `${month}/${day}/${year}`
}

export default function IntakePage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()

  const preselectedTeamOnDuty = useMemo<TeamOnDuty | null>(() => {
    // Optional: allow prefill via query string.
    const candidate =
      searchParams.get('teamOnDuty') ?? searchParams.get('team_on_duty') ?? searchParams.get('team')
    if (!candidate) return null
    return teamOnDutyOptions.includes(candidate as TeamOnDuty) ? (candidate as TeamOnDuty) : null
  }, [searchParams])

  const [incidentRules, setIncidentRules] = useState<IncidentTypeRule[]>([])
  const [formState, setFormState] = useState<IncidentFormState>(() => {
    const now = new Date()
    return {
      ...emptyForm,
      incidentDate: getPhilippineDateString(now),
      incidentTime: getPhilippineTimeString(now),
    }
  })

  useEffect(() => {
    if (!preselectedTeamOnDuty) return
    setFormState((current) =>
      current.teamOnDuty ? current : { ...current, teamOnDuty: preselectedTeamOnDuty }
    )
  }, [preselectedTeamOnDuty])

  const [resources, setResources] = useState<ResourceRecord[]>([])
  const [recentIncidents, setRecentIncidents] = useState<IncidentRecord[]>([])
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingResources, setIsLoadingResources] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [pageSuccess, setPageSuccess] = useState<string | null>(null)
  const incidentDateInputRef = useRef<HTMLInputElement | null>(null)

  const selectedRule = useMemo<IncidentTypeRule | null>(
    () => incidentRules.find((rule) => rule.id === formState.incidentSubtypeId) || null,
    [formState.incidentSubtypeId, incidentRules]
  )

  useEffect(() => {
    if (!user) {
      return
    }

    const unsubscribeResources = subscribeToResources((nextResources) => {
      setResources(nextResources)
      setIsLoadingResources(false)
    })

    const unsubscribeRules = subscribeToIncidentTypeRules((nextRules) => {
      setIncidentRules(nextRules)
    })

    const unsubscribeIncidents = subscribeToIncidents((items) => {
      setRecentIncidents(items.slice(0, 8))
    }, 8)

    return () => {
      unsubscribeResources()
      unsubscribeRules()
      unsubscribeIncidents()
    }
  }, [user])

  useEffect(() => {
    setSelectedResourceIds([])
  }, [formState.incidentSubtypeId])

  const matchingResources = useMemo(() => {
    if (!selectedRule) {
      return []
    }

    return sortResourcesByName(resources.filter((resource) => getIncidentResourceMatch(resource, selectedRule)))
  }, [resources, selectedRule])

  const selectedResources = useMemo(
    () => matchingResources.filter((resource) => resource.id && selectedResourceIds.includes(resource.id)),
    [matchingResources, selectedResourceIds]
  )

  const activeIncidentCount = useMemo(
    () => recentIncidents.filter((incident) => incident.resolutionStatus === 'open').length,
    [recentIncidents]
  )

  const handleFieldChange = (field: keyof IncidentFormState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }))
  }

  const openIncidentDatePicker = () => {
    const input = incidentDateInputRef.current
    if (!input) return
    input.focus()
    ;(input as HTMLInputElement & { showPicker?: () => void }).showPicker?.()
  }

  const toggleResourceSelection = (resourceId: string) => {
    setSelectedResourceIds((current) =>
      current.includes(resourceId)
        ? current.filter((value) => value !== resourceId)
        : [...current, resourceId]
    )
  }

  const resetForm = () => {
    const now = new Date()
    setFormState({
      ...emptyForm,
      incidentDate: getPhilippineDateString(now),
      incidentTime: getPhilippineTimeString(now),
    })
    setSelectedResourceIds([])
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedRule) {
      setPageError('Select an incident subtype before saving.')
      return
    }
    if (!formState.locationText.trim()) {
      setPageError('Incident location is required.')
      return
    }
    if (selectedRule.requiresVehicularReason && !formState.vehicularAccidentReason.trim()) {
      setPageError('Vehicular incidents require an accident reason.')
      return
    }

    if (!formState.teamOnDuty) {
      setPageError('Please select a Team on Duty before submitting.')
      return
    }
    if (!formState.incidentDate) {
      setPageError('Incident date is required.')
      return
    }
    const normalizedIncidentTime = normalizeIncidentTimeForInput(formState.incidentTime)
    if (!normalizedIncidentTime) {
      setPageError('Incident time must be in format hh:mm AM/PM.')
      return
    }

    setIsSubmitting(true)
    setPageError(null)
    setPageSuccess(null)

    const payload: CreateIncidentInput = {
      source: formState.source,
      incidentSubtypeId: formState.incidentSubtypeId,
      locationText: formState.locationText,
      landmark: formState.landmark,
      latitude: toNumberOrNull(formState.latitude),
      longitude: toNumberOrNull(formState.longitude),
      callerName: formState.callerName,
      callerContact: formState.callerContact,
      description: formState.description,
      vehicularAccidentReason: formState.vehicularAccidentReason,
      notes: formState.notes,
      teamId: null,
      teamOnDuty: formState.teamOnDuty,
      incidentDate: formState.incidentDate,
      incidentTime: normalizedIncidentTime,
    }

    try {
      const incident = await createIncident(payload)
      if (incident.id && selectedResourceIds.length > 0) {
        await dispatchIncidentResources(incident.id, selectedResourceIds)
      }

      setPageSuccess(
        selectedResourceIds.length > 0
          ? `Incident ${incident.referenceNumber} created and dispatched.`
          : `Incident ${incident.referenceNumber} created. No live resources were selected yet.`
      )
      resetForm()
    } catch (error: any) {
      setPageError(error.message || 'Failed to save incident.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/20 md:p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary-300">Command Center Admin</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-100 md:text-3xl">Incident Intake</h1>
          <p className="mt-1 text-sm text-slate-400">
            Create and dispatch incidents using predefined routing rules.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 shadow-md shadow-black/20 transition hover:bg-slate-800/60">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Configured Types</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="text-2xl font-semibold text-slate-100">{incidentRules.length}</p>
              <p className="text-xs text-slate-400">Available types</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 shadow-md shadow-black/20 transition hover:bg-slate-800/60">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active Incidents</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="text-2xl font-semibold text-blue-400">{activeIncidentCount}</p>
              <p className="text-xs text-slate-400">Open activity</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 shadow-md shadow-black/20 transition hover:bg-slate-800/60">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live Resources</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="text-2xl font-semibold text-emerald-400">{resources.length}</p>
              <p className="text-xs text-slate-400">Units online</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 shadow-md shadow-black/20 transition hover:bg-slate-800/60">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Matching Resources</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="text-2xl font-semibold text-amber-400">{selectedRule ? matchingResources.length : 0}</p>
              <p className="text-xs text-slate-400">Eligible units</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/20 md:p-5"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100 md:text-xl">Create Incident</h2>
                <p className="mt-1 text-xs text-slate-400">Capture core details and dispatch with routing support.</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <h3 className="text-sm font-semibold text-slate-100">Basic Setup</h3>
                <p className="mt-1 text-xs text-slate-500">Subtype drives routing and live matching.</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div className="lg:col-span-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Incident Subtype</label>
                    <select
                      value={formState.incidentSubtypeId}
                      onChange={(event) => handleFieldChange('incidentSubtypeId', event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select incident subtype</option>
                      {incidentRules.map((rule) => (
                        <option key={rule.id} value={rule.id}>
                          {rule.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Source</label>
                    <select
                      value={formState.source}
                      onChange={(event) => handleFieldChange('source', event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {sourceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Team on Duty</label>
                    <select
                      value={formState.teamOnDuty}
                      onChange={(event) => handleFieldChange('teamOnDuty', event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select team</option>
                      {teamOnDutyOptions.map((team) => (
                        <option key={team} value={team}>
                          {team}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="incident-date-display" className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Incident Date
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="incident-date-display"
                        type="text"
                        value={formState.incidentDate ? formatIncidentDateForDisplay(formState.incidentDate) : ''}
                        placeholder="Select date"
                        readOnly
                        onClick={openIncidentDatePicker}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            openIncidentDatePicker()
                          }
                        }}
                        className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        ref={incidentDateInputRef}
                        id="incident-date"
                        type="date"
                        value={formState.incidentDate}
                        onChange={(event) => handleFieldChange('incidentDate', event.target.value)}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 h-0 w-0 opacity-0"
                      />
                      <button
                        type="button"
                        onClick={openIncidentDatePicker}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-200"
                        aria-label="Open incident date picker"
                      >
                        <Calendar size={16} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="incident-time" className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Incident Time
                    </label>
                    <input
                      id="incident-time"
                      type="text"
                      value={formState.incidentTime}
                      onChange={(event) => handleFieldChange('incidentTime', event.target.value)}
                      onBlur={() => {
                        const normalized = normalizeIncidentTimeForInput(formState.incidentTime)
                        if (normalized) {
                          setFormState((current) => ({ ...current, incidentTime: normalized }))
                        }
                      }}
                      placeholder="--:-- --"
                      className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  {selectedRule?.requiresVehicularReason && (
                    <div className="lg:col-span-2">
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Vehicular Accident Reason</label>
                      <input
                        value={formState.vehicularAccidentReason}
                        onChange={(event) => handleFieldChange('vehicularAccidentReason', event.target.value)}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Reckless driving, brake failure, etc."
                      />
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <h3 className="text-sm font-semibold text-slate-100">Caller Information</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Caller Name</label>
                    <input
                      value={formState.callerName}
                      onChange={(event) => handleFieldChange('callerName', event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Reporting party"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Caller Contact</label>
                    <input
                      value={formState.callerContact}
                      onChange={(event) => handleFieldChange('callerContact', event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Mobile or callback detail"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <h3 className="text-sm font-semibold text-slate-100">Location Details</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-6">
                  <div className="md:col-span-4">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Incident Location</label>
                    <input
                      value={formState.locationText}
                      onChange={(event) => handleFieldChange('locationText', event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Street, sitio, establishment, or map description"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Landmark</label>
                    <input
                      value={formState.landmark}
                      onChange={(event) => handleFieldChange('landmark', event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Nearest landmark"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Latitude</label>
                    <input
                      value={formState.latitude}
                      onChange={(event) => handleFieldChange('latitude', event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Longitude</label>
                    <input
                      value={formState.longitude}
                      onChange={(event) => handleFieldChange('longitude', event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="md:col-span-6 rounded-lg border border-dashed border-slate-700 bg-slate-950/50 px-3 py-2.5 text-xs text-slate-500">
                    Map preview coming soon.
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <h3 className="text-sm font-semibold text-slate-100">Incident Details</h3>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Incident Description</label>
                    <textarea
                      value={formState.description}
                      onChange={(event) => handleFieldChange('description', event.target.value)}
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Summarize situation, hazards, injuries, and immediate risks"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Command Center Notes</label>
                    <textarea
                      value={formState.notes}
                      onChange={(event) => handleFieldChange('notes', event.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Internal coordination notes and dispatch instructions"
                    />
                  </div>
                </div>
              </section>
            </div>

            {(pageError || pageSuccess) && (
              <div
                className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                  pageError
                    ? 'border border-red-900/60 bg-red-950/40 text-red-200'
                    : 'border border-emerald-900/60 bg-emerald-950/40 text-emerald-200'
                }`}
              >
                {pageError || pageSuccess}
              </div>
            )}

            <div className="sticky bottom-3 mt-4 flex flex-wrap items-center justify-end gap-3 rounded-lg border border-slate-800 bg-slate-900/95 px-3 py-3 backdrop-blur">
              <button
                type="button"
                onClick={resetForm}
                className="h-10 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? 'Saving Incident...'
                  : selectedResourceIds.length > 0
                    ? 'Create and Dispatch'
                    : 'Create Incident'}
              </button>
            </div>
          </form>

          <aside className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
            <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/20">
              <h2 className="text-base font-semibold text-slate-100">Routing Summary</h2>
              {!selectedRule ? (
                <div className="mt-3 rounded-lg border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
                  Select an incident subtype to view routing.
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Subtype</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{selectedRule.label}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Agencies Involved</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedRule.recommendedAgencies.map((agency) => (
                        <span
                          key={agency}
                          className="rounded-full border border-secondary-500/40 bg-secondary-500/10 px-2.5 py-1 text-xs font-semibold text-secondary-200"
                        >
                          {getAgencyLabel(agency)}
                        </span>
                      ))}
                      <span className={`rounded-full border border-slate-700 px-2.5 py-1 text-xs font-semibold ${priorityTone[selectedRule.priority]}`}>
                        {selectedRule.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dispatch Path</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {selectedRule.requiresExternalAgency
                        ? 'External liaison required in the routing workflow.'
                        : 'Direct internal dispatch workflow.'}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Live Resource Matching</h2>
                  <p className="mt-1 text-xs text-slate-400">Eligible resources by routing rules</p>
                </div>
                {selectedRule && <p className="text-xs text-slate-400">{matchingResources.length} eligible</p>}
              </div>
              {!selectedRule ? (
                <div className="mt-3 rounded-lg border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
                  No eligible resources yet. Select an incident subtype to load matching resources.
                </div>
              ) : isLoadingResources ? (
                <div className="mt-3 py-8 text-center">
                  <div className="inline-block h-7 w-7 animate-spin rounded-full border-b-2 border-primary-600"></div>
                  <p className="mt-3 text-sm text-slate-400">Loading resources...</p>
                </div>
              ) : matchingResources.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
                  No eligible resources yet. Select an incident subtype to load matching resources.
                </div>
              ) : (
                <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                  {matchingResources.map((resource) => {
                    const selected = resource.id ? selectedResourceIds.includes(resource.id) : false
                    return (
                      <label
                        key={resource.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                          selected
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => resource.id && toggleResourceSelection(resource.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 text-primary-500 focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-100">{resource.name}</p>
                            <span className="rounded-full border border-slate-700 px-2.5 py-0.5 text-xs text-slate-300">
                              {resource.type === 'OTHER' ? resource.customType || 'OTHER' : resource.type}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            {[resource.agency, resource.department, resource.stationName].filter(Boolean).join(' / ') || 'No agency details'}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            Team: {resource.teamName || 'Unassigned'} | Base status: {resource.status.replace('_', ' ')}
                          </p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}

              {selectedResources.length > 0 && (
                <div className="mt-3 rounded-lg border border-secondary-500/20 bg-secondary-500/10 px-4 py-3 text-sm text-secondary-100">
                  Selected resources: {selectedResources.map((resource) => resource.name).join(', ')}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Recent Incidents</h2>
                  <p className="mt-1 text-xs text-slate-400">Latest entries from dispatch feed</p>
                </div>
                <span className="text-xs text-slate-400">{recentIncidents.length}</span>
              </div>

              {recentIncidents.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-slate-800 px-4 py-8 text-center">
                  <p className="text-sm text-slate-500">No recent incidents.</p>
                </div>
              ) : (
                <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {recentIncidents.map((incident) => (
                    <article key={incident.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{incident.referenceNumber}</p>
                          <p className="mt-1 text-xs text-slate-300">{incident.incidentSubtypeLabel}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusTone[incident.status]}`}
                          >
                            {formatStatus(incident.status)}
                          </span>
                          <p className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${priorityTone[incident.priority]}`}>
                            {incident.priority}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{incident.locationText}</p>
                      <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-slate-500 md:grid-cols-2">
                        <span>
                          Team on Duty: <span className="font-semibold text-slate-200">{incident.teamOnDuty ?? '—'}</span>
                        </span>
                        <span>
                          Date/Time: <span className="font-semibold text-slate-200">{formatIncidentDateForDisplay(incident.incidentDate)} • {incident.incidentTime ?? '—'}</span>
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">Logged: {toDateLabel(incident.createdAt)}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Agencies: {incident.assignedAgencies.map((agency) => getAgencyLabel(agency)).join(', ') || 'None'}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </section>
      </div>
    </ProtectedRoute>
  )
}
