'use client'

import { useState } from 'react'
import IncidentCard from '@/components/IncidentCard'
import StatusBadge from '@/components/StatusBadge'

// Mock historical data for UI purposes
const mockHistory = [
  {
    id: '101',
    type: 'Medical Emergency',
    location: '123 Main St, Downtown',
    priority: 'high',
    status: 'resolved',
    reportedAt: new Date(Date.now() - 2 * 60 * 60000), // 2 hours ago
    resolvedAt: new Date(Date.now() - 90 * 60000), // 90 minutes ago
    description: 'Cardiac arrest, patient stabilized and transported',
    responder: 'Unit Alpha-1',
    duration: '30 minutes',
  },
  {
    id: '102',
    type: 'Fire',
    location: '456 Oak Ave, Industrial District',
    priority: 'critical',
    status: 'resolved',
    reportedAt: new Date(Date.now() - 4 * 60 * 60000), // 4 hours ago
    resolvedAt: new Date(Date.now() - 3 * 60 * 60000), // 3 hours ago
    description: 'Structure fire extinguished, no injuries',
    responder: 'Fire Engine 3',
    duration: '1 hour',
  },
  {
    id: '103',
    type: 'Traffic Accident',
    location: 'Highway 101, Mile Marker 42',
    priority: 'medium',
    status: 'resolved',
    reportedAt: new Date(Date.now() - 6 * 60 * 60000), // 6 hours ago
    resolvedAt: new Date(Date.now() - 5 * 60 * 60000), // 5 hours ago
    description: 'Multi-vehicle collision cleared, minor injuries treated',
    responder: 'Unit Bravo-2',
    duration: '1 hour',
  },
  {
    id: '104',
    type: 'Medical Emergency',
    location: '789 Elm St, Residential Area',
    priority: 'low',
    status: 'resolved',
    reportedAt: new Date(Date.now() - 8 * 60 * 60000), // 8 hours ago
    resolvedAt: new Date(Date.now() - 7.5 * 60 * 60000), // 7.5 hours ago
    description: 'Elderly fall, treated on scene',
    responder: 'Unit Charlie-3',
    duration: '30 minutes',
  },
  {
    id: '105',
    type: 'Fire Alarm',
    location: '321 Pine St, Office Building',
    priority: 'medium',
    status: 'resolved',
    reportedAt: new Date(Date.now() - 12 * 60 * 60000), // 12 hours ago
    resolvedAt: new Date(Date.now() - 11.5 * 60 * 60000), // 11.5 hours ago
    description: 'False alarm, system reset',
    responder: 'Fire Engine 1',
    duration: '30 minutes',
  },
]

export default function HistoryPage() {
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredHistory = mockHistory.filter((incident) => {
    const matchesFilter =
      selectedFilter === 'all' || incident.status === selectedFilter
    const matchesSearch =
      searchQuery === '' ||
      incident.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.location.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Incident History
        </h1>
        <p className="text-slate-400">
          View past incidents and response records
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by type or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedFilter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedFilter('resolved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedFilter === 'resolved'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              Resolved
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-400">Total Incidents</p>
          <p className="text-3xl font-bold text-slate-100 mt-2">
            {mockHistory.length}
          </p>
        </div>
        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-400">Resolved Today</p>
          <p className="text-3xl font-bold text-emerald-300 mt-2">
            {mockHistory.filter(
              (i) =>
                i.resolvedAt &&
                i.resolvedAt.getTime() > Date.now() - 24 * 60 * 60000
            ).length}
          </p>
        </div>
        <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-400">Avg Response Time</p>
          <p className="text-3xl font-bold text-blue-300 mt-2">45 min</p>
        </div>
      </div>

      {/* History List */}
      <div className="bg-slate-900/70 rounded-lg shadow-md shadow-black/20 border border-slate-800 p-6">
        <h2 className="text-2xl font-bold text-slate-100 mb-6">
          Past Incidents ({filteredHistory.length})
        </h2>

        <div className="space-y-4">
          {filteredHistory.map((incident) => (
            <div
              key={incident.id}
              className="border border-slate-800 rounded-lg p-6 hover:shadow-md hover:shadow-black/30 transition-shadow bg-slate-950/60"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-slate-100">
                      {incident.type}
                    </h3>
                    <StatusBadge status={incident.status} />
                  </div>
                  <p className="text-slate-400 mb-2">{incident.description}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
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
                      {incident.reportedAt.toLocaleString()}
                    </span>
                    {incident.resolvedAt && (
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
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Resolved: {incident.resolvedAt.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Responder</p>
                  <p className="font-medium text-slate-100">
                    {incident.responder}
                  </p>
                  {incident.duration && (
                    <p className="text-sm text-slate-500 mt-1">
                      Duration: {incident.duration}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredHistory.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No incidents found</p>
            <p className="text-slate-500 text-sm mt-2">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

