'use client'

import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'

const IncidentMap = dynamic(() => import('./IncidentMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-900 text-slate-400">
      <span>Loading map...</span>
    </div>
  ),
})

interface IncidentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  incident: {
    id: string
    type: string
    location: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    status: string
    reportedAt: Date
    description: string
    responder: string | null
    dispatcherId?: string | null
    imageUrl?: string | null
    latitude?: number | null
    longitude?: number | null
  }
}

export default function IncidentDetailsModal({
  isOpen,
  onClose,
  incident,
}: IncidentDetailsModalProps) {
  if (!isOpen) return null

  // Debug logging
  console.log('IncidentDetailsModal - incident data:', incident)
  console.log('IncidentDetailsModal - imageUrl:', incident.imageUrl)

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-500/10 text-red-200'
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-200'
      case 'resolved':
        return 'bg-emerald-500/10 text-emerald-200'
      default:
        return 'bg-slate-800 text-slate-200'
    }
  }

  return createPortal(
    <>
      {/* Modal Container - covers full viewport */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box'
        }}
      >
        {/* Modal Content */}
        <div 
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '8px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            maxWidth: '640px',
            width: '100%',
            margin: '16px',
            padding: '20px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-100">Incident Details</h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Image Section */}
              {incident.imageUrl && incident.imageUrl.trim() !== '' ? (
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">Photo</h3>
                  <div className="rounded-lg overflow-hidden border border-slate-800">
                    <img
                      src={incident.imageUrl}
                      alt="Incident photo"
                      className="w-full h-auto max-h-96 object-contain bg-slate-950"
                      onError={(e) => {
                        console.error('Image failed to load:', incident.imageUrl)
                        // Fallback if image fails to load
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = `
                            <div class="p-8 text-center text-slate-400">
                              <p>Failed to load image</p>
                              <p class="text-sm mt-2 break-all">${incident.imageUrl}</p>
                            </div>
                          `
                        }
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', incident.imageUrl)
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400 text-sm">
                  No photo available for this incident
                </div>
              )}

              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">Basic Information</h3>
                <div className="bg-slate-950 rounded-lg p-4 space-y-3 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-400">Incident Type</span>
                    <span className="text-sm font-semibold text-slate-100">{incident.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-400">Status</span>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        incident.status
                      )}`}
                    >
                      {incident.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-400">Priority</span>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(
                        incident.priority
                      )}`}
                    >
                      {incident.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-400">Reported At</span>
                    <span className="text-sm text-slate-100">
                      {incident.reportedAt.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">Location</h3>
                {incident.latitude != null && incident.longitude != null ? (
                  <div className="space-y-3">
                    <div className="h-[220px] w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                      <IncidentMap
                        latitude={incident.latitude}
                        longitude={incident.longitude}
                        locationText={incident.location}
                        incidentType={incident.type}
                        className="h-full w-full"
                      />
                    </div>
                    <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                      <div className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0"
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
                        <div className="flex-1">
                          <p className="text-slate-100">{incident.location}</p>
                          <p className="text-sm text-slate-400 mt-1">
                            Coordinates: {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0"
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
                      <div className="flex-1">
                        <p className="text-slate-100">{incident.location}</p>
                        <p className="text-sm text-slate-400 mt-2">Map unavailable — no coordinates recorded</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">Description</h3>
                <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                  <p className="text-slate-100 whitespace-pre-wrap">
                    {incident.description || 'No description provided'}
                  </p>
                </div>
              </div>

              {/* Responder */}
              {incident.responder && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">Responder</h3>
                  <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                    <p className="text-slate-100">{incident.responder}</p>
                  </div>
                </div>
              )}

              {/* Incident ID */}
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">Incident ID</h3>
                <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                  <p className="text-sm font-mono text-slate-400">{incident.id}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
