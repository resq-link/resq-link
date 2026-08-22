'use client'

import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ResourceRecord } from '@packages/firebase'

if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

function MapCenter({ center }: { center: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, 14)
  }, [center, map])

  return null
}

const getTypeColor = (type: ResourceRecord['type']) => {
  switch (type) {
    case 'BFP':
      return '#dc2626'
    case 'PNP':
      return '#1d4ed8'
    case 'MDRRMO':
      return '#059669'
    case 'AMBULANCE':
      return '#ea580c'
    case 'PCG':
      return '#0891b2'
    default:
      return '#6b7280'
  }
}

const createResourceIcon = (type: ResourceRecord['type']) =>
  L.divIcon({
    className: 'resource-marker',
    html: `
      <div style="
        width: 22px;
        height: 22px;
        border-radius: 9999px;
        border: 3px solid white;
        background: ${getTypeColor(type)};
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      "></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  })

const getTypeLabel = (resource: ResourceRecord) =>
  resource.type === 'OTHER' ? resource.customType || 'OTHER' : resource.type

export default function ResourceLocationMap({ resource }: { resource: ResourceRecord }) {
  const latitude = resource.currentLatitude ?? resource.stationLatitude ?? 17.6132
  const longitude = resource.currentLongitude ?? resource.stationLongitude ?? 121.727
  const hasLocation =
    latitude != null &&
    longitude != null &&
    latitude !== 0 &&
    longitude !== 0 &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude)

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''
  const mapboxStyle = process.env.NEXT_PUBLIC_MAPBOX_STYLE || 'mapbox/streets-v12'
  const mapboxUrl = mapboxToken
    ? `https://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`
    : null

  if (!mapboxToken) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-400">
        Set `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` to enable resource maps.
      </div>
    )
  }

  if (!hasLocation) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-400">
        No coordinates saved for this resource yet.
      </div>
    )
  }

  return (
    <MapContainer center={[latitude, longitude]} zoom={14} style={{ height: '100%', width: '100%' }}>
      <MapCenter center={[latitude, longitude]} />
      <TileLayer
        attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url={mapboxUrl!}
        tileSize={512}
        zoomOffset={-1}
      />
      <Marker position={[latitude, longitude]} icon={createResourceIcon(resource.type)}>
        <Popup>
          <div className="p-1">
            <p className="font-semibold text-slate-900">{resource.name}</p>
            <p className="text-xs text-slate-600">{getTypeLabel(resource)}</p>
            <p className="text-xs text-slate-600">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  )
}
