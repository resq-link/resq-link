'use client'

import { useEffect, useMemo, useState } from 'react'
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
} from '@packages/firebase'

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
  teamName: string
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
  teamName: '',
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

export default function IntakePage() {
  const { user } = useAuth()
  const [incidentRules, setIncidentRules] = useState<IncidentTypeRule[]>([])
  const [formState, setFormState] = useState<IncidentFormState>(emptyForm)
  const [resources, setResources] = useState<ResourceRecord[]>([])
  const [recentIncidents, setRecentIncidents] = useState<IncidentRecord[]>([])
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingResources, setIsLoadingResources] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [pageSuccess, setPageSuccess] = useState<string | null>(null)

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

  const toggleResourceSelection = (resourceId: string) => {
    setSelectedResourceIds((current) =>
      current.includes(resourceId)
        ? current.filter((value) => value !== resourceId)
        : [...current, resourceId]
    )
  }

  const resetForm = () => {
    setFormState(emptyForm)
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
      teamName: formState.teamName,
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
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary-300">Command Center Admin</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-100">Incident Intake</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                Create live incident records using the managed incident-type routing rules, then dispatch only real resources that match the configured agency assignment.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
              Signed in user controls assignment. Team support is provisioned but left optional until the teams module is ready.
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Configured Incident Types</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">{incidentRules.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Active Incidents</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">{activeIncidentCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Live Resources</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">{resources.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Matching Resources</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">
              {selectedRule ? matchingResources.length : 0}
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/20"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">Create Incident</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Agency assignments come from the Incident Management tab and are automatically applied here.
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500"
              >
                Clear
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Source</label>
                <select
                  value={formState.source}
                  onChange={(event) => handleFieldChange('source', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {sourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Team Provision</label>
                <select
                  value={formState.teamName}
                  onChange={(event) => handleFieldChange('teamName', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Unassigned</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Incident Subtype</label>
                <select
                  value={formState.incidentSubtypeId}
                  onChange={(event) => handleFieldChange('incidentSubtypeId', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select incident subtype</option>
                  {incidentRules.map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedRule && (
              <div className="mt-6 rounded-2xl border border-secondary-500/30 bg-secondary-500/10 p-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Category</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{selectedRule.category}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Priority</p>
                    <p className={`mt-1 text-sm font-semibold ${priorityTone[selectedRule.priority]}`}>
                      {selectedRule.priority.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Routing Path</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {selectedRule.requiresExternalAgency ? 'External liaison required' : 'Internal deployment'}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mandatory Agencies</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedRule.recommendedAgencies.map((agency) => (
                      <span
                        key={agency}
                        className="rounded-full border border-secondary-500/40 bg-secondary-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-secondary-200"
                      >
                        {getAgencyLabel(agency)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Caller Name</label>
                <input
                  value={formState.callerName}
                  onChange={(event) => handleFieldChange('callerName', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Name of caller or reporting party"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Caller Contact</label>
                <input
                  value={formState.callerContact}
                  onChange={(event) => handleFieldChange('callerContact', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Mobile number or callback detail"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Incident Location</label>
                <input
                  value={formState.locationText}
                  onChange={(event) => handleFieldChange('locationText', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Street, sitio, establishment, or map description"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Landmark</label>
                <input
                  value={formState.landmark}
                  onChange={(event) => handleFieldChange('landmark', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nearest landmark"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Latitude</label>
                  <input
                    value={formState.latitude}
                    onChange={(event) => handleFieldChange('latitude', event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Longitude</label>
                  <input
                    value={formState.longitude}
                    onChange={(event) => handleFieldChange('longitude', event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Optional"
                  />
                </div>
              </div>
              {selectedRule?.requiresVehicularReason && (
                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Vehicular Accident Reason</label>
                  <input
                    value={formState.vehicularAccidentReason}
                    onChange={(event) => handleFieldChange('vehicularAccidentReason', event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Reckless driving, stray animal, brake failure, etc."
                  />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Incident Description</label>
                <textarea
                  value={formState.description}
                  onChange={(event) => handleFieldChange('description', event.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Document the incident situation, hazards, injuries, and scene context."
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Command Center Notes</label>
                <textarea
                  value={formState.notes}
                  onChange={(event) => handleFieldChange('notes', event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Record coordination notes, escalation details, or liaison instructions."
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Live Resource Matching</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Only available resources matching the mandatory agency routing are shown.
                  </p>
                </div>
                {selectedRule && (
                  <p className="text-sm text-slate-400">{matchingResources.length} resources eligible</p>
                )}
              </div>

              {!selectedRule ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
                  Select an incident subtype to load eligible resources.
                </div>
              ) : isLoadingResources ? (
                <div className="mt-4 py-10 text-center">
                  <div className="inline-block h-7 w-7 animate-spin rounded-full border-b-2 border-primary-600"></div>
                  <p className="mt-3 text-sm text-slate-400">Loading resources...</p>
                </div>
              ) : matchingResources.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
                  No live resources currently match this incident rule. You can still create the incident and dispatch later.
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {matchingResources.map((resource) => {
                    const selected = resource.id ? selectedResourceIds.includes(resource.id) : false
                    return (
                      <label
                        key={resource.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
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
                <div className="mt-4 rounded-xl border border-secondary-500/20 bg-secondary-500/10 px-4 py-3 text-sm text-secondary-100">
                  Selected resources: {selectedResources.map((resource) => resource.name).join(', ')}
                </div>
              )}
            </div>

            {(pageError || pageSuccess) && (
              <div
                className={`mt-6 rounded-lg px-4 py-3 text-sm ${
                  pageError
                    ? 'border border-red-900/60 bg-red-950/40 text-red-200'
                    : 'border border-emerald-900/60 bg-emerald-950/40 text-emerald-200'
                }`}
              >
                {pageError || pageSuccess}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? 'Saving Incident...'
                  : selectedResourceIds.length > 0
                    ? 'Create and Dispatch'
                    : 'Create Incident'}
              </button>
            </div>
          </form>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-xl font-semibold text-slate-100">Routing Summary</h2>
              {!selectedRule ? (
                <p className="mt-4 text-sm text-slate-400">
                  Choose an incident subtype to see the enforced agency routing and expected dispatch path.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Subtype</p>
                    <p className="mt-2 text-sm font-semibold text-slate-100">{selectedRule.label}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mandatory Agencies</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-300">
                      {selectedRule.recommendedAgencies.map((agency) => (
                        <li key={agency}>{getAgencyLabel(agency)}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dispatch Rule</p>
                    <p className="mt-2 text-sm text-slate-300">
                      {selectedRule.requiresExternalAgency
                        ? 'External liaison is part of the required flow for this subtype.'
                        : 'This subtype is handled through direct internal dispatch.'}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">Recent Incidents</h2>
                  <p className="mt-1 text-sm text-slate-400">Live records from Firestore</p>
                </div>
                <span className="text-sm text-slate-400">{recentIncidents.length} loaded</span>
              </div>

              {recentIncidents.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-800 px-4 py-10 text-center">
                  <p className="text-sm text-slate-500">No incidents recorded yet.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {recentIncidents.map((incident) => (
                    <article
                      key={incident.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{incident.referenceNumber}</p>
                          <p className="mt-1 text-sm text-slate-300">{incident.incidentSubtypeLabel}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[incident.status]}`}
                          >
                            {formatStatus(incident.status)}
                          </span>
                          <p className={`mt-2 text-xs font-semibold uppercase tracking-[0.2em] ${priorityTone[incident.priority]}`}>
                            {incident.priority}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-400">{incident.locationText}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Agencies: {incident.assignedAgencies.map((agency) => getAgencyLabel(agency)).join(', ') || 'None'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Created: {toDateLabel(incident.createdAt)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  )
}
