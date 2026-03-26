'use client'

import { useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  getAgencyLabel,
  saveIncidentTypeRule,
  subscribeToIncidentTypeRules,
  type AgencyCode,
  type IncidentPriority,
  type IncidentTypeRule,
  type ResourceType,
  type SaveIncidentTypeRuleInput,
} from '@packages/firebase'

type RuleFormState = {
  priority: IncidentPriority
  recommendedAgencies: AgencyCode[]
  suggestedResourceTypes: ResourceType[]
  requiresExternalAgency: boolean
  requiresVehicularReason: boolean
}

const agencyOptions: AgencyCode[] = [
  'PNP',
  'RESCUE_1111',
  'TCPGH',
  'CHO',
  'BFP',
  'TFLC',
  'PCG',
  'PSSO_TCTMG',
  'BARANGAY_OFFICIALS',
  'WATER_DISTRICT',
  'CAGELCO_1',
  'COMMAND_CENTER',
  'OTHER',
]

const resourceTypeOptions: ResourceType[] = ['AMBULANCE', 'BFP', 'PNP', 'MDRRMO', 'PCG', 'OTHER']
const priorityOptions: IncidentPriority[] = ['low', 'medium', 'high', 'critical']

const emptyForm: RuleFormState = {
  priority: 'medium',
  recommendedAgencies: [],
  suggestedResourceTypes: [],
  requiresExternalAgency: false,
  requiresVehicularReason: false,
}

export default function IncidentManagementPage() {
  const [rules, setRules] = useState<IncidentTypeRule[]>([])
  const [selectedRuleId, setSelectedRuleId] = useState('')
  const [search, setSearch] = useState('')
  const [formState, setFormState] = useState<RuleFormState>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [pageSuccess, setPageSuccess] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToIncidentTypeRules((nextRules) => {
      setRules(nextRules)
      if (!selectedRuleId && nextRules[0]?.id) {
        setSelectedRuleId(nextRules[0].id)
      }
    })

    return unsubscribe
  }, [selectedRuleId])

  const filteredRules = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) {
      return rules
    }

    return rules.filter((rule) => {
      const agencyText = rule.recommendedAgencies.map((agency) => getAgencyLabel(agency)).join(' ').toLowerCase()
      return (
        rule.label.toLowerCase().includes(needle) ||
        rule.category.toLowerCase().includes(needle) ||
        agencyText.includes(needle)
      )
    })
  }, [rules, search])

  const selectedRule = useMemo(
    () => rules.find((rule) => rule.id === selectedRuleId) || null,
    [rules, selectedRuleId]
  )

  useEffect(() => {
    if (!selectedRule) {
      setFormState(emptyForm)
      return
    }

    setFormState({
      priority: selectedRule.priority,
      recommendedAgencies: selectedRule.recommendedAgencies,
      suggestedResourceTypes: selectedRule.suggestedResourceTypes,
      requiresExternalAgency: selectedRule.requiresExternalAgency,
      requiresVehicularReason: Boolean(selectedRule.requiresVehicularReason),
    })
  }, [selectedRule])

  const handleAgencyToggle = (agency: AgencyCode) => {
    setFormState((current) => ({
      ...current,
      recommendedAgencies: current.recommendedAgencies.includes(agency)
        ? current.recommendedAgencies.filter((value) => value !== agency)
        : [...current.recommendedAgencies, agency],
    }))
  }

  const handleResourceTypeToggle = (resourceType: ResourceType) => {
    setFormState((current) => ({
      ...current,
      suggestedResourceTypes: current.suggestedResourceTypes.includes(resourceType)
        ? current.suggestedResourceTypes.filter((value) => value !== resourceType)
        : [...current.suggestedResourceTypes, resourceType],
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedRule) {
      setPageError('Select an incident type to manage.')
      return
    }
    if (formState.recommendedAgencies.length === 0) {
      setPageError('Assign at least one agency to the incident type.')
      return
    }

    setIsSaving(true)
    setPageError(null)
    setPageSuccess(null)

    const payload: SaveIncidentTypeRuleInput = {
      id: selectedRule.id,
      label: selectedRule.label,
      category: selectedRule.category,
      priority: formState.priority,
      recommendedAgencies: formState.recommendedAgencies,
      suggestedResourceTypes: formState.suggestedResourceTypes,
      requiresExternalAgency: formState.requiresExternalAgency,
      requiresVehicularReason: formState.requiresVehicularReason,
    }

    try {
      await saveIncidentTypeRule(payload)
      setPageSuccess(`Saved rule for ${selectedRule.label}.`)
    } catch (error: any) {
      setPageError(error.message || 'Failed to save incident rule.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary-300">Command Center Admin</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-100">Incident Management</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                Manage which agency or department handles each incident type. Intake and dispatch follow the rules configured here.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
              Example: set Homicide to PNP, or vehicular cases to PSSO/TCTMG + PNP + rescue support.
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Incident Types</h2>
                <p className="mt-1 text-sm text-slate-400">{rules.length} configured types</p>
              </div>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search type, category, or agency"
              className="mt-4 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />

            <div className="mt-4 max-h-[640px] space-y-3 overflow-y-auto pr-1">
              {filteredRules.map((rule) => {
                const selected = rule.id === selectedRuleId
                return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => setSelectedRuleId(rule.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-100">{rule.label}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{rule.category}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {rule.recommendedAgencies.map((agency) => getAgencyLabel(agency)).join(', ') || 'No agencies assigned'}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/20"
          >
            {!selectedRule ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-16 text-center">
                <p className="text-lg text-slate-300">Select an incident type to manage.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-100">{selectedRule.label}</h2>
                    <p className="mt-1 text-sm text-slate-400">Category: {selectedRule.category}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                    Rule ID: {selectedRule.id}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Priority</label>
                    <select
                      value={formState.priority}
                      onChange={(event) => setFormState((current) => ({ ...current, priority: event.target.value as IncidentPriority }))}
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {priorityOptions.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col justify-end gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-4">
                    <label className="inline-flex items-center gap-3 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={formState.requiresExternalAgency}
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, requiresExternalAgency: event.target.checked }))
                        }
                        className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-primary-500 focus:ring-primary-500"
                      />
                      Requires external agency workflow
                    </label>
                    <label className="inline-flex items-center gap-3 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={formState.requiresVehicularReason}
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, requiresVehicularReason: event.target.checked }))
                        }
                        className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-primary-500 focus:ring-primary-500"
                      />
                      Require vehicular accident reason in intake
                    </label>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Assigned Agencies</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {agencyOptions.map((agency) => {
                      const selected = formState.recommendedAgencies.includes(agency)
                      return (
                        <button
                          key={agency}
                          type="button"
                          onClick={() => handleAgencyToggle(agency)}
                          className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                            selected
                              ? 'border-primary-500 bg-primary-500/20 text-primary-200'
                              : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {getAgencyLabel(agency)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Suggested Resource Types</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {resourceTypeOptions.map((resourceType) => {
                      const selected = formState.suggestedResourceTypes.includes(resourceType)
                      return (
                        <button
                          key={resourceType}
                          type="button"
                          onClick={() => handleResourceTypeToggle(resourceType)}
                          className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                            selected
                              ? 'border-secondary-500/50 bg-secondary-500/15 text-secondary-200'
                              : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {resourceType}
                        </button>
                      )
                    })}
                  </div>
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

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? 'Saving...' : 'Save Rule'}
                  </button>
                </div>
              </>
            )}
          </form>
        </section>
      </div>
    </ProtectedRoute>
  )
}
