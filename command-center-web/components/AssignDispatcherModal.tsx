'use client'

import { useState, useEffect } from 'react'
import { getAllDispatchers, assignDispatcherToEmergency, type DispatcherAccount, auth, verifyCommandCenterUser } from '@packages/firebase'

interface AssignDispatcherModalProps {
  isOpen: boolean
  onClose: () => void
  incidentId: string
  currentDispatcherId?: string | null
  onAssignSuccess?: () => void
}

export default function AssignDispatcherModal({
  isOpen,
  onClose,
  incidentId,
  currentDispatcherId,
  onAssignSuccess,
}: AssignDispatcherModalProps) {
  const [dispatchers, setDispatchers] = useState<Array<{ uid: string; account: DispatcherAccount }>>([])
  const [selectedDispatcherId, setSelectedDispatcherId] = useState<string>(currentDispatcherId || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDispatchers, setIsLoadingDispatchers] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadDispatchers()
      setSelectedDispatcherId(currentDispatcherId || '')
    }
  }, [isOpen, currentDispatcherId])

  const loadDispatchers = async () => {
    setIsLoadingDispatchers(true)
    setError(null)
    try {
      // Verify user is authenticated
      if (!auth.currentUser) {
        throw new Error('You must be logged in to assign dispatchers')
      }
      
      // Check if user has command center document
      const isCommandCenter = await verifyCommandCenterUser()
      if (!isCommandCenter) {
        throw new Error('Command center profile not found. Please ensure your account is properly set up in Firestore.')
      }
      
      const dispatchersList = await getAllDispatchers()
      setDispatchers(dispatchersList)
    } catch (err: any) {
      console.error('Error loading dispatchers:', err)
      if (err.message?.includes('permissions') || err.message?.includes('permission')) {
        setError('Permission denied. Please ensure:\n1. You are logged in as a command center user\n2. Your account has a document in the "commandCenters" collection in Firestore\n3. The document ID matches your user UID')
      } else {
        setError(err.message || 'Failed to load dispatchers')
      }
    } finally {
      setIsLoadingDispatchers(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedDispatcherId) {
      setError('Please select a dispatcher')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await assignDispatcherToEmergency(incidentId, selectedDispatcherId)
      onAssignSuccess?.()
      onClose()
    } catch (err: any) {
      console.error('Error assigning dispatcher:', err)
      setError(err.message || 'Failed to assign dispatcher')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnassign = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Unassign by passing null
      await assignDispatcherToEmergency(incidentId, null)
      onAssignSuccess?.()
      onClose()
    } catch (err: any) {
      console.error('Error unassigning dispatcher:', err)
      setError(err.message || 'Failed to unassign dispatcher')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const selectedDispatcher = dispatchers.find((d) => d.uid === selectedDispatcherId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-100">Assign Dispatcher</h2>
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

          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-900/60 text-red-200 rounded">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Dispatcher
            </label>
            {isLoadingDispatchers ? (
              <div className="p-4 text-center text-slate-400">Loading dispatchers...</div>
            ) : dispatchers.length === 0 ? (
              <div className="p-4 text-center text-slate-400">No active dispatchers available</div>
            ) : (
              <select
                value={selectedDispatcherId}
                onChange={(e) => setSelectedDispatcherId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-100 bg-slate-900"
                disabled={isLoading}
              >
                <option value="" className="text-slate-100">-- Select a dispatcher --</option>
                {dispatchers.map((dispatcher) => (
                  <option key={dispatcher.uid} value={dispatcher.uid} className="text-slate-100">
                    {dispatcher.account.role} - {dispatcher.account.email}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedDispatcher && (
            <div className="mb-4 p-3 bg-slate-950 rounded-lg border border-slate-800">
              <p className="text-sm text-slate-300">
                <span className="font-medium text-slate-200">Role:</span> {selectedDispatcher.account.role}
              </p>
              <p className="text-sm text-slate-300">
                <span className="font-medium text-slate-200">Email:</span> {selectedDispatcher.account.email}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {currentDispatcherId && (
              <button
                onClick={handleUnassign}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50"
              >
                Unassign
              </button>
            )}
            <button
              onClick={handleAssign}
              disabled={isLoading || !selectedDispatcherId}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
            >
              {isLoading ? 'Assigning...' : currentDispatcherId ? 'Reassign' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

