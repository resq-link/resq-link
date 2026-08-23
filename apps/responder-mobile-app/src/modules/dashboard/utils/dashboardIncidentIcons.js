import {
  AlertTriangle,
  Car,
  Flame,
  HeartPulse,
  Shield,
  Waves,
  Zap,
} from "lucide-react-native";

import { resolveIncidentEmergencyType } from "@packages/firebase";

const INCIDENT_ICON_MAP = {
  fire: Flame,
  medical: HeartPulse,
  vehicular_accident: Car,
  police_emergency: Shield,
  electrical_powerline_hazard: Zap,
  flood_rescue: Waves,
  other_emergency: AlertTriangle,
};

/** Lucide icon for an incident type — used on dashboard cards/rows. */
export function getIncidentTypeIcon(incidentOrType) {
  const incidentType =
    typeof incidentOrType === "object" && incidentOrType !== null
      ? resolveIncidentEmergencyType(incidentOrType)
      : incidentOrType;
  return INCIDENT_ICON_MAP[incidentType] || AlertTriangle;
}

/** Tinted icon well colors for dashboard incident chips. */
export function getIncidentTypeIconColors(incidentOrType, colors, priorityColor) {
  const Icon = getIncidentTypeIcon(incidentOrType);
  return {
    Icon,
    iconColor: priorityColor ?? colors.accent,
    iconBg: colors.accentSubtle ?? "rgba(37, 99, 235, 0.08)",
  };
}
