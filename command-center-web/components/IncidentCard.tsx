'use client'

import { useState } from 'react'
import StatusBadge from './StatusBadge'
import AssignDispatcherModal from './AssignDispatcherModal'
import IncidentDetailsModal from './IncidentDetailsModal'

interface Incident {
  id: string
  type: string
  location: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'enroute' | 'on_scene' | 'done' | 'active' | 'resolved' // Support both new and legacy statuses
  reportedAt: Date
  description: string
  responder: string | null
  dispatcherId?: string | null
  imageUrl?: string | null
  latitude?: number | null
  longitude?: number | null
}

interface IncidentCardProps {
  incident: Incident
  onUpdate?: () => void
}

export default function IncidentCard({ incident, onUpdate }: IncidentCardProps) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500/10 text-red-200 border-red-500/30'
      case 'high':
        return 'bg-orange-500/10 text-orange-200 border-orange-500/30'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-200 border-yellow-500/30'
      case 'low':
        return 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
      default:
        return 'bg-slate-800 text-slate-200 border-slate-700'
    }
  }

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  return (
    <div className="border border-slate-800 rounded-lg p-6 hover:shadow-lg transition-shadow bg-slate-900/70 shadow-black/20">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold text-slate-100">
              {incident.type}
            </h3>
            <StatusBadge status={incident.status} />
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(
                incident.priority
              )}`}
            >
              {incident.priority.toUpperCase()}
            </span>
          </div>
          <p className="text-slate-300 mb-3">{incident.description}</p>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {incident.location}
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {getTimeAgo(incident.reportedAt)}
            </span>
          </div>
        </div>
        <div className="ml-6 text-right">
          {incident.dispatcherId ? (
            <>
              <p className="text-sm text-slate-500 mb-1">Dispatcher</p>
              <p className="font-semibold text-slate-100">
                Assigned
              </p>
              {incident.status === 'pending' || incident.status === 'active' ? (
                <p className="text-xs text-yellow-300 mt-1">Awaiting Acceptance</p>
              ) : incident.status === 'enroute' ? (
                <p className="text-xs text-blue-300 mt-1">En Route</p>
              ) : incident.status === 'on_scene' ? (
                <p className="text-xs text-purple-300 mt-1">On Scene</p>
              ) : null}
            </>
          ) : (
            <span className="px-3 py-1 bg-yellow-500/10 text-yellow-200 text-sm font-medium rounded-full border border-yellow-500/30">
              Unassigned
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 pt-4 border-t border-slate-800">
        <button 
          onClick={() => setIsDetailsModalOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          View Details
        </button>
        <button
          onClick={() => setIsAssignModalOpen(true)}
          className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors font-medium"
        >
          {incident.dispatcherId ? 'Change Dispatcher' : 'Assign Dispatcher'}
        </button>
      </div>

      <IncidentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        incident={incident}
      />

      <AssignDispatcherModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        incidentId={incident.id}
        currentDispatcherId={incident.dispatcherId || null}
        onAssignSuccess={() => {
          setIsAssignModalOpen(false)
          onUpdate?.()
        }}
      />
    </div>
  )
}

