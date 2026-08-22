import {
  AlertTriangle,
  CarFront,
  Flame,
  HeartPulse,
  LifeBuoy,
  Mountain,
  ShieldAlert,
  TriangleAlert,
  Waves,
} from "lucide-react-native";
import { normalizeOperationalStatus } from "@packages/firebase";
import { createHistoryTheme } from "@/theme/factories";

export const ACTIVE_STATUSES = new Set(["pending", "active", "on_scene"]);

export const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending" },
  { id: "resolved", label: "Resolved" },
  { id: "cancelled", label: "Cancelled" },
];

export const TYPE_FILTERS = [
  { id: "all", label: "All types" },
  { id: "fire", label: "Fire" },
  { id: "medical", label: "Medical" },
  { id: "police_emergency", label: "Crime" },
  { id: "vehicular_accident", label: "Accident" },
  { id: "electrical_powerline_hazard", label: "Hazard" },
  { id: "other_emergency", label: "Other" },
];

const INCIDENT_VISUALS = {
  fire: {
    label: "Fire",
    Icon: Flame,
    iconColor: "#FF6B35",
    iconBg: "rgba(255, 107, 53, 0.15)",
  },
  medical: {
    label: "Medical",
    Icon: HeartPulse,
    iconColor: "#EF4444",
    iconBg: "rgba(239, 68, 68, 0.15)",
  },
  police_emergency: {
    label: "Crime",
    Icon: ShieldAlert,
    iconColor: "#8B5CF6",
    iconBg: "rgba(139, 92, 246, 0.15)",
  },
  vehicular_accident: {
    label: "Vehicular Accident",
    Icon: CarFront,
    iconColor: "#3B82F6",
    iconBg: "rgba(59, 130, 246, 0.15)",
  },
  electrical_powerline_hazard: {
    label: "Hazard",
    Icon: TriangleAlert,
    iconColor: "#F59E0B",
    iconBg: "rgba(245, 158, 11, 0.15)",
  },
  other_emergency: {
    label: "Emergency",
    Icon: AlertTriangle,
    iconColor: "#10B981",
    iconBg: "rgba(16, 185, 129, 0.15)",
  },
};

/** Profile refinements when `other_emergency` carries a subtype */
const PROFILE_VISUALS = {
  flood: {
    label: "Flood",
    Icon: Waves,
    iconColor: "#06B6D4",
    iconBg: "rgba(6, 182, 212, 0.15)",
  },
  earthquake: {
    label: "Earthquake",
    Icon: Mountain,
    iconColor: "#A16207",
    iconBg: "rgba(161, 98, 7, 0.15)",
  },
  rescue: {
    label: "Rescue",
    Icon: LifeBuoy,
    iconColor: "#10B981",
    iconBg: "rgba(16, 185, 129, 0.15)",
  },
  hazard: INCIDENT_VISUALS.electrical_powerline_hazard,
  crime: INCIDENT_VISUALS.police_emergency,
  vehicular: INCIDENT_VISUALS.vehicular_accident,
  fire: INCIDENT_VISUALS.fire,
  medical: INCIDENT_VISUALS.medical,
};

export function getIncidentMeta(incidentType, profile) {
  if (profile && PROFILE_VISUALS[profile]) {
    return PROFILE_VISUALS[profile];
  }
  return INCIDENT_VISUALS[incidentType] || INCIDENT_VISUALS.other_emergency;
}

export function isActiveReport(status) {
  return ACTIVE_STATUSES.has(normalizeOperationalStatus(status));
}

/** Theme-aware status pills for history cards. */
export function getStatusPresentation(status, theme, isLight = false) {
  const raw = (status ?? "").toLowerCase().trim();

  if (raw === "rejected" || raw === "declined") {
    return {
      label: "Rejected",
      color: theme.danger,
      muted: theme.dangerMuted,
      border: isLight ? "rgba(255, 59, 48, 0.28)" : "rgba(255, 69, 58, 0.38)",
      accent: theme.danger,
      pulse: false,
    };
  }

  if (raw === "done" || raw === "completed") {
    return {
      label: "Completed",
      color: theme.success,
      muted: theme.successMuted,
      border: isLight ? "rgba(52, 199, 89, 0.32)" : "rgba(52, 199, 89, 0.42)",
      accent: theme.success,
      pulse: false,
    };
  }

  const key = normalizeOperationalStatus(status);

  const map = {
    pending: {
      label: "Pending",
      color: theme.warning,
      muted: theme.warningMuted,
      border: isLight ? "rgba(255, 159, 10, 0.32)" : "rgba(255, 159, 10, 0.38)",
      accent: theme.warning,
      pulse: true,
    },
    active: {
      label: "Active",
      color: theme.orange,
      muted: theme.orangeMuted,
      border: isLight ? "rgba(234, 88, 12, 0.32)" : "rgba(251, 146, 60, 0.4)",
      accent: theme.orange,
      pulse: true,
    },
    on_scene: {
      label: "En Route",
      color: theme.orange,
      muted: theme.orangeMuted,
      border: isLight ? "rgba(234, 88, 12, 0.32)" : "rgba(251, 146, 60, 0.4)",
      accent: theme.orange,
      pulse: false,
    },
    resolved: {
      label: "Resolved",
      color: isLight ? "#2563EB" : "#60A5FA",
      muted: isLight ? "rgba(37, 99, 235, 0.16)" : "rgba(96, 165, 250, 0.26)",
      border: isLight ? "rgba(37, 99, 235, 0.34)" : "rgba(96, 165, 250, 0.48)",
      accent: isLight ? "#2563EB" : "#60A5FA",
      pulse: false,
    },
    cancelled: {
      label: "Cancelled",
      color: theme.textSecondary,
      muted: theme.mutedSurface,
      border: theme.border,
      accent: theme.textMuted,
      pulse: false,
    },
  };

  return map[key] || map.pending;
}

export function getCardStatusAccent(status, theme, isLight = false) {
  return getStatusPresentation(status, theme, isLight).accent;
}

/** Context-aware primary action on each card */
export function getTrackButtonPresentation(status, theme = createHistoryTheme(false)) {
  const key = normalizeOperationalStatus(status);

  const map = {
    active: {
      label: "View Report",
      shortLabel: "View Report",
      variant: "muted",
      textColor: theme.text,
      iconColor: theme.textSecondary,
      showNavigationIcon: false,
    },
    on_scene: {
      label: "View Report",
      shortLabel: "View Report",
      variant: "muted",
      textColor: theme.text,
      iconColor: theme.textSecondary,
      showNavigationIcon: false,
    },
    pending: {
      label: "View Report",
      shortLabel: "View Report",
      variant: "muted",
      textColor: theme.text,
      iconColor: theme.textSecondary,
      showNavigationIcon: false,
    },
    resolved: {
      label: "View Report",
      shortLabel: "View Report",
      variant: "muted",
      textColor: theme.text,
      iconColor: theme.textSecondary,
      showNavigationIcon: false,
    },
    cancelled: {
      label: "View Details",
      shortLabel: "View Details",
      variant: "outline",
      textColor: theme.textSecondary,
      iconColor: theme.textMuted,
      showNavigationIcon: false,
    },
  };

  return map[key] || map.pending;
}

export function isArchivedStatus(status) {
  const key = normalizeOperationalStatus(status);
  return key === "resolved" || key === "cancelled";
}
