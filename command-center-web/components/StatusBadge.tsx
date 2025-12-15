'use client'

interface StatusBadgeProps {
  status: 'active' | 'pending' | 'resolved'
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <span
      className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusStyles(
        status
      )}`}
    >
      {status.toUpperCase()}
    </span>
  )
}

