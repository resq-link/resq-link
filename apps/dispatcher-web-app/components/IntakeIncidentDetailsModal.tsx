'use client'

import dynamic from 'next/dynamic'
import type { IncidentRecord } from '@packages/firebase'

const PinnedLocationMap = dynamic(() => import('./PinnedLocationMap'), {
  ssr: false,
  loading: () => (
    <div className="mt-3 flex h-44 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-400">
      Loading pinned location...
    </div>
  ),
})

type IntakeIncidentDetailsModalProps = {
  incident: IncidentRecord | null
  onClose: () => void
}

const toDateLabel = (value: IncidentRecord['createdAt']) => {
  if (!value) return 'N/A'
  const date =
    value instanceof Date
      ? value
      : typeof value === 'object' && value && 'toDate' in value
        ? value.toDate()
        : new Date(value)

  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString()
}

const formatStatus = (status: IncidentRecord['status']) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())

export default function IntakeIncidentDetailsModal({
  incident,
  onClose,
}: IntakeIncidentDetailsModalProps) {
  if (!incident) return null

  const hasPinnedLocation =
    incident.latitude != null &&
    incident.longitude != null &&
    Number.isFinite(incident.latitude) &&
    Number.isFinite(incident.longitude) &&
    incident.latitude !== 0 &&
    incident.longitude !== 0

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Intake Incident
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-100">
              {incident.referenceNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
          >
            Close
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="text-sm font-semibold text-slate-100">Status</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p>
                  <span className="text-slate-500">Subtype:</span>{' '}
                  <span className="font-medium text-slate-100">
                    {incident.incidentSubtypeLabel}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Status:</span>{' '}
                  <span className="font-medium text-slate-100">
                    {formatStatus(incident.status)}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Priority:</span>{' '}
                  <span className="font-medium text-slate-100">{incident.priority}</span>
                </p>
                <p>
                  <span className="text-slate-500">Source:</span>{' '}
                  <span className="font-medium text-slate-100">{incident.source}</span>
                </p>
                <p>
                  <span className="text-slate-500">Logged:</span>{' '}
                  <span className="font-medium text-slate-100">
                    {toDateLabel(incident.createdAt)}
                  </span>
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="text-sm font-semibold text-slate-100">Location</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p className="font-medium text-slate-100">
                  {incident.locationText || 'N/A'}
                </p>
                <p>
                  <span className="text-slate-500">Nearest landmark:</span>{' '}
                  <span className="font-medium text-slate-100">
                    {incident.landmark || 'N/A'}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Coordinates:</span>{' '}
                  <span className="font-medium text-slate-100">
                    {hasPinnedLocation
                      ? `${incident.latitude!.toFixed(6)}, ${incident.longitude!.toFixed(6)}`
                      : 'N/A'}
                  </span>
                </p>
                {hasPinnedLocation ? (
                  <PinnedLocationMap
                    latitude={incident.latitude!}
                    longitude={incident.longitude!}
                    label={incident.locationText || 'Pinned incident location'}
                    className="mt-3"
                  />
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:col-span-2">
              <h3 className="text-sm font-semibold text-slate-100">Description</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
                {incident.description || 'No description provided.'}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
