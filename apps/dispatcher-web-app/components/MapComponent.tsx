'use client'

import { useRef, useEffect, useState, Fragment } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon, GeoJSON, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
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
  lat: number
  lng: number
  reportedAt: Date
  responder: string | null
  dispatcherId?: string | null
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
    // Fetch the Tuguegarao barangays GeoJSON
    fetch('/tuguegarao-barangays.json')
      .then(res => res.json())
      .then(data => setGeojsonData(data))
      .catch(err => console.error('Error loading GeoJSON:', err))
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

  const createCustomIcon = (priority: string, status: string) => {
    const color = getMarkerColor(priority, status)
    const level = normalizePriority(priority)
    const flashClass = level === 'critical' ? 'priority-marker-critical' : ''
    return L.divIcon({
      className: `custom-marker ${flashClass}`,
      html: `
        <div style="
          background-color: ${color};
          width: 24px;
          height: 24px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        " class="${flashClass}">
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
        <MapCenter center={mapCenter} zoom={mapZoom} />
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
                          {(getLastUpdatedDate(dispatcher.lastUpdated) || new Date()).toLocaleTimeString()}
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
        {/* Connection lines from assigned dispatchers/responders to their incidents */}
        {dispatcherLocations.length > 0 && incidents.map((incident) => {
          if (!incident.dispatcherId) return null
          
          const dispatcher = dispatcherLocations.find(
            (d) => d.dispatcherId === incident.dispatcherId
          )
          
          if (!dispatcher) return null
          
          if (!dispatcher.latitude || !dispatcher.longitude || !incident.lat || !incident.lng) return null

          const roleColors: Record<string, string> = {
            BFP: '#dc2626', // red
            PNP: '#1e40af', // blue
            MDRRMO: '#059669', // green
            AMBULANCE: '#ea580c', // orange
            PCG: '#0284c7', // cyan
          }
          const color = roleColors[dispatcher.role] || '#6b7280'

          const responderPos: [number, number] = [dispatcher.latitude, dispatcher.longitude]
          const incidentPos: [number, number] = [incident.lat, incident.lng]

          // Place the arrowhead at 65% of the distance from dispatcher to incident
          const arrowPos = getPointAlongLine(dispatcher.latitude, dispatcher.longitude, incident.lat, incident.lng, 0.65)
          const angle = getAngle(dispatcher.latitude, dispatcher.longitude, incident.lat, incident.lng)

          return (
            <Fragment key={`assignment-${incident.id}-${dispatcher.dispatcherId}`}>
              <Polyline
                positions={[responderPos, incidentPos]}
                pathOptions={{
                  color,
                  weight: 3,
                  opacity: 0.8,
                  className: 'flow-line'
                }}
              />
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
                      width: 20px;
                      height: 20px;
                    ">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="${color}" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  `,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                })}
                interactive={false}
              />
            </Fragment>
          )
        })}

        {/* Incident Markers */}
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
                        ? 'bg-violet-100 text-violet-800'
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
    </div>
  )
}

