'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

interface IncidentMapProps {
  latitude: number
  longitude: number
  locationText?: string
  incidentType?: string
  className?: string
}

function MapCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])
  return null
}

export default function IncidentMap({
  latitude,
  longitude,
  locationText,
  incidentType,
  className = '',
}: IncidentMapProps) {
  const center: [number, number] = [latitude, longitude]
  const zoom = 15

  return (
    <div className={`rounded-lg overflow-hidden border border-slate-800 ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', minHeight: 200 }}
        scrollWheelZoom={true}
      >
        <MapCenter center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center}>
          <Popup>
            <div className="p-2 min-w-[150px]">
              {incidentType && (
                <h3 className="font-bold text-slate-900 mb-1">{incidentType}</h3>
              )}
              {locationText && (
                <p className="text-sm text-slate-600 mb-1">{locationText}</p>
              )}
              <p className="text-xs text-slate-500">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
