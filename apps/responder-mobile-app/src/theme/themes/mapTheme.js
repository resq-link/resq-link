/**
 * Map screen merged tokens — extends global `t` with map-specific keys.
 */

export function getMapTheme(t) {
  return {
    ...t,
    sheetBg: t.surfaceCard,
    sheetBorder: t.border,
    overlayNavy: t.mapOverlayScrim,
    lineRoute: t.accent,
    lineRouteAlt: t.mapLineRouteAlt,
    incidentUrgent: t.pending,
    incidentCalm: t.accentDim,
    resolvedMuted: t.mapPinResolved,
  };
}

/** Google Maps — dark BFP/navy operational baseline */
export const MAP_DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0b1526" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ea0b8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1526" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#111d32" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a2840" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#243352" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#081018" }] },
  { featureType: "transit", stylers: [{ visibility: "simplified" }] },
];

/** Google Maps — light UI chrome + readable roads (tiles stay standard; chrome adapts via theme). */
export const MAP_LIGHT_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f1f5f9" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f8fafc" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#e4eaf4" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dbeafe" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cde4f5" }] },
  { featureType: "transit", stylers: [{ visibility: "simplified" }] },
];
