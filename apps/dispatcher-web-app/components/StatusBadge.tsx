'use client'

interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-200 border-yellow-500/30'
      case 'enroute':
        return 'bg-blue-500/10 text-blue-200 border-blue-500/30'
      case 'on_scene':
        return 'bg-purple-500/10 text-purple-200 border-purple-500/30'
      case 'done':
        return 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
      // Legacy statuses for backward compatibility
      case 'active':
        return 'bg-red-500/10 text-red-200 border-red-500/30'
      case 'resolved':
        return 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
      default:
        return 'bg-slate-800 text-slate-200 border-slate-700'
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

