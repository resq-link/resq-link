'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  createResource,
  deleteResource,
  subscribeToResources,
  updateResource,
  type ResourceRecord,
  type ResourceStatus,
  type ResourceType,
} from '@packages/firebase'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { MapPin, Pencil, Plus, Trash2, X } from 'lucide-react'

const ResourceLocationMap = dynamic(() => import('@/components/ResourceLocationMap'), {
  ssr: false,
})

type ResourceFormState = {
  name: string
  resourceCode: string
  type: ResourceType
  customType: string
  agency: string
  department: string
  teamName: string
  status: ResourceStatus
  stationName: string
  quadrant: string
  stationLatitude: string
  stationLongitude: string
  currentLatitude: string
  currentLongitude: string
  notes: string
}

const resourceTypes: ResourceType[] = ['AMBULANCE', 'BFP', 'PNP', 'MDRRMO', 'PCG', 'OTHER']
const resourceStatuses: ResourceStatus[] = [
  'available',
  'assigned',
  'en_route',
  'on_scene',
  'maintenance',
  'offline',
]

const emptyForm: ResourceFormState = {
  name: '',
  resourceCode: '',
  type: 'AMBULANCE',
  customType: '',
  agency: '',
  department: '',
  teamName: '',
  status: 'available',
  stationName: '',
  quadrant: '',
  stationLatitude: '',
  stationLongitude: '',
  currentLatitude: '',
  currentLongitude: '',
  notes: '',
}

const statusTone: Record<ResourceStatus, string> = {
  available: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  assigned: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  en_route: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  on_scene: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  maintenance: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  offline: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
}

const typeTone: Record<ResourceType, string> = {
  AMBULANCE: 'bg-orange-500/10 text-orange-200 border-orange-500/30',
  BFP: 'bg-red-500/10 text-red-200 border-red-500/30',
  PNP: 'bg-blue-500/10 text-blue-200 border-blue-500/30',
  MDRRMO: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30',
  PCG: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/30',
  OTHER: 'bg-slate-500/10 text-slate-200 border-slate-500/30',
}

