'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { LeafletMouseEvent, Marker as LeafletMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'

if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

const DEFAULT_CENTER: [number, number] = [17.6132, 121.727]

type IncidentLocationPickerProps = {
  latitude: number | null
  longitude: number | null
  onChange: (latitude: number, longitude: number) => void
  onClear: () => void
}

function parseCoordinate(value: number | null) {
  return value != null && Number.isFinite(value) && value !== 0 ? value : null
}

function MapClickHandler({
  onChange,
}: {
  onChange: (latitude: number, longitude: number) => void
}) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onChange(event.latlng.lat, event.latlng.lng)
    },
  })

  return null
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

export default function IncidentLocationPicker({
  latitude,
  longitude,
  onChange,
  onClear,
}: IncidentLocationPickerProps) {
  const selectedPosition = useMemo<[number, number] | null>(() => {
    const lat = parseCoordinate(latitude)
    const lng = parseCoordinate(longitude)
    return lat != null && lng != null ? [lat, lng] : null
  }, [latitude, longitude])

  const center = selectedPosition || DEFAULT_CENTER
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''
  const mapboxStyle = process.env.NEXT_PUBLIC_MAPBOX_STYLE || 'mapbox/streets-v12'
  const mapboxUrl = mapboxToken
    ? `https://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`
    : null

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      <div className="flex flex-col gap-2 border-b border-slate-800 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Map Pin
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Click the map to pin the incident location, then drag the marker to adjust it.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={!selectedPosition}
          className="h-8 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear Pin
        </button>
      </div>
      <div className="h-72 w-full">
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
          <MapSizeInvalidator />
          <MapClickHandler onChange={onChange} />
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
          {selectedPosition ? (
            <Marker
              draggable
              position={selectedPosition}
              eventHandlers={{
                dragend: (event) => {
                  const marker = event.target as LeafletMarker
                  const nextPosition = marker.getLatLng()
                  onChange(nextPosition.lat, nextPosition.lng)
                },
              }}
            />
          ) : null}
        </MapContainer>
      </div>
      <div className="border-t border-slate-800 px-3 py-2 text-xs text-slate-400">
        {selectedPosition
          ? `Pinned at ${selectedPosition[0].toFixed(6)}, ${selectedPosition[1].toFixed(6)}`
          : 'No pin selected yet.'}
      </div>
    </div>
  )
}
