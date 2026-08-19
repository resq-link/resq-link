import {
  AlertTriangle,
  Car,
  CloudRain,
  Flame,
  HeartPulse,
  LifeBuoy,
  ShieldAlert,
  Zap,
} from "lucide-react-native";

/** Backend `incidentType` values — do not change without Firebase schema update */
export const EMERGENCY_TYPE_OPTIONS = [
  {
    incidentType: "fire",
    profile: "fire",
    label: "Fire",
    subtitle: "Structure, wildfire, or smoke",
    Icon: Flame,
  },
  {
    incidentType: "medical",
    profile: "medical",
    label: "Medical",
    subtitle: "Injury or health emergency",
    Icon: HeartPulse,
  },
  {
    incidentType: "police_emergency",
    profile: "crime",
    label: "Crime",
    subtitle: "Threat or criminal activity",
    Icon: ShieldAlert,
  },
  {
    incidentType: "vehicular_accident",
    profile: "vehicular",
    label: "Vehicular Accident",
    subtitle: "Collision or road incident",
    Icon: Car,
  },
  {
    incidentType: "other_emergency",
    profile: "flood",
    label: "Natural Disaster",
    subtitle: "Flood, storm, or landslide",
    Icon: CloudRain,
  },
  {
    incidentType: "electrical_powerline_hazard",
    profile: "hazard",
    label: "Hazard",
    subtitle: "Electrical or utility danger",
    Icon: Zap,
  },
  {
    incidentType: "other_emergency",
    profile: "rescue",
    label: "Rescue",
    subtitle: "Trapped or needs extraction",
    Icon: LifeBuoy,
  },
  {
    incidentType: "other_emergency",
    profile: "other",
    label: "Other",
    subtitle: "Another urgent situation",
    Icon: AlertTriangle,
  },
];

export const TYPE_SPECIFIC_FIELDS = {
  fire: [
    { key: "buildingType", label: "Building type", placeholder: "e.g. Warehouse, home" },
    { key: "smokeVisible", label: "Smoke visible?", placeholder: "Yes / No / Heavy" },
    { key: "peopleTrapped", label: "People trapped?", placeholder: "Describe if known" },
  ],
  medical: [
    { key: "conscious", label: "Conscious?", placeholder: "Yes / No / Unknown" },
    { key: "breathing", label: "Breathing?", placeholder: "Yes / No / Labored" },
    { key: "patientCount", label: "Number of patients", placeholder: "1", keyboard: "number-pad" },
  ],
  crime: [
    { key: "ongoing", label: "Ongoing?", placeholder: "Yes / No" },
    { key: "suspectNearby", label: "Suspect nearby?", placeholder: "Description if safe" },
  ],
  vehicular: [
    { key: "vehiclesInvolved", label: "Vehicles involved", placeholder: "e.g. 2 cars" },
    { key: "injuries", label: "Injuries reported?", placeholder: "Yes / No / Unknown" },
  ],
  flood: [
    { key: "waterLevel", label: "Water level", placeholder: "Ankle / waist / roof" },
    { key: "areaAffected", label: "Area affected", placeholder: "Street, barangay, etc." },
  ],
  hazard: [
    { key: "hazardType", label: "Hazard type", placeholder: "Downed line, sparks, etc." },
    { key: "liveWire", label: "Live wire status", placeholder: "Active / unknown" },
  ],
  rescue: [
    { key: "whoTrapped", label: "Who is trapped?", placeholder: "People, animals, etc." },
    { key: "hazardLevel", label: "Immediate danger", placeholder: "High / medium / low" },
  ],
  other: [
    { key: "situationSummary", label: "Situation summary", placeholder: "Brief context" },
  ],
};

export const DEFAULT_MAP_REGION = {
  latitude: 17.6132,
  longitude: 121.727,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export const GPS_FALLBACK_TIMEOUT_MS = 10000;

export const TOTAL_STEPS = 5;

export function getTypeOptionByKey(incidentType, profile) {
  return EMERGENCY_TYPE_OPTIONS.find(
    (o) => o.incidentType === incidentType && o.profile === profile
  );
}

export function buildDescriptionPayload(
  description,
  landmark,
  peopleInvolved,
  extraDetails,
  profile,
  additionalNotes
) {
  const sections = [];

  if (description?.trim()) {
    sections.push(description.trim());
  }

  if (additionalNotes?.trim()) {
    sections.push(additionalNotes.trim());
  }

  const fieldDefs = TYPE_SPECIFIC_FIELDS[profile] || [];
  const extraLines = fieldDefs
    .map((field) => {
      const value = extraDetails?.[field.key]?.trim();
      return value ? `${field.label}: ${value}` : null;
    })
    .filter(Boolean);

  if (extraLines.length > 0) {
    sections.push(extraLines.join("\n"));
  }

  if (landmark?.trim()) {
    sections.push(`Landmark: ${landmark.trim()}`);
  }

  if (peopleInvolved?.trim()) {
    sections.push(`People involved: ${peopleInvolved.trim()}`);
  }

  return sections.length > 0 ? sections.join("\n\n") : null;
}
