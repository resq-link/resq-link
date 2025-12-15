'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import the map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
})

// Mock incident data with coordinates for map display
const mockIncidents = [
  {
    id: '1',
    type: 'Medical Emergency',
    location: '123 Main St, Downtown',
    priority: 'high',
    status: 'active',
    lat: 37.7749,
    lng: -122.4194,
    reportedAt: new Date(Date.now() - 5 * 60000),
    responder: 'Unit Alpha-1',
  },
  {
    id: '2',
    type: 'Fire',
    location: '456 Oak Ave, Industrial District',
    priority: 'critical',
    status: 'active',
    lat: 37.7849,
    lng: -122.4094,
    reportedAt: new Date(Date.now() - 15 * 60000),
    responder: 'Fire Engine 3',
  },
  {
    id: '3',
    type: 'Traffic Accident',
    location: 'Highway 101, Mile Marker 42',
    priority: 'medium',
    status: 'active',
    lat: 37.7649,
    lng: -122.4294,
    reportedAt: new Date(Date.now() - 8 * 60000),
    responder: 'Unit Bravo-2',
  },
  {
    id: '4',
    type: 'Medical Emergency',
    location: '789 Elm St, Residential Area',
    priority: 'medium',
    status: 'pending',
    lat: 37.7549,
    lng: -122.4394,
    reportedAt: new Date(Date.now() - 2 * 60000),
    responder: null,
  },
]

export default function MapPage() {
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  const filteredIncidents = mockIncidents.filter((incident) => {
    if (filter === 'all') return true
    return incident.status === filter
  })

  // Get user's current location on component mount
  useEffect(() => {
    getCurrentLocation()
  }, [])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setIsLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation([latitude, longitude])
        setIsLocating(false)
      },
      (error) => {
        setIsLocating(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location access denied by user')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information unavailable')
            break
          case error.TIMEOUT:
            setLocationError('Location request timed out')
            break
          default:
            setLocationError('An unknown error occurred')
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Incident Map
            </h1>
            <p className="text-gray-600">
              Real-time geographic view of all incidents
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'active'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="h-[600px] w-full relative">
          <MapComponent
            incidents={filteredIncidents}
            selectedIncident={selectedIncident}
            onIncidentSelect={setSelectedIncident}
            userLocation={userLocation}
          />
          {/* Location Button */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            <button
              onClick={getCurrentLocation}
              disabled={isLocating}
              className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg shadow-lg border border-gray-200 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Get current location"
            >
              {isLocating ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
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
                  <span>My Location</span>
                </>
              )}
            </button>
            {locationError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm max-w-xs">
                {locationError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Incident List Sidebar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Incidents on Map ({filteredIncidents.length})
        </h2>
        <div className="space-y-3">
          {filteredIncidents.map((incident) => (
            <div
              key={incident.id}
              onClick={() => setSelectedIncident(incident.id)}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedIncident === incident.id
                  ? 'border-primary-500 bg-primary-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {incident.type}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        incident.priority === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : incident.priority === 'high'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {incident.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {incident.location}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      {incident.reportedAt.toLocaleTimeString()}
                    </span>
                    {incident.responder && (
                      <span>Responder: {incident.responder}</span>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <div
                    className={`w-4 h-4 rounded-full ${
                      incident.status === 'active'
                        ? 'bg-red-500 animate-pulse'
                        : 'bg-yellow-500'
                    }`}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

