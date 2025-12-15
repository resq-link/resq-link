'use client'

import StatusBadge from './StatusBadge'

interface Incident {
  id: string
  type: string
  location: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'pending' | 'resolved'
  reportedAt: Date
  description: string
  responder: string | null
}

interface IncidentCardProps {
  incident: Incident
}

export default function IncidentCard({ incident }: IncidentCardProps) {
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
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold text-gray-900">
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
          <p className="text-gray-700 mb-3">{incident.description}</p>
          <div className="flex items-center gap-4 text-sm text-gray-600">
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
          {incident.responder ? (
            <>
              <p className="text-sm text-gray-500 mb-1">Responder</p>
              <p className="font-semibold text-gray-900">
                {incident.responder}
              </p>
            </>
          ) : (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
              Awaiting Response
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
          View Details
        </button>
        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
          Assign Responder
        </button>
      </div>
    </div>
  )
}

