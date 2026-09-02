'use client'

import { useRef, useEffect, useState, Fragment } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon, GeoJSON, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { loadBarangayGeojson } from '@/lib/barangayGeojson'
import {
  BARANGAY_QUADRANT_MAPPING,
  QUADRANT_COLORS,
  QUADRANT_LABELS,
  type DispatcherLocation,
  getPriorityMapColor,
  normalizePriority,
} from '@packages/firebase'

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
  rawStatus?: string
  lat: number
  lng: number
  reportedAt: Date
  responder: string | null
  dispatcherId?: string | null
  assignedTeamName?: string | null
  peopleInvolved?: number | null
  landmark?: string | null
}

// Calculate distance in kilometers using Haversine formula
const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Calculate estimated travel time & distance for emergency response
const calculateETA = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const distanceKm = calculateDistanceKm(lat1, lon1, lat2, lon2)
  if (distanceKm < 0.05) {
    return {
      distanceKm,
      minutes: 0,
      text: 'Arrived on scene',
      shortText: 'On Scene',
      isOnScene: true,
    }
  }

  // 1.3x routing multiplier for city road grid, average speed 35km/h, 1 min dispatch buffer
  const roadDistanceKm = distanceKm * 1.3
  const minutes = Math.max(1, Math.round((roadDistanceKm / 35) * 60 + 1))
  const distLabel = distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)} km`

  return {
    distanceKm,
    minutes,
    text: `~${minutes} min${minutes > 1 ? 's' : ''} (${distLabel})`,
    shortText: `ETA ~${minutes}m (${distLabel})`,
    isOnScene: false,
  }
}

// Helper to calculate position along a line segment at fraction t
const getPointAlongLine = (lat1: number, lng1: number, lat2: number, lng2: number, t: number): [number, number] => {
  return [lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t]
}

// Helper to calculate CSS rotation angle for arrowhead in degrees
const getAngle = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const dy = lat2 - lat1
  const dx = lng2 - lng1
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI
  return -angle
}

interface MapComponentProps {
  incidents: Incident[]
  dispatcherLocations?: DispatcherLocation[]
  selectedIncident: string | null
  onIncidentSelect: (id: string) => void
  userLocation?: [number, number] | null
  centerLocation?: [number, number] | null
}

// Component to handle map center updates without resetting manual user zoom
function MapCenterController({
  centerLocation,
  selectedIncident,
}: {
  centerLocation?: [number, number] | null
  selectedIncident?: string | null
}) {
  const map = useMap()
  const lastTargetRef = useRef<string | null>(null)

  useEffect(() => {
    if (!centerLocation || !centerLocation[0] || !centerLocation[1]) {
      return
    }

    const targetKey = `${centerLocation[0].toFixed(6)},${centerLocation[1].toFixed(6)}-${selectedIncident || ''}`
    if (lastTargetRef.current === targetKey) {
      return
    }

    lastTargetRef.current = targetKey
    const currentZoom = map.getZoom()
    const targetZoom = Math.max(currentZoom || 12, 15)

    map.flyTo(centerLocation, targetZoom, {
      duration: 0.8,
    })
  }, [centerLocation, map, selectedIncident])

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
  const mapRef = useRef<L.Map | null>(null)
  const [geojsonData, setGeojsonData] = useState<any>(null)
  const [isLegendOpen, setIsLegendOpen] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadBarangayGeojson()
      .then((data) => {
        if (!cancelled) setGeojsonData(data)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const getLastUpdatedDate = (value: DispatcherLocation['lastUpdated']) => {
    if (!value) return null
    if (value instanceof Date) return value
    const maybeTimestamp = value as unknown as { toDate?: () => Date }
    if (typeof maybeTimestamp?.toDate === 'function') return maybeTimestamp.toDate()
    return new Date(value as unknown as string | number)
  }

  // Default center (Tuguegarao City, Cagayan)
  const defaultCenter: [number, number] = [17.6132, 121.7270]
  const defaultZoom = 12

  // Tuguegarao City Boundary Polygon (Keep as reference or remove)
  const TUGUEGARAO_BOUNDARY: [number, number][] = [
    [17.572822, 121.682675],
    [17.605113,121.685138],
    [17.667388,121.711474],
    [17.684329, 121.753949],
    [17.684819, 121.783966],
    [17.643110, 121.759095],
    [17.531672,121.821358],
    [17.525943, 121.789454],
    [17.560152,121.775578],
    [17.579299,121.744189],
    [17.603844,121.724618],
    [17.570790,121.697535]
  ]
  
  // Priority: centerLocation (selected incident) > userLocation > default
  const mapCenter = centerLocation || userLocation || defaultCenter
  const mapZoom = centerLocation ? 15 : (userLocation ? 14 : defaultZoom) // Zoom in more for selected incident

  const getMarkerColor = (priority: string, status: string) => {
    const level = normalizePriority(priority)
    if (status === 'pending' && level === 'low') return '#eab308'
    return getPriorityMapColor(level)
  }

  const createCustomIcon = (priority: string, status: string, isSelected: boolean = false) => {
    const color = getMarkerColor(priority, status)
    const level = normalizePriority(priority)
    const isActive = status === 'active' || status === 'pending'
    const isCritical = level === 'critical'

    const bounceClass = isActive ? 'incident-pin-bouncing' : ''
    const pulseClass = isActive ? (isCritical ? 'incident-ground-pulse-critical' : 'incident-ground-pulse') : ''
    const selectedClass = isSelected ? 'incident-pin-selected' : ''
    const iconSymbol = level === 'critical' ? '⚡' : level === 'high' ? '!' : '⚠'

    return L.divIcon({
      className: `incident-custom-marker-root ${selectedClass}`,
      html: `
        <div class="incident-marker-container ${bounceClass}">
          ${isActive ? `<div class="incident-ground-radar ${pulseClass}" style="--radar-color: ${color};"></div>` : ''}
          <div class="incident-ground-shadow"></div>
          <div class="incident-pin-wrapper">
            <div class="incident-pin-body" style="background-color: ${color}; box-shadow: 0 4px 14px ${color}88;">
              <span class="incident-pin-badge">${iconSymbol}</span>
            </div>
            <div class="incident-pin-beak" style="border-top-color: ${color};"></div>
          </div>
        </div>
      `,
      iconSize: [36, 44],
      iconAnchor: [18, 42],
      popupAnchor: [0, -42],
    })
  }

  // Create responder location marker icon
  const createDispatcherIcon = (role: string, isAssigned: boolean = false) => {
    const roleColors: Record<string, string> = {
      BFP: '#dc2626', // red
      PNP: '#1e40af', // blue
      MDRRMO: '#059669', // green
      AMBULANCE: '#ea580c', // orange
      PCG: '#0284c7', // cyan
    }
    const color = roleColors[role] || '#6b7280' // gray default
    const roleInitials: Record<string, string> = {
      BFP: '🔥',
      PNP: '👮',
      MDRRMO: '🚑',
      AMBULANCE: '🏥',
      PCG: '⚓',
    }
    const initial = roleInitials[role] || '🛡️'

    return L.divIcon({
      className: 'dispatcher-marker',
      html: `
        <div style="
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${
            isAssigned
              ? `<div style="
                  position: absolute;
                  inset: -4px;
                  border-radius: 50%;
                  background: ${color};
                  opacity: 0.35;
                  animation: pulse 1.4s infinite;
                "></div>`
              : ''
          }
          <div style="
            width: 28px;
            height: 28px;
            background-color: ${color};
            border-radius: 50%;
            border: 2.5px solid white;
            box-shadow: 0 3px 8px rgba(0,0,0,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
          ">${initial}</div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
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

  // Style function for GeoJSON
  const quadrantStyle = (feature: any) => {
    const barangayName = feature.properties.ADM4_EN
    const quadrant = BARANGAY_QUADRANT_MAPPING[barangayName] || 'UNKNOWN'
    const settings = QUADRANT_COLORS[quadrant]
    
    return {
      color: settings.color,
      weight: 2,
      opacity: 0.8,
      fillColor: settings.fill,
      fillOpacity: 0.2,
      dashArray: '3',
    }
  }

  const onEachBarangay = (feature: any, layer: L.Layer) => {
    const barangayName = feature.properties.ADM4_EN
    const quadrant = BARANGAY_QUADRANT_MAPPING[barangayName] || 'UNKNOWN'
    
    layer.bindPopup(`
      <div class="p-2 min-w-[150px]">
        <p class="font-bold text-slate-100 text-lg mb-0.5">${barangayName}</p>
        <p class="text-xs font-semibold py-1 px-2 rounded inline-block mb-2" style="background-color: ${QUADRANT_COLORS[quadrant].fill}22; color: ${QUADRANT_COLORS[quadrant].color};">
          ${quadrant}
        </p>
        <p class="text-xs text-slate-400 italic">Tuguegarao City</p>
      </div>
    `)

    layer.on({
      mouseover: (e) => {
        const layer = e.target
        layer.setStyle({
          fillOpacity: 0.5,
          weight: 3,
        })
      },
      mouseout: (e) => {
        const layer = e.target
        layer.setStyle({
          fillOpacity: 0.2,
          weight: 2,
        })
      },
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
    <div className="relative h-full w-full group/map">
      {/* Collapsible Legend */}
      <div className={`absolute top-4 right-4 z-[1000] bg-slate-950/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-2xl transition-all duration-300 pointer-events-auto ${isLegendOpen ? 'w-48 p-4' : 'w-10 h-10 p-0 flex items-center justify-center overflow-hidden'}`}>
        <button 
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          className={`text-slate-400 hover:text-slate-100 transition-colors ${isLegendOpen ? 'absolute top-3 right-3' : 'w-full h-full flex items-center justify-center'}`}
        >
          {isLegendOpen ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
          )}
        </button>
        
        {isLegendOpen && (
          <>
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3">Map Legend</h4>
            <div className="space-y-2.5">
              <div className="border-b border-slate-800/50 pb-2 mb-2">
                <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Quadrants</p>
                {Object.entries(QUADRANT_COLORS).filter(([k]) => k !== 'UNKNOWN').map(([name, style]) => (
                  <div key={name} className="flex items-center gap-2 mb-1.5 last:mb-0">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: style.fill, border: `1px solid ${style.color}` }}></div>
                    <span className="text-[10px] font-medium text-slate-300">{QUADRANT_LABELS[name as keyof typeof QUADRANT_LABELS]}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Incident Priority</p>
                {[
                  { label: 'Critical', color: '#dc2626' },
                  { label: 'High', color: '#ea580c' },
                  { label: 'Medium', color: '#f59e0b' },
                  { label: 'Pending', color: '#eab308' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 mb-1.5 last:mb-0">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-[10px] font-medium text-slate-300">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        zoomControl={false}
      >
        <MapCenterController centerLocation={centerLocation} selectedIncident={selectedIncident} />
        <TileLayer
          attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={mapboxUrl!}
          tileSize={512}
          zoomOffset={-1}
        />
        
        {/* Barangay Quadrants Geofence */}
        {geojsonData && (
          <GeoJSON 
            data={geojsonData} 
            style={quadrantStyle}
            onEachFeature={onEachBarangay}
          />
        )}

        {/* Original City Boundary (Optional dashed white line) */}
        <Polygon
          positions={TUGUEGARAO_BOUNDARY}
          pathOptions={{
            color: 'white',
            dashArray: '10, 10',
            fillOpacity: 0,
            weight: 1,
            opacity: 0.3,
          }}
          interactive={false}
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
        {/* Dispatcher Location Markers */}
        {dispatcherLocations.length > 0 && (
          <>
            {dispatcherLocations.map((dispatcher) => {
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

              // Match active assigned incident
              const assignedIncident = incidents.find(
                (inc) =>
                  (inc.dispatcherId && inc.dispatcherId === dispatcher.dispatcherId) ||
                  (inc.responder && dispatcher.email && inc.responder.toLowerCase().includes(dispatcher.email.toLowerCase()))
              )

              const isAssigned = !!assignedIncident
              const etaInfo = assignedIncident
                ? calculateETA(
                    dispatcher.latitude,
                    dispatcher.longitude,
                    assignedIncident.lat,
                    assignedIncident.lng
                  )
                : null

              const roleColors: Record<string, string> = {
                BFP: '#dc2626',
                PNP: '#1e40af',
                MDRRMO: '#059669',
                AMBULANCE: '#ea580c',
                PCG: '#0284c7',
              }
              const color = roleColors[dispatcher.role] || '#6b7280'

              return (
                <Marker
                  key={dispatcher.dispatcherId}
                  position={[dispatcher.latitude, dispatcher.longitude]}
                  icon={createDispatcherIcon(dispatcher.role, isAssigned)}
                  zIndexOffset={1000}
                >
                  <Popup>
                    <div className="p-3.5 min-w-[230px] max-w-[290px]">
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full ring-2 ring-white/30"
                          style={{ backgroundColor: color }}
                        />
                        <div>
                          <h3 className="font-bold text-slate-100 text-sm leading-tight">
                            {dispatcher.role} Responder Unit
                          </h3>
                          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                            Online & Transmitting
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-slate-300 border-t border-slate-800/80 pt-2 mb-2.5">
                        <p>
                          <span className="text-slate-400 font-medium">Email:</span> {dispatcher.email}
                        </p>
                        <p>
                          <span className="text-slate-400 font-medium">Last GPS Ping:</span>{' '}
                          {(getLastUpdatedDate(dispatcher.lastUpdated) || new Date()).toLocaleTimeString()}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {dispatcher.latitude.toFixed(6)}, {dispatcher.longitude.toFixed(6)}
                        </p>
                      </div>

                      {assignedIncident ? (
                        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/70 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block"></span>
                              Active Response
                            </span>
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                              {assignedIncident.priority}
                            </span>
                          </div>

                          <div>
                            <p className="text-xs font-bold text-slate-100 line-clamp-1">
                              {assignedIncident.type}
                            </p>
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              📍 {assignedIncident.location || 'Pinned Coordinates'}
                            </p>
                          </div>

                          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 font-medium">Estimated Arrival (ETA):</span>
                            <span className="text-[11px] font-bold text-emerald-400">
                              {etaInfo?.text}
                            </span>
                          </div>

                          <button
                            onClick={() => onIncidentSelect(assignedIncident.id)}
                            className="w-full mt-1 py-1 px-2 bg-blue-600/25 hover:bg-blue-600/35 text-blue-200 border border-blue-500/40 rounded text-xs font-semibold transition flex items-center justify-center gap-1"
                          >
                            Focus Incident on Map →
                          </button>
                        </div>
                      ) : (
                        <div className="p-2 rounded bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                          <span>Status:</span>
                          <span className="font-semibold text-slate-300">Available / Patrolling</span>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </>
        )}

        {/* Connection lines from assigned dispatchers/responders to their incidents */}
        {dispatcherLocations.length > 0 &&
          incidents.map((incident) => {
            if (!incident.dispatcherId && !incident.responder) return null

            const dispatcher = dispatcherLocations.find(
              (d) =>
                (incident.dispatcherId && d.dispatcherId === incident.dispatcherId) ||
                (incident.responder && d.email && incident.responder.toLowerCase().includes(d.email.toLowerCase()))
            )

            if (!dispatcher) return null
            if (!dispatcher.latitude || !dispatcher.longitude || !incident.lat || !incident.lng) return null

            const roleColors: Record<string, string> = {
              BFP: '#dc2626',
              PNP: '#1e40af',
              MDRRMO: '#059669',
              AMBULANCE: '#ea580c',
              PCG: '#0284c7',
            }
            const color = roleColors[dispatcher.role] || '#6b7280'

            const responderPos: [number, number] = [dispatcher.latitude, dispatcher.longitude]
            const incidentPos: [number, number] = [incident.lat, incident.lng]

            const etaInfo = calculateETA(
              dispatcher.latitude,
              dispatcher.longitude,
              incident.lat,
              incident.lng
            )

            // Place the ETA badge at 45% of the path
            const badgePos = getPointAlongLine(
              dispatcher.latitude,
              dispatcher.longitude,
              incident.lat,
              incident.lng,
              0.45
            )

            // Place the arrowhead at 75% of the path
            const arrowPos = getPointAlongLine(
              dispatcher.latitude,
              dispatcher.longitude,
              incident.lat,
              incident.lng,
              0.75
            )
            const angle = getAngle(
              dispatcher.latitude,
              dispatcher.longitude,
              incident.lat,
              incident.lng
            )

            return (
              <Fragment key={`assignment-${incident.id}-${dispatcher.dispatcherId}`}>
                <Polyline
                  positions={[responderPos, incidentPos]}
                  pathOptions={{
                    color,
                    weight: 3.5,
                    opacity: 0.85,
                    className: 'flow-line',
                  }}
                />
                {/* Floating ETA Pill Badge on line */}
                <Marker
                  position={badgePos}
                  icon={L.divIcon({
                    className: 'eta-line-badge-root',
                    html: `
                      <div style="
                        background: rgba(15, 23, 42, 0.95);
                        border: 1.5px solid ${color};
                        border-radius: 9999px;
                        padding: 2px 8px;
                        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        white-space: nowrap;
                        cursor: pointer;
                        backdrop-filter: blur(4px);
                      ">
                        <span style="width: 7px; height: 7px; border-radius: 50%; background: ${color}; display: inline-block; animation: pulse 1.2s infinite;"></span>
                        <span style="font-size: 11px; font-weight: 700; color: #f8fafc; letter-spacing: 0.02em;">
                          ${etaInfo.shortText}
                        </span>
                      </div>
                    `,
                    iconSize: [130, 24],
                    iconAnchor: [65, 12],
                  })}
                  eventHandlers={{
                    click: () => onIncidentSelect(incident.id),
                  }}
                />
                {/* Directional Arrowhead */}
                <Marker
                  position={arrowPos}
                  icon={L.divIcon({
                    className: 'arrowhead-marker',
                    html: `
                      <div style="
                        transform: rotate(${angle}deg);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 22px;
                        height: 22px;
                      ">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="${color}" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    `,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11],
                  })}
                  interactive={false}
                />
              </Fragment>
            )
          })}

        {/* Incident Markers */}
        {incidents.map((incident) => {
          const isSelected = selectedIncident === incident.id
          const assignedResponder = dispatcherLocations.find(
            (d) =>
              (incident.dispatcherId && d.dispatcherId === incident.dispatcherId) ||
              (incident.responder && d.email && incident.responder.toLowerCase().includes(d.email.toLowerCase()))
          )

          const incidentEta =
            assignedResponder && assignedResponder.latitude && assignedResponder.longitude
              ? calculateETA(
                  assignedResponder.latitude,
                  assignedResponder.longitude,
                  incident.lat,
                  incident.lng
                )
              : null

          return (
            <Marker
              key={incident.id}
              position={[incident.lat, incident.lng]}
              icon={createCustomIcon(incident.priority, incident.status, isSelected)}
              eventHandlers={{
                click: () => onIncidentSelect(incident.id),
              }}
            >
              <Popup>
                <div className="p-2.5 min-w-[220px] max-w-[280px]">
                  <h3 className="font-bold text-slate-100 text-base mb-1">
                    {incident.type}
                  </h3>
                  <p className="text-xs text-slate-400 mb-2.5">
                    {incident.location || 'Pinned Coordinates'}
                  </p>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded border ${
                        incident.priority === 'critical'
                          ? 'bg-red-500/20 text-red-300 border-red-500/30'
                          : incident.priority === 'high'
                          ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                          : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                      }`}
                    >
                      {incident.priority}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded border ${
                        incident.status === 'active'
                          ? 'bg-red-500/20 text-red-300 border-red-500/30'
                          : incident.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {incident.status}
                    </span>
                  </div>

                  {assignedResponder && incidentEta ? (
                    <div className="mb-2 p-2 rounded-md bg-slate-900/90 border border-slate-700/60 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Assigned Unit:</span>
                        <span className="font-semibold text-slate-200">{assignedResponder.role} Unit</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Responder ETA:</span>
                        <span className="font-bold text-emerald-400">{incidentEta.text}</span>
                      </div>
                    </div>
                  ) : incident.responder ? (
                    <p className="text-xs text-slate-300 font-medium mb-1">
                      Responder: {incident.responder}
                    </p>
                  ) : null}

                  <p className="text-[11px] text-slate-500 mt-1">
                    {incident.reportedAt.toLocaleString()}
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

