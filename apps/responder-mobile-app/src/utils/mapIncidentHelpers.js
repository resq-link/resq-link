export function distanceKm(from, to) {
  if (!from || !to) return null;
  const R = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatReported(createdAt) {
  const d = toDate(createdAt);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getIncidentTypeName(incidentType, short = false) {
  const typeMap = {
    fire: short ? "Fire" : "Fire",
    medical: short ? "Medical" : "Medical Emergency",
    vehicular_accident: short ? "Vehicular" : "Vehicular Accident",
    police_emergency: short ? "Police" : "Police Emergency",
    electrical_powerline_hazard: short ? "Electrical" : "Electrical / Powerline Hazard",
    other_emergency: short ? "Other" : "Other Emergency",
  };
  return typeMap[incidentType] || "Emergency";
}

export function isActiveIncident(status) {
  return ["pending", "active", "enroute", "on_scene"].includes(status);
}

export function isResolved(status) {
  return status === "done" || status === "resolved";
}
