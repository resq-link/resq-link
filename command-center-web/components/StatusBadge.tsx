'use client'

interface StatusBadgeProps {
  status: 'pending' | 'enroute' | 'on_scene' | 'done' | 'active' | 'resolved' // Support both new and legacy statuses
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'enroute':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'on_scene':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'done':
        return 'bg-green-100 text-green-800 border-green-300'
      // Legacy statuses for backward compatibility
      case 'active':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'PENDING'
      case 'enroute':
        return 'EN ROUTE'
      case 'on_scene':
        return 'ON SCENE'
      case 'done':
        return 'DONE'
      case 'active':
        return 'ACTIVE'
      case 'resolved':
        return 'RESOLVED'
      default:
        return status.toUpperCase()
    }
  }

  return (
    <span
      className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusStyles(
        status
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  )
}

