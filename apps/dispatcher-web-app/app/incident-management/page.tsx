'use client'

import { useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import CommandBar from '@/components/CommandBar'
import { useAuth } from '@/contexts/AuthContext'
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
import { Plus, Search, ShieldAlert } from 'lucide-react'

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

type CategoryTab = 'all' | 'medical' | 'fire' | 'vehicular' | 'peace_order' | 'community' | 'utility' | 'other'

const categoryTabs: Array<{ id: CategoryTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'medical', label: 'Medical' },
  { id: 'fire', label: 'Fire' },
  { id: 'vehicular', label: 'Vehicular' },
  { id: 'peace_order', label: 'Peace & Order' },
  { id: 'community', label: 'Community' },
  { id: 'utility', label: 'Utility' },
  { id: 'other', label: 'Other' },
]

const normalizeCategory = (value: string) => value.toLowerCase().replace(/[\s/_-]+/g, '')

const getCategoryTab = (category: string): CategoryTab => {
  const normalized = normalizeCategory(category)
  if (normalized.includes('medical') || normalized.includes('health')) return 'medical'
  if (normalized.includes('fire')) return 'fire'
  if (normalized.includes('vehicular') || normalized.includes('traffic') || normalized.includes('accident')) {
    return 'vehicular'
  }
  if (normalized.includes('peace') || normalized.includes('order') || normalized.includes('crime')) return 'peace_order'
  if (
    normalized.includes('community') ||
    normalized.includes('social') ||
    normalized.includes('barangay') ||
    normalized.includes('public')
  ) {
    return 'community'
  }
  if (normalized.includes('utility') || normalized.includes('water') || normalized.includes('power') || normalized.includes('electric')) {
    return 'utility'
  }
  return 'other'
}

export default function IncidentManagementPage() {
  const { user } = useAuth()
  const [rules, setRules] = useState<IncidentTypeRule[]>([])
  const [selectedRuleId, setSelectedRuleId] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryTab>('all')
  const [formState, setFormState] = useState<RuleFormState>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [pageSuccess, setPageSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setRules([])
      setSelectedRuleId('')
      return
    }

    const unsubscribe = subscribeToIncidentTypeRules((nextRules) => {
      setRules(nextRules)
      if (nextRules.length === 0) {
        setSelectedRuleId('')
        return
      }
      if (!nextRules.some((rule) => rule.id === selectedRuleId)) {
        setSelectedRuleId(nextRules[0].id)
      }
    })

    return unsubscribe
  }, [selectedRuleId, user])

  const filteredRules = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return rules.filter((rule) => {
      const agencyText = rule.recommendedAgencies.map((agency) => getAgencyLabel(agency)).join(' ').toLowerCase()
      const matchesCategory = selectedCategory === 'all' || getCategoryTab(rule.category) === selectedCategory
      if (!matchesCategory) {
        return false
      }
      if (!needle) {
        return true
      }
      return (
        rule.label.toLowerCase().includes(needle) ||
        rule.category.toLowerCase().includes(needle) ||
        agencyText.includes(needle)
      )
    })
  }, [rules, search, selectedCategory])

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
      <div className="flex flex-col h-full">
        <CommandBar 
          pageName="Incident Management" 
          description="Operational rules and incident categorization settings"
          statsCategory="Management"
          stats={[
            { label: 'Incident Types', value: rules.length, highlight: true }
          ]}
        >
          <div className="flex items-center gap-2">
            <button 
              className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-[11px] font-bold text-white transition-colors flex items-center gap-2"
              title="Add incident type is not yet available"
            >
              <Plus size={14} />
              <span>ADD RULE</span>
            </button>
          </div>
        </CommandBar>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar no-scrollbar">


        <section className="grid gap-4 xl:grid-cols-[1.05fr_1.2fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search type, category, or agency"
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-20 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={() => setSearch('')}
                disabled={!search.trim()}
                className="absolute right-2 top-1/2 h-8 -translate-y-1/2 rounded-md border border-slate-700 px-2 text-xs text-slate-300 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`h-8 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    selectedCategory === tab.id
                      ? 'bg-primary-600 text-white'
                      : 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-4 max-h-[640px] space-y-3 overflow-y-auto pr-1">
              {filteredRules.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-10 text-center">
                  <p className="text-base text-slate-300">
                    {rules.length === 0 ? 'No incident types in Firestore' : 'No incident types found'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {rules.length === 0
                      ? 'Seed the incidentTypeRules collection before using Incident Management.'
                      : 'Try adjusting your search or category.'}
                  </p>
                </div>
              ) : (
                filteredRules.map((rule) => {
                  const selected = rule.id === selectedRuleId
                  return (
                    <article
                      key={rule.id}
                      className={`rounded-xl border p-4 transition ${
                        selected
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">{rule.label}</p>
                          <span className="mt-1 inline-flex rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-400">
                            {rule.category}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Agencies</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {rule.recommendedAgencies.length > 0 ? (
                            rule.recommendedAgencies.map((agency) => (
                              <span
                                key={agency}
                                className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300"
                              >
                                {getAgencyLabel(agency)}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">No agencies assigned</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 border-t border-slate-800 pt-3">
                        <button
                          type="button"
                          onClick={() => setSelectedRuleId(rule.id)}
                          className="h-8 rounded-md border border-slate-700 px-2.5 text-xs font-medium text-slate-200 hover:border-slate-500"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRuleId(rule.id)}
                          className="h-8 rounded-md bg-primary-600 px-2.5 text-xs font-medium text-white hover:bg-primary-500"
                        >
                          Edit
                        </button>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-black/20 md:p-5"
          >
            {!selectedRule ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-16 text-center">
                <p className="text-lg text-slate-300">
                  {rules.length === 0 ? 'Firestore incident type catalog is empty.' : 'Select an incident type to manage.'}
                </p>
                {rules.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Run the seed script or create `incidentTypeRules` documents before editing routing.
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-100">{selectedRule.label}</h2>
                    <p className="mt-1 text-sm text-slate-400">Category: {selectedRule.category}</p>
                  </div>
                  <span className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-300">
                    Rule ID: {selectedRule.id}
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Settings</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Priority</label>
                        <select
                          value={formState.priority}
                          onChange={(event) =>
                            setFormState((current) => ({ ...current, priority: event.target.value as IncidentPriority }))
                          }
                          className="mt-2 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {priorityOptions.map((priority) => (
                            <option key={priority} value={priority}>
                              {priority.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5">
                        <label className="inline-flex items-center gap-3 text-sm text-slate-200">
                          <input
                            type="checkbox"
                            checked={formState.requiresExternalAgency}
                            onChange={(event) =>
                              setFormState((current) => ({ ...current, requiresExternalAgency: event.target.checked }))
                            }
                            className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-primary-500 focus:ring-primary-500"
                          />
                          Requires external workflow
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
                          Require vehicular reason
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Assigned Agencies</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {agencyOptions.map((agency) => {
                        const selected = formState.recommendedAgencies.includes(agency)
                        return (
                          <button
                            key={agency}
                            type="button"
                            onClick={() => handleAgencyToggle(agency)}
                            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
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
                  </section>

                  <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Suggested Resources</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {resourceTypeOptions.map((resourceType) => {
                        const selected = formState.suggestedResourceTypes.includes(resourceType)
                        return (
                          <button
                            key={resourceType}
                            type="button"
                            onClick={() => handleResourceTypeToggle(resourceType)}
                            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
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

                <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="h-10 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? 'Saving...' : 'Save Rule'}
                  </button>
                </div>
              </>
            )}
          </form>
        </section>
        </div>
      </div>
    </ProtectedRoute>
  )
}