const formatStatusLabel = (status: ResourceStatus) =>
  status.replace('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())

const getTypeLabel = (resource: Pick<ResourceRecord, 'type' | 'customType'>) =>
  resource.type === 'OTHER' ? resource.customType || 'Other' : resource.type

const toNumberOrNull = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

const getCoordinatesLabel = (resource: ResourceRecord) => {
  const latitude = resource.currentLatitude ?? resource.stationLatitude
  const longitude = resource.currentLongitude ?? resource.stationLongitude

  if (
    latitude == null ||
    longitude == null ||
    latitude === 0 ||
    longitude === 0 ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return 'No location saved'
  }

  const source = resource.currentLatitude != null && resource.currentLongitude != null ? 'Live/Current' : 'Base'
  return `${source}: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}

export default function ResourcesPage() {
  const { user } = useAuth()
  const [resources, setResources] = useState<ResourceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ResourceStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | ResourceType>('all')
  const [formState, setFormState] = useState<ResourceFormState>(emptyForm)
  const [editingResource, setEditingResource] = useState<ResourceRecord | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mapResource, setMapResource] = useState<ResourceRecord | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      return
    }

    const unsubscribe = subscribeToResources((nextResources) => {
      setResources(nextResources)
      setIsLoading(false)
    })

    return unsubscribe
  }, [user])

  const filteredResources = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return resources.filter((resource) => {
      const matchesSearch =
        !needle ||
        resource.name.toLowerCase().includes(needle) ||
        (resource.resourceCode || '').toLowerCase().includes(needle) ||
        (resource.customType || '').toLowerCase().includes(needle) ||
        (resource.agency || '').toLowerCase().includes(needle) ||
        (resource.department || '').toLowerCase().includes(needle) ||
        (resource.stationName || '').toLowerCase().includes(needle) ||
        (resource.quadrant || '').toLowerCase().includes(needle)

      const matchesStatus = statusFilter === 'all' || resource.status === statusFilter
      const matchesType = typeFilter === 'all' || resource.type === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [resources, search, statusFilter, typeFilter])

  const stats = useMemo(
    () => ({
      total: resources.length,
      available: resources.filter((resource) => resource.status === 'available').length,
      assigned: resources.filter((resource) => resource.status === 'assigned').length,
      maintenance: resources.filter((resource) => resource.status === 'maintenance').length,
      offline: resources.filter((resource) => resource.status === 'offline').length,
    }),
    [resources]
  )

  const openCreateModal = () => {
    setEditingResource(null)
    setFormState(emptyForm)
    setPageError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (resource: ResourceRecord) => {
    setEditingResource(resource)
    setFormState({
      name: resource.name,
      resourceCode: resource.resourceCode || '',
      type: resource.type,
      customType: resource.customType || '',
      agency: resource.agency || '',
      department: resource.department || '',
      teamName: resource.teamName || '',
      status: resource.status,
      stationName: resource.stationName || '',
      quadrant: resource.quadrant || '',
      stationLatitude: resource.stationLatitude?.toString() || '',
      stationLongitude: resource.stationLongitude?.toString() || '',
      currentLatitude: resource.currentLatitude?.toString() || '',
      currentLongitude: resource.currentLongitude?.toString() || '',
      notes: resource.notes || '',
    })
    setPageError(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSaving) return
    setIsModalOpen(false)
    setEditingResource(null)
    setFormState(emptyForm)
  }

  const handleFieldChange = (field: keyof ResourceFormState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formState.name.trim()) {
      setPageError('Resource name is required.')
      return
    }
    if (formState.type === 'OTHER' && !formState.customType.trim()) {
      setPageError('Custom type is required when type is set to Other.')
      return
    }

    setIsSaving(true)
    setPageError(null)

    const payload = {
      name: formState.name,
      resourceCode: formState.resourceCode,
      type: formState.type,
      customType: formState.customType,
      agency: formState.agency,
      department: formState.department,
      teamId: null,
      teamName: formState.teamName,
      status: formState.status,
      stationName: formState.stationName,
      quadrant: formState.quadrant,
      stationLatitude: toNumberOrNull(formState.stationLatitude),
      stationLongitude: toNumberOrNull(formState.stationLongitude),
      currentLatitude: toNumberOrNull(formState.currentLatitude),
      currentLongitude: toNumberOrNull(formState.currentLongitude),
      assignedResponderId: null,
      assignedIncidentId: null,
      notes: formState.notes,
      isActive: true,
    } as const

    try {
      if (editingResource?.id) {
        await updateResource(editingResource.id, payload)
      } else {
        await createResource(payload)
      }
      closeModal()
    } catch (error: any) {
      setPageError(error.message || 'Failed to save resource.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (resource: ResourceRecord) => {
    if (!resource.id) return
    if (!window.confirm(`Delete resource "${resource.name}"? This cannot be undone.`)) {
      return
    }

    setPageError(null)
    try {
      await deleteResource(resource.id)
      if (mapResource?.id === resource.id) {
        setMapResource(null)
      }
    } catch (error: any) {
      setPageError(error.message || 'Failed to delete resource.')
    }
  }

  const handleStatusChange = async (resource: ResourceRecord, status: ResourceStatus) => {
    if (!resource.id || resource.status === status) {
      return
    }

    setPageError(null)
    try {
      await updateResource(resource.id, { status })
    } catch (error: any) {
      setPageError(error.message || 'Failed to update resource status.')
    }
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary-300">Command Center</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-100">Resources</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                Track deployable assets live from Firestore, manage availability, and keep base or current map positions for each resource.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-500"
            >
              <Plus size={18} />
              Add Resource
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Total Resources</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="text-sm text-emerald-200/80">Available</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-200">{stats.available}</p>
          </div>
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-sm text-blue-200/80">Assigned</p>
            <p className="mt-2 text-3xl font-semibold text-blue-200">{stats.assigned}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <p className="text-sm text-amber-200/80">Maintenance</p>
            <p className="mt-2 text-3xl font-semibold text-amber-200">{stats.maintenance}</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-5">
            <p className="text-sm text-slate-400">Offline</p>
            <p className="mt-2 text-3xl font-semibold text-slate-200">{stats.offline}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="grid gap-4 lg:grid-cols-[1.5fr_0.7fr_0.7fr]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, code, agency, station, quadrant"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as 'all' | ResourceType)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All types</option>
              {resourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | ResourceStatus)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All statuses</option>
              {resourceStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
          {pageError && (
            <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {pageError}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-100">Resource Inventory</h2>
            <p className="text-sm text-slate-400">{filteredResources.length} shown</p>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
              <p className="mt-4 text-slate-400">Loading resources...</p>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-16 text-center">
              <p className="text-lg text-slate-300">No resources found.</p>
              <p className="mt-2 text-sm text-slate-500">Add your first resource or widen the current filters.</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredResources.map((resource) => (
                <article
                  key={resource.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 shadow-lg shadow-black/20"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-slate-100">{resource.name}</h3>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${typeTone[resource.type]}`}>
                          {getTypeLabel(resource)}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[resource.status]}`}>
                          {formatStatusLabel(resource.status)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                        <span>Code: {resource.resourceCode || 'N/A'}</span>
                        <span>Agency: {resource.agency || 'N/A'}</span>
                        <span>Department: {resource.department || 'N/A'}</span>
                        <span>Team: {resource.teamName || 'Unassigned'}</span>
                        <span>Quadrant: {resource.quadrant || 'N/A'}</span>
                        <span>Base: {resource.stationName || 'N/A'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-slate-400">
                        <MapPin size={16} className="mt-0.5 shrink-0" />
                        <span>{getCoordinatesLabel(resource)}</span>
                      </div>
                      {resource.notes && <p className="text-sm text-slate-300">{resource.notes}</p>}
                    </div>

                    <div className="flex min-w-[180px] flex-col gap-2">
                      <select
                        value={resource.status}
                        onChange={(event) => handleStatusChange(resource, event.target.value as ResourceStatus)}
                        className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {resourceStatuses.map((status) => (
                          <option key={status} value={status}>
                            {formatStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setMapResource(resource)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-900"
                      >
                        <MapPin size={16} />
                        View Map
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(resource)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-900"
                      >
                        <Pencil size={16} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(resource)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-900/60 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-950/40"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        {isModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">
                    {editingResource ? 'Edit Resource' : 'Add Resource'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Teams are not wired yet, so the team field is optional and forward-compatible.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Resource Name</label>
                    <input
                      value={formState.name}
                      onChange={(event) => handleFieldChange('name', event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ambulance 01"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Resource Code</label>
                    <input
                      value={formState.resourceCode}
                      onChange={(event) => handleFieldChange('resourceCode', event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="AMB-01"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Type</label>
                    <select
                      value={formState.type}
                      onChange={(event) => handleFieldChange('type', event.target.value as ResourceType)}
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {resourceTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formState.type === 'OTHER' && (
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Custom Type</label>
                      <input
                        value={formState.customType}
                        onChange={(event) => handleFieldChange('customType', event.target.value)}
                        className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Boat, tow truck, generator, etc."
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</label>
                    <select
                      value={formState.status}
                      onChange={(event) => handleFieldChange('status', event.target.value as ResourceStatus)}
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {resourceStatuses.map((status) => (
                        <option key={status} value={status}>
                          {formatStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Agency</label>
                    <input
                      value={formState.agency}
                      onChange={(event) => handleFieldChange('agency', event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="City Government"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Department</label>
                    <input
                      value={formState.department}
                      onChange={(event) => handleFieldChange('department', event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Emergency Medical Service"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Team</label>
                    <select
                      value={formState.teamName}
                      onChange={(event) => handleFieldChange('teamName', event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Unassigned</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Quadrant</label>
                    <input
                      value={formState.quadrant}
                      onChange={(event) => handleFieldChange('quadrant', event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="North / Sector A"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Base / Station Name</label>
                    <input
                      value={formState.stationName}
                      onChange={(event) => handleFieldChange('stationName', event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Tuguegarao EMS Station"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Station Latitude</label>
                    <input
                      value={formState.stationLatitude}
                      onChange={(event) => handleFieldChange('stationLatitude', event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="17.6132"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Station Longitude</label>
                    <input
                      value={formState.stationLongitude}
                      onChange={(event) => handleFieldChange('stationLongitude', event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="121.7270"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Current Latitude</label>
                    <input
                      value={formState.currentLatitude}
                      onChange={(event) => handleFieldChange('currentLatitude', event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Optional current latitude"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Current Longitude</label>
                    <input
                      value={formState.currentLongitude}
                      onChange={(event) => handleFieldChange('currentLongitude', event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Optional current longitude"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Notes</label>
                    <textarea
                      value={formState.notes}
                      onChange={(event) => handleFieldChange('notes', event.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Operational notes, equipment state, dispatch constraints"
                    />
                  </div>
                </div>

                {pageError && (
                  <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    {pageError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? 'Saving...' : editingResource ? 'Save Changes' : 'Create Resource'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {mapResource && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">{mapResource.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{getCoordinatesLabel(mapResource)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMapResource(null)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
                <div className="space-y-3 border-b border-slate-800 p-6 lg:border-b-0 lg:border-r">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Type</p>
                    <p className="mt-1 text-sm text-slate-100">{getTypeLabel(mapResource)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
                    <p className="mt-1 text-sm text-slate-100">{formatStatusLabel(mapResource.status)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Agency / Department</p>
                    <p className="mt-1 text-sm text-slate-100">
                      {[mapResource.agency, mapResource.department].filter(Boolean).join(' / ') || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Base</p>
                    <p className="mt-1 text-sm text-slate-100">{mapResource.stationName || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Quadrant</p>
                    <p className="mt-1 text-sm text-slate-100">{mapResource.quadrant || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Team</p>
                    <p className="mt-1 text-sm text-slate-100">{mapResource.teamName || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="h-[420px] bg-slate-950">
                  <ResourceLocationMap resource={mapResource} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
