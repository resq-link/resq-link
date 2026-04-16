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

type AppReportResponseMapProps = {
  incident: {
    latitude: number
    longitude: number
    label?: string | null
  }
  responder?: {
    latitude: number
    longitude: number
    label?: string | null
  } | null
  className?: string
}

function MapInvalidator() {
  const map = useMap()

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 100)
    return () => window.clearTimeout(timer)
  }, [map])

  return null
}

function FitBounds({
  incident,
  responder,
}: Pick<AppReportResponseMapProps, 'incident' | 'responder'>) {
  const map = useMap()

  useEffect(() => {
    if (!responder) {
      map.setView([incident.latitude, incident.longitude], 15)
      return
    }

    const bounds = L.latLngBounds([
      [incident.latitude, incident.longitude],
      [responder.latitude, responder.longitude],
    ])
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 })
  }, [incident.latitude, incident.longitude, map, responder])

  return null
}

export default function AppReportResponseMap({
  incident,
  responder,
  className = '',
}: AppReportResponseMapProps) {
  const center = useMemo<[number, number]>(
    () => [incident.latitude, incident.longitude],
    [incident.latitude, incident.longitude],
  )
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''
  const mapboxStyle = process.env.NEXT_PUBLIC_MAPBOX_STYLE || 'mapbox/streets-v12'
  const mapboxUrl = mapboxToken
    ? `https://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`
    : null

  return (
    <div className={`overflow-hidden rounded-lg border border-slate-800 bg-slate-950 flex flex-col ${className}`}>
      <div className="flex-1 w-full min-h-[144px]">
        <MapContainer
          key={`${incident.latitude}-${incident.longitude}-${responder ? 'live' : 'static'}`}
          center={center}
          zoom={15}
          scrollWheelZoom={false}
          dragging
          style={{ height: '100%', width: '100%' }}
        >
          <MapInvalidator />
          <FitBounds incident={incident} responder={responder} />
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
          <Marker position={[incident.latitude, incident.longitude]} />
          {responder ? (
            <Marker position={[responder.latitude, responder.longitude]} />
          ) : null}
        </MapContainer>
      </div>
      <div className="grid gap-1 border-t border-slate-800 px-3 py-2 text-xs text-slate-400 md:grid-cols-2">
        <span>
          Pinned: <span className="text-slate-200">{incident.label || `${incident.latitude.toFixed(6)}, ${incident.longitude.toFixed(6)}`}</span>
        </span>
        <span>
          Responder:{' '}
          <span className={responder ? 'text-slate-200' : 'text-amber-200'}>
            {responder?.label || 'Waiting for live location'}
          </span>
        </span>
      </div>
    </div>
  )
}
