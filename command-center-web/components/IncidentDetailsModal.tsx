'use client'

interface IncidentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  incident: {
    id: string
    type: string
    location: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    status: 'pending' | 'enroute' | 'on_scene' | 'done' | 'active' | 'resolved'
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
        return 'bg-red-100 text-red-800 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'enroute':
        return 'bg-blue-100 text-blue-800'
      case 'on_scene':
        return 'bg-purple-100 text-purple-800'
      case 'done':
        return 'bg-green-100 text-green-800'
      case 'active':
        return 'bg-red-100 text-red-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Incident Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
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
          <div className="space-y-6">
            {/* Image Section */}
            {incident.imageUrl && incident.imageUrl.trim() !== '' ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Photo</h3>
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={incident.imageUrl}
                    alt="Incident photo"
                    className="w-full h-auto max-h-96 object-contain bg-gray-50"
                    onError={(e) => {
                      console.error('Image failed to load:', incident.imageUrl)
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = `
                          <div class="p-8 text-center text-gray-500">
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
              <div className="text-center py-4 text-gray-500 text-sm">
                No photo available for this incident
              </div>
            )}

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Incident Type</span>
                  <span className="text-sm font-semibold text-gray-900">{incident.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Status</span>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      incident.status
                    )}`}
                  >
                    {incident.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Priority</span>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(
                      incident.priority
                    )}`}
                  >
                    {incident.priority.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Reported At</span>
                  <span className="text-sm text-gray-900">
                    {incident.reportedAt.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Location</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0"
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
                    <p className="text-gray-900">{incident.location}</p>
                    {incident.latitude && incident.longitude && (
                      <p className="text-sm text-gray-500 mt-1">
                        Coordinates: {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-900 whitespace-pre-wrap">
                  {incident.description || 'No description provided'}
                </p>
              </div>
            </div>

            {/* Responder Information */}
            {incident.responder && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Assigned Responder</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 font-medium">{incident.responder}</p>
                </div>
              </div>
            )}

            {/* Incident ID */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Incident ID</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-mono text-gray-600">{incident.id}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200">
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
  )
}

