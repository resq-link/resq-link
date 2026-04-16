'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

type PinnedLocationMapProps = {
  latitude: number
  longitude: number
  label?: string | null
  className?: string
}

function MapSizeInvalidator() {
  const map = useMap()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize()
    }, 100)

    return () => window.clearTimeout(timer)
  }, [map])

  return null
}

export default function PinnedLocationMap({
  latitude,
  longitude,
  label,
  className = '',
}: PinnedLocationMapProps) {
  const center = useMemo<[number, number]>(() => [latitude, longitude], [latitude, longitude])
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''
  const mapboxStyle = process.env.NEXT_PUBLIC_MAPBOX_STYLE || 'mapbox/streets-v12'
  const mapboxUrl = mapboxToken
    ? `https://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`
    : null

  return (
    <div className={`overflow-hidden rounded-lg border border-slate-800 bg-slate-950 flex flex-col ${className}`}>
      <div className="flex-1 w-full min-h-[176px]">
        <MapContainer
          key={`${latitude}-${longitude}`}
          center={center}
          zoom={15}
          scrollWheelZoom={false}
          dragging
          style={{ height: '100%', width: '100%' }}
        >
          <MapSizeInvalidator />
          <TileLayer
            attribution={
              mapboxUrl
                ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }
            url={mapboxUrl || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            tileSize={mapboxUrl ? 512 : undefined}
            zoomOffset={mapboxUrl ? -1 : undefined}
          />
          <Marker position={center} />
        </MapContainer>
      </div>
      <div className="border-t border-slate-800 px-3 py-2 text-xs text-slate-400">
        {label || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
      </div>
    </div>
  )
}
