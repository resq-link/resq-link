'use client'

import { useState, useEffect } from 'react'
import IncidentCard from '@/components/IncidentCard'
import StatusBadge from '@/components/StatusBadge'

// Mock data for UI purposes
const mockIncidents = [
  {
    id: '1',
    type: 'Medical Emergency',
    location: '123 Main St, Downtown',
    priority: 'high',
    status: 'active',
    reportedAt: new Date(Date.now() - 5 * 60000), // 5 minutes ago
    description: 'Cardiac arrest reported, CPR in progress',
    responder: 'Unit Alpha-1',
  },
  {
    id: '2',
    type: 'Fire',
    location: '456 Oak Ave, Industrial District',
    priority: 'critical',
    status: 'active',
    reportedAt: new Date(Date.now() - 15 * 60000), // 15 minutes ago
    description: 'Structure fire, multiple units responding',
    responder: 'Fire Engine 3',
  },
  {
    id: '3',
    type: 'Traffic Accident',
    location: 'Highway 101, Mile Marker 42',
    priority: 'medium',
    status: 'active',
    reportedAt: new Date(Date.now() - 8 * 60000), // 8 minutes ago
    description: 'Multi-vehicle collision, injuries reported',
    responder: 'Unit Bravo-2',
  },
  {
    id: '4',
    type: 'Medical Emergency',
    location: '789 Elm St, Residential Area',
    priority: 'medium',
    status: 'pending',
    reportedAt: new Date(Date.now() - 2 * 60000), // 2 minutes ago
    description: 'Elderly fall, requesting ambulance',
    responder: null,
  },
]

export default function Home() {
  const [incidents, setIncidents] = useState(mockIncidents)
  const [activeCount, setActiveCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    // Update counts
    setActiveCount(incidents.filter(i => i.status === 'active').length)
    setPendingCount(incidents.filter(i => i.status === 'pending').length)

    // Simulate real-time updates (for UI demo purposes)
    const interval = setInterval(() => {
      // In a real app, this would fetch from Firebase
      console.log('Simulating real-time update...')
    }, 5000)

    return () => clearInterval(interval)
  }, [incidents])

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Live Incident Dashboard
        </h1>
        <p className="text-gray-600">
          Real-time monitoring of emergency incidents
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Incidents</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {incidents.length}
              </p>
            </div>
            <div className="bg-blue-100 rounded-full p-4">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Incidents</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {activeCount}
              </p>
            </div>
            <div className="bg-red-100 rounded-full p-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Response</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {pendingCount}
              </p>
            </div>
            <div className="bg-yellow-100 rounded-full p-4">
              <svg
                className="w-8 h-8 text-yellow-600"
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
            </div>
          </div>
        </div>
      </div>

      {/* Live Incidents List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Live Incidents
          </h2>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>

        <div className="space-y-4">
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>

        {incidents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No active incidents</p>
            <p className="text-gray-400 text-sm mt-2">
              All clear - no emergencies reported
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

