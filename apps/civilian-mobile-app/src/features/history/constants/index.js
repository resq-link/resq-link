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
  { id: "all", label: "All Logs" },
  { id: "active", label: "Active / Live" },
  { id: "pending", label: "Pending" },
  { id: "resolved", label: "Resolved" },
  { id: "cancelled", label: "Cancelled" },
];

export const TYPE_FILTERS = [
  { id: "all", label: "All Incidents", iconName: "Layers" },
  { id: "fire", label: "Fire", iconName: "Flame" },
  { id: "medical", label: "Medical", iconName: "HeartPulse" },
  { id: "police_emergency", label: "Police", iconName: "ShieldAlert" },
  { id: "vehicular_accident", label: "Accident", iconName: "CarFront" },
  { id: "electrical_powerline_hazard", label: "Hazard", iconName: "TriangleAlert" },
  { id: "other_emergency", label: "Other", iconName: "AlertTriangle" },
];

const INCIDENT_VISUALS = {
  fire: {
    label: "Fire Emergency",
    shortLabel: "Fire",
    Icon: Flame,
    iconColor: "#FF3B30",
    gradient: ["#E11D48", "#FF453A"],
    glow: "rgba(255, 69, 58, 0.28)",
    badgeBg: "rgba(255, 59, 48, 0.16)",
    badgeBorder: "rgba(255, 59, 48, 0.36)",
  },
  medical: {
    label: "Medical Emergency",
    shortLabel: "Medical",
    Icon: HeartPulse,
    iconColor: "#EF4444",
    gradient: ["#DC2626", "#F87171"],
    glow: "rgba(239, 68, 68, 0.28)",
    badgeBg: "rgba(239, 68, 68, 0.16)",
    badgeBorder: "rgba(239, 68, 68, 0.36)",
  },
  police_emergency: {
    label: "Police Assistance",
    shortLabel: "Crime",
    Icon: ShieldAlert,
    iconColor: "#8B5CF6",
    gradient: ["#6366F1", "#A855F7"],
    glow: "rgba(139, 92, 246, 0.28)",
    badgeBg: "rgba(139, 92, 246, 0.16)",
    badgeBorder: "rgba(139, 92, 246, 0.36)",
  },
  vehicular_accident: {
    label: "Traffic Collision",
    shortLabel: "Accident",
    Icon: CarFront,
    iconColor: "#38BDF8",
    gradient: ["#2563EB", "#38BDF8"],
    glow: "rgba(56, 189, 248, 0.28)",
    badgeBg: "rgba(56, 189, 248, 0.16)",
    badgeBorder: "rgba(56, 189, 248, 0.36)",
  },
  electrical_powerline_hazard: {
    label: "Hazard / Wire Down",
    shortLabel: "Hazard",
    Icon: TriangleAlert,
    iconColor: "#F59E0B",
    gradient: ["#D97706", "#FBBF24"],
    glow: "rgba(245, 158, 11, 0.28)",
    badgeBg: "rgba(245, 158, 11, 0.16)",
    badgeBorder: "rgba(245, 158, 11, 0.36)",
  },
  other_emergency: {
    label: "Emergency Dispatch",
    shortLabel: "Emergency",
    Icon: AlertTriangle,
    iconColor: "#10B981",
    gradient: ["#059669", "#34D399"],
    glow: "rgba(16, 185, 129, 0.28)",
    badgeBg: "rgba(16, 185, 129, 0.16)",
    badgeBorder: "rgba(16, 185, 129, 0.36)",
  },
};

