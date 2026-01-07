'use client'

import { useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

interface Incident {
  id: string
  type: string
  location: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'pending' | 'resolved'
  lat: number
  lng: number
  reportedAt: Date
  responder: string | null
}

interface MapComponentProps {
  incidents: Incident[]
  selectedIncident: string | null
  onIncidentSelect: (id: string) => void
  userLocation?: [number, number] | null
  centerLocation?: [number, number] | null
}

// Component to handle map center updates
function MapCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])
  return null
}

export default function MapComponent({
  incidents,
  selectedIncident,
  onIncidentSelect,
  userLocation,
  centerLocation,
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null)

  // Default center (San Francisco - adjust to your area)
  const defaultCenter: [number, number] = [37.7749, -122.4194]
  const defaultZoom = 12
  
  // Priority: centerLocation (selected incident) > userLocation > default
  const mapCenter = centerLocation || userLocation || defaultCenter
  const mapZoom = centerLocation ? 15 : (userLocation ? 14 : defaultZoom) // Zoom in more for selected incident

  const getMarkerColor = (priority: string, status: string) => {
    if (status === 'pending') return '#eab308' // yellow
    if (priority === 'critical') return '#dc2626' // red
    if (priority === 'high') return '#ea580c' // orange
    if (priority === 'medium') return '#f59e0b' // amber
    return '#10b981' // green
  }

  const createCustomIcon = (priority: string, status: string) => {
    const color = getMarkerColor(priority, status)
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 24px;
          height: 24px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          <div style="
            transform: rotate(45deg);
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
          ">!</div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24],
    })
  }

  // Create user location marker icon
  const createUserLocationIcon = () => {
    return L.divIcon({
      className: 'user-location-marker',
      html: `
        <div style="
          position: relative;
          width: 40px;
          height: 40px;
        ">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #3b82f6;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            z-index: 2;
          "></div>
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 2px solid #3b82f6;
            opacity: 0.3;
            animation: pulse 2s infinite;
          "></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    })
  }

  // Get Mapbox access token from environment variable
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''
  const mapboxStyle = process.env.NEXT_PUBLIC_MAPBOX_STYLE || 'mapbox/streets-v12'

  // Mapbox tile URL format
  const mapboxUrl = mapboxToken
    ? `https://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`
    : null

  // Show error if Mapbox token is not configured
  if (!mapboxToken) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-950 rounded-lg border border-slate-800">
        <div className="text-center p-8">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-yellow-300"
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
          <h3 className="text-xl font-semibold text-slate-100 mb-2">
            Mapbox API Key Required
          </h3>
          <p className="text-slate-400 mb-4">
            Please configure your Mapbox access token in the environment variables.
          </p>
          <div className="bg-slate-900 text-slate-100 p-4 rounded-lg text-left text-sm font-mono border border-slate-800">
            <p className="mb-2">Create a <code className="text-secondary-300">.env.local</code> file with:</p>
            <code className="block">
              NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token_here
            </code>
          </div>
          <p className="text-sm text-slate-500 mt-4">
            Get your token from{' '}
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary-300 hover:underline"
            >
              Mapbox Account
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      style={{ height: '100%', width: '100%' }}
      ref={mapRef}
    >
      <MapCenter center={mapCenter} zoom={mapZoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url={mapboxUrl!}
        tileSize={512}
        zoomOffset={-1}
      />
      {/* User Location Marker */}
      {userLocation && (
        <Marker position={userLocation} icon={createUserLocationIcon()}>
          <Popup>
            <div className="p-2">
              <h3 className="font-bold text-slate-100 mb-1">Your Location</h3>
              <p className="text-sm text-slate-400">
                {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}
      {incidents.map((incident) => (
        <Marker
          key={incident.id}
          position={[incident.lat, incident.lng]}
          icon={createCustomIcon(incident.priority, incident.status)}
          eventHandlers={{
            click: () => onIncidentSelect(incident.id),
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-bold text-slate-100 mb-1">
                {incident.type}
              </h3>
              <p className="text-sm text-slate-400 mb-2">
                {incident.location}
              </p>
              <div className="flex items-center gap-2 mb-2">
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
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    incident.status === 'active'
                      ? 'bg-red-100 text-red-800'
                      : incident.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {incident.status}
                </span>
              </div>
              {incident.responder && (
                <p className="text-xs text-slate-500">
                  Responder: {incident.responder}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {incident.reportedAt.toLocaleString()}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

