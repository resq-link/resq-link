'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { DispatcherLocation } from '@packages/firebase'

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
  dispatcherLocations?: DispatcherLocation[]
  selectedIncident: string | null
  onIncidentSelect: (id: string) => void
  userLocation?: [number, number] | null
  centerLocation?: [number, number] | null
}

const DEFAULT_CENTER: [number, number] = [17.6132, 121.7270]
const DEFAULT_ZOOM = 12
const TUGUEGARAO_BOUNDARY: [number, number][] = [
  [17.572822, 121.682675],
  [17.605113, 121.685138],
  [17.667388, 121.711474],
  [17.684329, 121.753949],
  [17.684819, 121.783966],
  [17.64311, 121.759095],
  [17.531672, 121.821358],
  [17.525943, 121.789454],
  [17.560152, 121.775578],
  [17.579299, 121.744189],
  [17.603844, 121.724618],
  [17.57079, 121.697535],
]

const TIME_ZONE = 'Asia/Manila'
const TIME_FORMATTER = new Intl.DateTimeFormat('en-PH', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
})

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-PH', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
})

function formatTime(value: Date | null): string {
  if (!value) return '—'
  return TIME_FORMATTER.format(value)
}

function formatDateTime(value: Date): string {
  return DATE_TIME_FORMATTER.format(value)
}

// Component to handle map center updates
function MapCenter({
  center,
  zoom,
}: {
  center: [number, number]
  zoom: number
}) {
  const map = useMap()
  const [lat, lng] = center

  useEffect(() => {
    map.setView([lat, lng], zoom)
  }, [map, lat, lng, zoom])
  return null
}

function EnsureMapInteractions() {
  const map = useMap()

  useEffect(() => {
    // Keep interactions explicitly enabled after mount. This protects against
    // layout lifecycle quirks that can leave handlers disabled.
    map.dragging.enable()
    map.touchZoom.enable()
    map.doubleClickZoom.enable()
    map.scrollWheelZoom.enable()
    map.boxZoom.enable()
    map.keyboard.enable()
    // Ensure Leaflet recalculates viewport size once the layout settles.
    const id = window.requestAnimationFrame(() => {
      map.invalidateSize()
    })

    return () => {
      window.cancelAnimationFrame(id)
    }
  }, [map])

  return null
}