/** Profile refinements when `other_emergency` carries a subtype */
const PROFILE_VISUALS = {
  flood: {
    label: "Natural Disaster",
    shortLabel: "Natural Disaster",
    Icon: Waves,
    iconColor: "#06B6D4",
    gradient: ["#0284C7", "#06B6D4"],
    glow: "rgba(6, 182, 212, 0.28)",
    badgeBg: "rgba(6, 182, 212, 0.16)",
    badgeBorder: "rgba(6, 182, 212, 0.36)",
  },
  earthquake: {
    label: "Earthquake Hazard",
    shortLabel: "Earthquake",
    Icon: Mountain,
    iconColor: "#F59E0B",
    gradient: ["#B45309", "#F59E0B"],
    glow: "rgba(180, 83, 9, 0.28)",
    badgeBg: "rgba(180, 83, 9, 0.16)",
    badgeBorder: "rgba(180, 83, 9, 0.36)",
  },
  rescue: {
    label: "Search & Rescue",
    shortLabel: "Rescue",
    Icon: LifeBuoy,
    iconColor: "#10B981",
    gradient: ["#059669", "#10B981"],
    glow: "rgba(16, 185, 129, 0.28)",
    badgeBg: "rgba(16, 185, 129, 0.16)",
    badgeBorder: "rgba(16, 185, 129, 0.36)",
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
  const raw = (status ?? "").toLowerCase().trim();
  if (
    raw === "rejected" ||
    raw === "declined" ||
    raw === "cancelled" ||
    raw === "canceled" ||
    raw === "resolved" ||
    raw === "done" ||
    raw === "completed"
  ) {
    return false;
  }
  const key = normalizeOperationalStatus(status);
  return ACTIVE_STATUSES.has(key);
}

export function isLiveDispatch(status) {
  const raw = (status ?? "").toLowerCase().trim();
  if (
    raw === "rejected" ||
    raw === "declined" ||
    raw === "cancelled" ||
    raw === "canceled" ||
    raw === "resolved" ||
    raw === "done" ||
    raw === "completed" ||
    raw === "pending"
  ) {
    return false;
  }
  const key = normalizeOperationalStatus(status);
  return key === "active" || key === "on_scene";
}

/** Theme-aware tactical status lozenge for history cards. */
export function getStatusPresentation(status, theme, isLight = false) {
  const raw = (status ?? "").toLowerCase().trim();

  if (raw === "rejected" || raw === "declined") {
    return {
      label: "Declined",
      tagText: "DECLINED",
      color: theme.danger || "#FF3B30",
      bg: isLight ? "rgba(255, 59, 48, 0.08)" : "rgba(255, 69, 58, 0.14)",
      border: isLight ? "rgba(255, 59, 48, 0.25)" : "rgba(255, 69, 58, 0.32)",
      accent: theme.danger || "#FF3B30",
      pulse: false,
      isLive: false,
      isLiveDispatch: false,
      actionLabel: "View Details",
    };
  }

  if (raw === "done" || raw === "completed" || raw === "resolved") {
    return {
      label: "Completed",
      tagText: "RESOLVED",
      color: isLight ? "#16A34A" : "#4ADE80",
      bg: isLight ? "rgba(22, 163, 74, 0.08)" : "rgba(74, 222, 128, 0.14)",
      border: isLight ? "rgba(22, 163, 74, 0.25)" : "rgba(74, 222, 128, 0.32)",
      accent: isLight ? "#16A34A" : "#4ADE80",
      pulse: false,
      isLive: false,
      isLiveDispatch: false,
      actionLabel: "View Dossier",
    };
  }

  if (raw === "cancelled" || raw === "canceled") {
    return {
      label: "Cancelled",
      tagText: "CANCELLED",
      color: theme.textSecondary || "#94A3B8",
      bg: isLight ? "rgba(100, 116, 139, 0.08)" : "rgba(148, 163, 184, 0.12)",
      border: isLight ? "rgba(100, 116, 139, 0.2)" : "rgba(148, 163, 184, 0.25)",
      accent: theme.textMuted || "#64748B",
      pulse: false,
      isLive: false,
      isLiveDispatch: false,
      actionLabel: "View Details",
    };
  }

  const key = normalizeOperationalStatus(status);

  const map = {
    pending: {
      label: "Pending Dispatch",
      tagText: "QUEUED",
      color: isLight ? "#D97706" : "#FBBF24",
      bg: isLight ? "rgba(217, 119, 6, 0.08)" : "rgba(251, 191, 36, 0.14)",
      border: isLight ? "rgba(217, 119, 6, 0.25)" : "rgba(251, 191, 36, 0.32)",
      accent: isLight ? "#D97706" : "#FBBF24",
      pulse: true,
      isLive: true,
      isLiveDispatch: false,
      actionLabel: "View Status",
    },
    active: {
      label: "On Scene",
      tagText: "ON SCENE",
      color: isLight ? "#DC2626" : "#FF5247",
      bg: isLight ? "rgba(220, 38, 38, 0.1)" : "rgba(255, 82, 71, 0.16)",
      border: isLight ? "rgba(220, 38, 38, 0.3)" : "rgba(255, 82, 71, 0.4)",
      accent: isLight ? "#DC2626" : "#FF5247",
      pulse: true,
      isLive: true,
      isLiveDispatch: true,
      actionLabel: "Track Dispatch Live",
    },
    on_scene: {
      label: "En Route",
      tagText: "EN ROUTE",
      color: isLight ? "#EA580C" : "#FB923C",
      bg: isLight ? "rgba(234, 88, 12, 0.1)" : "rgba(251, 146, 60, 0.16)",
      border: isLight ? "rgba(234, 88, 12, 0.3)" : "rgba(251, 146, 60, 0.4)",
      accent: isLight ? "#EA580C" : "#FB923C",
      pulse: true,
      isLive: true,
      isLiveDispatch: true,
      actionLabel: "Track Dispatch Live",
    },
    resolved: {
      label: "Resolved",
      tagText: "RESOLVED",
      color: isLight ? "#059669" : "#34D399",
      bg: isLight ? "rgba(5, 150, 105, 0.08)" : "rgba(52, 211, 153, 0.14)",
      border: isLight ? "rgba(5, 150, 105, 0.25)" : "rgba(52, 211, 153, 0.32)",
      accent: isLight ? "#059669" : "#34D399",
      pulse: false,
      isLive: false,
      isLiveDispatch: false,
      actionLabel: "View Dossier",
    },
    cancelled: {
      label: "Cancelled",
      tagText: "CANCELLED",
      color: theme.textSecondary || "#94A3B8",
      bg: isLight ? "rgba(100, 116, 139, 0.08)" : "rgba(148, 163, 184, 0.12)",
      border: isLight ? "rgba(100, 116, 139, 0.2)" : "rgba(148, 163, 184, 0.25)",
      accent: theme.textMuted || "#64748B",
      pulse: false,
      isLive: false,
      isLiveDispatch: false,
      actionLabel: "View Details",
    },
  };

  return map[key] || map.cancelled;
}

export function getCardStatusAccent(status, theme, isLight = false) {
  return getStatusPresentation(status, theme, isLight).accent;
}

/** Context-aware primary action on each card */
export function getTrackButtonPresentation(status, theme = createHistoryTheme(false)) {
  const key = normalizeOperationalStatus(status);

  const map = {
    active: {
      label: "Track Dispatch Live",
      shortLabel: "Track Live",
      variant: "live",
      textColor: "#FFFFFF",
      iconColor: "#FFFFFF",
      showNavigationIcon: true,
    },
    on_scene: {
      label: "Track Dispatch Live",
      shortLabel: "Track Live",
      variant: "live",
      textColor: "#FFFFFF",
      iconColor: "#FFFFFF",
      showNavigationIcon: true,
    },
    pending: {
      label: "View Dispatch Status",
      shortLabel: "View Status",
      variant: "live",
      textColor: "#FFFFFF",
      iconColor: "#FFFFFF",
      showNavigationIcon: true,
    },
    resolved: {
      label: "View Mission Dossier",
      shortLabel: "View Dossier",
      variant: "neutral",
      textColor: theme.text,
      iconColor: theme.textSecondary,
      showNavigationIcon: false,
    },
    cancelled: {
      label: "View Report Details",
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
