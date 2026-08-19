import { Platform } from "react-native";

const toNumber = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function isValidCoord(lat, lng) {
  const latitude = toNumber(lat);
  const longitude = toNumber(lng);
  if (latitude === null || longitude === null) return false;
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

export function coordFrom(lat, lng) {
  if (!isValidCoord(lat, lng)) return null;
  return { latitude: toNumber(lat), longitude: toNumber(lng) };
}

export function normalizeApiResponder(raw) {
  return {
    id: String(raw.id),
    name: raw.name || raw.unit_type || "Responder Unit",
    agency: raw.agency || raw.department || null,
    unitType: raw.unit_type || raw.unitType || "Unit",
    status: raw.status || "available",
    latitude: toNumber(raw.latitude),
    longitude: toNumber(raw.longitude),
    phone: raw.phone_number || raw.phone || null,
    source: "api",
  };
}

export function normalizeResourceUnit(resource) {
  const lat =
    toNumber(resource.currentLatitude) ?? toNumber(resource.stationLatitude);
  const lng =
    toNumber(resource.currentLongitude) ?? toNumber(resource.stationLongitude);

  return {
    id: resource.id,
    name: resource.name || resource.stationName || "Resource",
    agency: resource.agency || resource.department || resource.type,
    unitType: resource.type || resource.customType || "OTHER",
    status: resource.status || "available",
    latitude: lat,
    longitude: lng,
    phone: resource.phoneNumber || resource.phone || resource.contactPhone || null,
    stationName: resource.stationName || null,
    assignedIncidentId: resource.assignedIncidentId || null,
    source: "resource",
  };
}

function stationKey(item) {
  const lat = toNumber(item.stationLatitude ?? item.latitude);
  const lng = toNumber(item.stationLongitude ?? item.longitude);
  const name = (item.stationName || item.name || "").trim().toLowerCase();
  if (!isValidCoord(lat, lng)) return null;
  return `${name}|${lat?.toFixed(5)}|${lng?.toFixed(5)}`;
}

function matchesPattern(text, patterns) {
  const haystack = (text || "").toLowerCase();
  return patterns.some((pattern) => haystack.includes(pattern));
}

export function categorizeEmergencyResources(resources = []) {
  const seen = new Set();
  const fireStations = [];
  const hospitals = [];
  const policeStations = [];
  const rhuCenters = [];
  const evacuationCenters = [];
  const mobileUnits = [];

  resources.forEach((resource) => {
    const type = (resource.type || "").toUpperCase();
    const label = [resource.name, resource.stationName, resource.customType, resource.agency]
      .filter(Boolean)
      .join(" ");

    const hasCurrent = isValidCoord(
      resource.currentLatitude,
      resource.currentLongitude
    );
    const hasStation = isValidCoord(
      resource.stationLatitude,
      resource.stationLongitude
    );

    if (hasCurrent) {
      mobileUnits.push(normalizeResourceUnit(resource));
    }

    if (!hasStation) return;

    const key = stationKey({
      stationName: resource.stationName || resource.name,
      stationLatitude: resource.stationLatitude,
      stationLongitude: resource.stationLongitude,
    });
    if (!key || seen.has(key)) return;
    seen.add(key);

    const stationItem = {
      id: key,
      name: resource.stationName || resource.name || "Station",
      agency: resource.agency || type,
      latitude: toNumber(resource.stationLatitude),
      longitude: toNumber(resource.stationLongitude),
      type,
    };

    if (
      matchesPattern(label, ["evacuation", "evac center", "evacuation center"])
    ) {
      evacuationCenters.push(stationItem);
      return;
    }

    if (
      matchesPattern(label, ["hospital", "medical center", "clinic", "tcpgh"])
    ) {
      hospitals.push(stationItem);
      return;
    }

    if (matchesPattern(label, ["rhu", "rural health"])) {
      rhuCenters.push(stationItem);
      return;
    }

    if (type === "BFP" || matchesPattern(label, ["fire", "bfp"])) {
      fireStations.push(stationItem);
      return;
    }

    if (type === "PNP" || matchesPattern(label, ["police", "pnp"])) {
      policeStations.push(stationItem);
      return;
    }

    if (type === "MDRRMO") {
      rhuCenters.push(stationItem);
    }
  });

  return {
    fireStations,
    hospitals,
    policeStations,
    rhuCenters,
    evacuationCenters,
    mobileUnits,
  };
}

export function mergeResponders(apiResponders = [], resourceUnits = []) {
  const byId = new Map();

  apiResponders.forEach((item) => {
    if (!isValidCoord(item.latitude, item.longitude)) return;
    byId.set(`api-${item.id}`, item);
  });

  resourceUnits.forEach((item) => {
    if (!isValidCoord(item.latitude, item.longitude)) return;
    byId.set(`res-${item.id}`, item);
  });

  return Array.from(byId.values());
}

export function filterAssignedResponders(responders, report) {
  if (!report) return [];

  const incidentId = report.incidentId || null;
  const assignedId = report.assignedResponderId || null;
  const responderName = (report.responder || "").trim().toLowerCase();

  return responders.filter((unit) => {
    if (
      incidentId &&
      unit.assignedIncidentId &&
      unit.assignedIncidentId === incidentId
    ) {
      return true;
    }
    if (assignedId && String(unit.id) === String(assignedId)) {
      return true;
    }
    if (
      responderName &&
      unit.name &&
      unit.name.trim().toLowerCase() === responderName
    ) {
      return true;
    }
    const normalized = (unit.status || "").toLowerCase();
    if (
      incidentId &&
      ["en_route", "on_scene", "assigned", "busy"].includes(normalized)
    ) {
      return unit.assignedIncidentId === incidentId;
    }
    return false;
  });
}

export function collectMapCoordinates({
  userLocation,
  incidentCoord,
  responders = [],
  facilities = [],
}) {
  const coords = [];
  if (userLocation) coords.push(userLocation);
  if (incidentCoord) coords.push(incidentCoord);
  responders.forEach((r) => {
    const c = coordFrom(r.latitude, r.longitude);
    if (c) coords.push(c);
  });
  facilities.forEach((f) => {
    const c = coordFrom(f.latitude, f.longitude);
    if (c) coords.push(c);
  });
  return coords;
}

export function getResponderMarkerStyle(unitType) {
  const type = String(unitType || "").toLowerCase();
  if (type.includes("fire") || type === "bfp") {
    return { color: "#FF3B30", label: "Fire", iconKey: "flame" };
  }
  if (type.includes("police") || type === "pnp") {
    return { color: "#5856D6", label: "Police", iconKey: "shield" };
  }
  if (
    type.includes("medical") ||
    type.includes("ambulance") ||
    type === "ambulance"
  ) {
    return { color: "#FF9500", label: "Ambulance", iconKey: "heartPulse" };
  }
  if (type.includes("rescue") || type === "mdrrmo" || type === "pcg") {
    return { color: "#007AFF", label: "Rescue", iconKey: "truck" };
  }
  return { color: "#34C759", label: "Responder", iconKey: "truck" };
}

const EARTH_RADIUS_KM = 6371;

export function distanceBetweenKm(from, to) {
  if (!from || !to) return null;
  const lat1 = toNumber(from.latitude);
  const lng1 = toNumber(from.longitude);
  const lat2 = toNumber(to.latitude);
  const lng2 = toNumber(to.longitude);
  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) {
    return null;
  }

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function formatDistanceLabel(km) {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export function filterMapResources(items, queryText) {
  const needle = (queryText || "").trim().toLowerCase();
  if (!needle) return items;

  return items.filter((item) => {
    const haystack = [
      item.name,
      item.unitType,
      item.agency,
      item.kind,
      item.subtitle,
      item.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function buildMapMarkerKey(item) {
  if (item.markerKind === "facility") {
    return `facility-${item.kind}-${item.id}`;
  }
  return `${item.source}-${item.id}`;
}

export function openDirectionsUrl(latitude, longitude, label) {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);
  if (lat === null || lng === null) return null;

  const encodedLabel = encodeURIComponent(label || "Destination");
  if (Platform.OS === "ios") {
    return `maps://?daddr=${lat},${lng}&q=${encodedLabel}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function getStatusBadgeStyle(status, isLight) {
  const normalized = (status || "").toLowerCase();
  const colorMap = {
    available: "#34C759",
    en_route: "#FF9500",
    on_scene: "#007AFF",
    assigned: "#FF9500",
    busy: "#FF3B30",
    maintenance: "#8E8E93",
    offline: "#8E8E93",
  };
  const color = colorMap[normalized] || "#9A9A9A";

  if (!isLight) {
    return { backgroundColor: `${color}22`, textColor: color };
  }

  switch (normalized) {
    case "available":
      return { backgroundColor: "#E8F7ED", textColor: "#1E7A35" };
    case "en_route":
    case "assigned":
      return { backgroundColor: "#FFF4E5", textColor: "#B35A00" };
    case "on_scene":
      return { backgroundColor: "#E8F0FF", textColor: "#1D4ED8" };
    case "busy":
      return { backgroundColor: "#FDEBEC", textColor: "#B42318" };
    default:
      return { backgroundColor: "#EEEEF2", textColor: "#616168" };
  }
}

export function formatTimestamp(value) {
  if (!value) return null;
  const date =
    value instanceof Date
      ? value
      : typeof value === "object" && value && "toDate" in value
        ? value.toDate()
        : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getDispatcherMessages(report) {
  if (!report) return [];

  const messages = [];

  if (report.declineReason) {
    messages.push({
      id: "decline",
      author: report.declinedByName || "Dispatcher",
      body: report.declineReason,
      at: report.declinedAt,
    });
  }

  if (report.viewedByName && report.viewedAt) {
    messages.push({
      id: "viewed",
      author: report.viewedByName,
      body: "Incident reviewed by dispatch.",
      at: report.viewedAt,
    });
  }

  return messages;
}

/** Optional future routing — render only when Firestore provides coordinates. */
export function getRouteCoordinates(report) {
  const raw =
    report?.routeCoordinates ||
    report?.routePolyline ||
    report?.responderRoute;
  if (!Array.isArray(raw) || raw.length < 2) return null;
  return raw
    .map((point) => {
      if (Array.isArray(point) && point.length >= 2) {
        return coordFrom(point[0], point[1]);
      }
      if (point && typeof point === "object") {
        return coordFrom(point.latitude ?? point.lat, point.longitude ?? point.lng);
      }
      return null;
    })
    .filter(Boolean);
}

export function getEtaPresentation(report) {
  const minutes =
    report?.estimatedArrivalMinutes ??
    report?.etaMinutes ??
    report?.estimatedEtaMinutes;
  if (minutes == null || Number.isNaN(Number(minutes))) return null;
  return `${Math.max(1, Math.round(Number(minutes)))} min`;
}

/** ETA block with optional distance and last-updated from Firestore fields. */
export function getEtaDetails(report) {
  const etaLabel = getEtaPresentation(report);
  const distanceRaw =
    report?.distanceRemainingKm ??
    report?.estimatedDistanceKm ??
    report?.distanceKm ??
    report?.distanceRemainingMiles;

  let distanceLabel = null;
  if (distanceRaw != null && !Number.isNaN(Number(distanceRaw))) {
    const km = Number(distanceRaw);
    distanceLabel =
      km >= 1 ? `${km.toFixed(1)} km away` : `${Math.round(km * 1000)} m away`;
  }

  const lastUpdatedAt =
    report?.etaUpdatedAt ??
    report?.responderLocationUpdatedAt ??
    report?.updatedAt;

  return {
    etaLabel,
    distanceLabel,
    lastUpdatedLabel: formatTimestamp(lastUpdatedAt),
  };
}