export default function MapComponent({
  incidents,
  dispatcherLocations = [],
  selectedIncident,
  onIncidentSelect,
  userLocation,
  centerLocation,
}: MapComponentProps) {
  const [mounted, setMounted] = useState(false)

  // Fix default marker icons after client mount (avoids hydration attribute mismatches).
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })
  }, [])

  // Leaflet should only mount after the first client paint to keep server/client
  // markup deterministic and avoid Leaflet DOM initialization during SSR.
  useEffect(() => {
    setMounted(true)
  }, [])

  const getLastUpdatedDate = (value: DispatcherLocation['lastUpdated']) => {
    if (!value) return null
    if (value instanceof Date) return value
    const maybeTimestamp = value as unknown as { toDate?: () => Date }
    if (typeof maybeTimestamp?.toDate === 'function') return maybeTimestamp.toDate()
    return new Date(value as unknown as string | number)
  }

  // Priority: centerLocation (selected incident) > userLocation > default
  const mapCenter = useMemo<[number, number]>(() => {
    if (centerLocation) return [centerLocation[0], centerLocation[1]]
    if (userLocation) return [userLocation[0], userLocation[1]]
    return DEFAULT_CENTER
  }, [centerLocation, userLocation])
  const mapZoom = useMemo(() => (centerLocation ? 15 : userLocation ? 14 : DEFAULT_ZOOM), [centerLocation, userLocation])
  const stableBoundary = useMemo(() => TUGUEGARAO_BOUNDARY, [])
  const visibleIncidents = useMemo(
    () => incidents.filter((incident) => Number.isFinite(incident.lat) && Number.isFinite(incident.lng)),
    [incidents]
  )
  const stableDispatcherLocations = useMemo(
    () => dispatcherLocations.filter((dispatcher) => Number.isFinite(dispatcher.latitude) && Number.isFinite(dispatcher.longitude)),
    [dispatcherLocations]
  )

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

  // Create minimal dispatcher location marker icon
  const createDispatcherIcon = (role: string) => {
    const roleColors: Record<string, string> = {
      BFP: '#dc2626', // red
      PNP: '#1e40af', // blue
      MDRRMO: '#059669', // green
      AMBULANCE: '#ea580c', // orange
      PCG: '#0284c7', // cyan
    }
    const color = roleColors[role] || '#6b7280' // gray default
    
    return L.divIcon({
      className: 'dispatcher-marker',
      html: `
        <div style="
          position: relative;
          width: 24px;
          height: 24px;
        ">
          <div style="
            width: 24px;
            height: 24px;
            background-color: ${color};
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
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

  if (!mounted) {
    return <div className="h-full w-full" aria-hidden />
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
    <div
      className="relative z-0 h-full w-full overflow-hidden pointer-events-auto"
      style={{ height: '100%', width: '100%' }}
    >
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%', pointerEvents: 'auto', zIndex: 0 }}
        dragging={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        zoomControl={true}
      >
        <EnsureMapInteractions />
        <MapCenter
          center={mapCenter}
          zoom={mapZoom}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={mapboxUrl!}
          tileSize={512}
          zoomOffset={-1}
        />
        {/* Geofence Polygon */}
        <Polygon
          positions={stableBoundary}
          interactive={false}
          pathOptions={{
            color: '#ef4444',
            dashArray: '10, 10',
            fillColor: '#ef4444',
            fillOpacity: 0.1,
            weight: 3,
          }}
        >
          <Popup>
            <div className="p-1">
              <p className="font-bold text-red-400">Tuguegarao City Geofence</p>
              <p className="text-xs text-slate-400 font-medium italic mt-1">Operational Area</p>
            </div>
          </Popup>
        </Polygon>
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
        {/* Dispatcher Location Markers */}
        {stableDispatcherLocations.length > 0 && (
          <>
            {stableDispatcherLocations.map((dispatcher) => {
              // Validate coordinates
              if (
                !dispatcher.latitude ||
                !dispatcher.longitude ||
                dispatcher.latitude === 0 ||
                dispatcher.longitude === 0 ||
                isNaN(dispatcher.latitude) ||
                isNaN(dispatcher.longitude)
              ) {
                console.warn('Invalid dispatcher coordinates:', dispatcher)
                return null
              }
              
              return (
                <Marker
                  key={dispatcher.dispatcherId}
                  position={[dispatcher.latitude, dispatcher.longitude]}
                  icon={createDispatcherIcon(dispatcher.role)}
                  zIndexOffset={1000}
                >
                  <Popup>
                    <div className="p-3 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              dispatcher.role === 'BFP'
                                ? '#dc2626'
                                : dispatcher.role === 'PNP'
                                ? '#1e40af'
                                : dispatcher.role === 'MDRRMO'
                                ? '#059669'
                                : dispatcher.role === 'AMBULANCE'
                                ? '#ea580c'
                                : dispatcher.role === 'PCG'
                                ? '#0284c7'
                                : '#6b7280',
                          }}
                        ></div>
                        <h3 className="font-bold text-slate-100 text-base">
                          {dispatcher.role} Dispatcher
                        </h3>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-300">
                          <span className="font-medium">Email:</span> {dispatcher.email}
                        </p>
                        <p className="text-xs text-slate-400">
                          <span className="font-medium">Status:</span>{' '}
                          <span className="text-green-400">● Online</span>
                        </p>
                        <p className="text-xs text-slate-400">
                          <span className="font-medium">Last updated:</span>{' '}
                          {formatTime(getLastUpdatedDate(dispatcher.lastUpdated))}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          {dispatcher.latitude.toFixed(6)}, {dispatcher.longitude.toFixed(6)}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </>
        )}
        {/* Incident Markers */}
        {visibleIncidents.map((incident) => (
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
                  {formatDateTime(incident.reportedAt)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

