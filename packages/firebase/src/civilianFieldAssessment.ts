/** Civilian mobile app questionnaire fields keyed by type profile. */
export const TYPE_PROFILE_LABELS: Record<string, string> = {
  fire: 'Fire',
  medical: 'Medical',
  crime: 'Crime',
  vehicular: 'Vehicular Accident',
  flood: 'Natural Disaster',
  hazard: 'Hazard',
  rescue: 'Rescue',
  other: 'Other',
};

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  fire: 'Fire Emergency',
  medical: 'Medical Emergency',
  vehicular_accident: 'Vehicular Accident',
  police_emergency: 'Police Emergency',
  electrical_powerline_hazard: 'Electrical / Powerline Hazard',
  other_emergency: 'Other Emergency',
};

const INCIDENT_TYPE_SHORT_LABELS: Record<string, string> = {
  fire: 'Fire',
  medical: 'Medical',
  vehicular_accident: 'Vehicular',
  police_emergency: 'Police',
  electrical_powerline_hazard: 'Electrical',
  other_emergency: 'Other',
};

export function getCivilianEmergencyTypeLabel(
  incidentType?: string | null,
  typeProfile?: string | null,
): string {
  if (typeProfile && TYPE_PROFILE_LABELS[typeProfile]) {
    return TYPE_PROFILE_LABELS[typeProfile];
  }
  if (incidentType && INCIDENT_TYPE_LABELS[incidentType]) {
    return INCIDENT_TYPE_LABELS[incidentType];
  }
  return 'Emergency';
}

export function getIncidentEmergencyTypeLabel(
  incidentType?: string | null,
  options?: { short?: boolean; typeProfile?: string | null },
): string {
  if (options?.short && incidentType && INCIDENT_TYPE_SHORT_LABELS[incidentType]) {
    return INCIDENT_TYPE_SHORT_LABELS[incidentType];
  }
  return getCivilianEmergencyTypeLabel(incidentType, options?.typeProfile ?? null);
}

export function resolveIncidentEmergencyType(incident: {
  incidentType?: string | null;
  incident_type?: string | null;
  incidentCategory?: string | null;
}): string {
  const rawType = (incident.incidentType || incident.incident_type || '').trim();
  if (rawType) {
    if (INCIDENT_TYPE_LABELS[rawType]) {
      return rawType;
    }
    return mapIncidentCategoryToEmergencyType(rawType);
  }
  return mapIncidentCategoryToEmergencyType(incident.incidentCategory);
}

export function resolveIncidentDisplayFields(incident: {
  incidentType?: string | null;
  incident_type?: string | null;
  incidentCategory?: string | null;
  incidentSubtypeLabel?: string | null;
  description?: string | null;
  typeProfile?: string | null;
  incidentTypeLabel?: string | null;
}): {
  incidentType: string;
  incidentTypeLabel: string;
  incidentTitle: string | null;
} {
  const incidentType = resolveIncidentEmergencyType(incident);
  const incidentTypeLabel =
    incident.incidentTypeLabel ||
    getCivilianEmergencyTypeLabel(incidentType, null);
  const incidentTitle =
    incident.incidentSubtypeLabel?.trim() ||
    incident.description?.trim() ||
    null;

  return { incidentType, incidentTypeLabel, incidentTitle };
}

export function mapEmergencyTypeToIncidentCategory(incidentType?: string | null): string {
  const map: Record<string, string> = {
    fire: 'fire',
    medical: 'medical',
    vehicular_accident: 'vehicular',
    police_emergency: 'peace_and_order',
    electrical_powerline_hazard: 'utility',
    other_emergency: 'other',
  };
  return map[incidentType || 'other_emergency'] || 'other';
}

export function mapIncidentCategoryToEmergencyType(category?: string | null): string {
  const map: Record<string, string> = {
    fire: 'fire',
    medical: 'medical',
    vehicular: 'vehicular_accident',
    utility: 'electrical_powerline_hazard',
    peace_and_order: 'police_emergency',
    other: 'other_emergency',
    community: 'other_emergency',
  };
  return map[category || 'other'] || 'other_emergency';
}

export const CIVILIAN_TYPE_SPECIFIC_FIELDS: Record<
  string,
  { key: string; label: string }[]
> = {
  fire: [
    { key: 'buildingType', label: 'Building type' },
    { key: 'smokeVisible', label: 'Smoke visible?' },
    { key: 'peopleTrapped', label: 'People trapped?' },
  ],
  medical: [
    { key: 'conscious', label: 'Conscious?' },
    { key: 'breathing', label: 'Breathing?' },
    { key: 'patientCount', label: 'Number of patients' },
  ],
  crime: [
    { key: 'ongoing', label: 'Ongoing?' },
    { key: 'suspectNearby', label: 'Suspect nearby?' },
  ],
  vehicular: [
    { key: 'vehiclesInvolved', label: 'Vehicles involved' },
    { key: 'injuries', label: 'Injuries reported?' },
  ],
  flood: [
    { key: 'waterLevel', label: 'Water level' },
    { key: 'areaAffected', label: 'Area affected' },
  ],
  hazard: [
    { key: 'hazardType', label: 'Hazard type' },
    { key: 'liveWire', label: 'Live wire status' },
  ],
  rescue: [
    { key: 'whoTrapped', label: 'Who is trapped?' },
    { key: 'hazardLevel', label: 'Immediate danger' },
  ],
  other: [{ key: 'situationSummary', label: 'Situation summary' }],
};

/** Dispatcher-requested follow-up fields keyed by incident type. */
export const DISPATCHER_ADDITIONAL_DETAIL_FIELDS: Record<
  string,
  { key: string; label: string }[]
> = {
  fire: [
    { key: 'fireScale', label: 'Fire scale / affected area' },
    { key: 'structureInvolved', label: 'Structure or property involved' },
    { key: 'trappedOrInjured', label: 'People trapped or injured' },
    { key: 'fireSource', label: 'Source of fire if known' },
  ],
  medical: [
    { key: 'patientCondition', label: 'Patient condition' },
    { key: 'breathingStatus', label: 'Conscious / breathing status' },
    { key: 'patientAge', label: 'Age or estimated age' },
    { key: 'firstAidNeeds', label: 'Immediate first-aid needs' },
  ],
  vehicular_accident: [
    { key: 'vehiclesInvolved', label: 'Vehicles involved' },
    { key: 'injuredPersons', label: 'Number of injured persons' },
    { key: 'roadObstruction', label: 'Road obstruction status' },
    { key: 'collisionCause', label: 'Collision type / cause if known' },
  ],
  police_emergency: [
    { key: 'threatNature', label: 'Nature of threat' },
    { key: 'suspectPresence', label: 'Suspect presence or description' },
    { key: 'weaponsInvolved', label: 'Weapons involved' },
    { key: 'safetyRisk', label: 'Immediate safety risk' },
  ],
  electrical_powerline_hazard: [
    { key: 'hazardType', label: 'Type of utility hazard' },
    { key: 'liveWireStatus', label: 'Live wire / spark / outage status' },
    { key: 'affectedArea', label: 'Affected homes or road area' },
    { key: 'visibleDamage', label: 'Visible damage details' },
  ],
  other_emergency: [
    { key: 'incidentSummary', label: 'Incident-specific summary' },
    { key: 'whoIsAffected', label: 'Who is affected' },
    { key: 'hazardLevel', label: 'Current hazard level' },
    { key: 'supportNeeded', label: 'Support needed on scene' },
  ],
};

export type FieldAssessmentEntry = {
  key: string;
  label: string;
  value: string;
  source: 'fieldAssessment' | 'additionalDetails' | 'narrative';
};

export type EmergencyReportFieldAssessmentInput = {
  incidentType?: string | null;
  typeProfile?: string | null;
  description?: string | null;
  landmark?: string | null;
  peopleInvolved?: number | string | null;
  fieldAssessment?: Record<string, string> | null;
  additionalDetails?: Record<string, string> | null;
  additionalDetailsRequestedAt?: unknown;
  additionalDetailsSubmittedAt?: unknown;
};

function normalizeStringRecord(
  record: Record<string, string> | null | undefined,
): Record<string, string> {
  if (!record || typeof record !== 'object') {
    return {};
  }

  return Object.entries(record).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'string' && value.trim()) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});
}

/** Labels emitted by civilian mobile app `buildDescriptionPayload`. */
export const CIVILIAN_NARRATIVE_FIELD_LABELS = [
  'Building type',
  'Smoke visible?',
  'People trapped?',
  'Conscious?',
  'Breathing?',
  'Number of patients',
  'Ongoing?',
  'Suspect nearby?',
  'Vehicles involved',
  'Injuries reported?',
  'Water level',
  'Area affected',
  'Hazard type',
  'Live wire status',
  'Who is trapped?',
  'Immediate danger',
  'Situation summary',
  'Landmark',
  'People involved',
] as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isKnownNarrativeFieldLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return CIVILIAN_NARRATIVE_FIELD_LABELS.some(
    (known) => known.toLowerCase() === normalized,
  );
}

function parseNarrativeFields(description: string): FieldAssessmentEntry[] {
  const trimmed = description.trim();
  if (!trimmed) {
    return [];
  }

  const fields: FieldAssessmentEntry[] = [];
  const seenLabels = new Set<string>();

  const addField = (label: string, value: string) => {
    const normalizedLabel = label.trim();
    const normalizedValue = value.trim();
    if (!normalizedLabel || !normalizedValue) {
      return;
    }
    const dedupeKey = normalizedLabel.toLowerCase();
    if (seenLabels.has(dedupeKey)) {
      return;
    }
    seenLabels.add(dedupeKey);
    fields.push({
      key: dedupeKey.replace(/\s+/g, '_'),
      label: normalizedLabel,
      value: normalizedValue,
      source: 'narrative',
    });
  };

  const paragraphs = trimmed.split(/\n\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);

  for (const paragraph of paragraphs) {
    const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
    const fieldLinePattern = /^(.+?):\s*(.+)$/;

    for (const line of lines) {
      const match = line.match(fieldLinePattern);
      if (match && isKnownNarrativeFieldLabel(match[1])) {
        addField(match[1], match[2]);
      }
    }
  }

  return fields;
}

export function getReportImageUrls(report: {
  imageUrl?: string | null;
  imageUrls?: string[] | null;
}): string[] {
  const urls = Array.isArray(report.imageUrls)
    ? report.imageUrls.filter((url): url is string => typeof url === 'string' && Boolean(url.trim()))
    : [];

  if (report.imageUrl?.trim() && !urls.includes(report.imageUrl.trim())) {
    return [report.imageUrl.trim(), ...urls];
  }

  return urls;
}

export type CivilianNarrativeField = { label: string; value: string };

export type CivilianNarrativeDisplay = {
  narrative: string | null;
  fields: CivilianNarrativeField[];
};

/** Civilian-only display data for Initial Narrative — never includes responder assessment. */
export function resolveCivilianNarrativeDisplay(
  report: EmergencyReportFieldAssessmentInput,
): CivilianNarrativeDisplay {
  const fields: CivilianNarrativeField[] = [];
  const seenLabels = new Set<string>();

  const pushField = (label: string, value: string) => {
    const normalizedLabel = label.trim();
    const normalizedValue = value.trim();
    if (!normalizedLabel || !normalizedValue) {
      return;
    }
    const dedupeKey = normalizedLabel.toLowerCase();
    if (seenLabels.has(dedupeKey)) {
      return;
    }
    seenLabels.add(dedupeKey);
    fields.push({ label: normalizedLabel, value: normalizedValue });
  };

  const typeProfile = report.typeProfile?.trim() || null;
  const fieldAssessment = normalizeStringRecord(report.fieldAssessment);
  const profileFieldDefs = typeProfile
    ? CIVILIAN_TYPE_SPECIFIC_FIELDS[typeProfile] || []
    : [];

  for (const fieldDef of profileFieldDefs) {
    const value = fieldAssessment[fieldDef.key];
    if (value) {
      pushField(fieldDef.label, value);
    }
  }

  for (const [key, value] of Object.entries(fieldAssessment)) {
    if (profileFieldDefs.some((fieldDef) => fieldDef.key === key)) {
      continue;
    }
    pushField(key, value);
  }

  const hasStructuredFields = fields.length > 0;
  if (!hasStructuredFields && report.description?.trim()) {
    for (const parsed of parseNarrativeFields(report.description)) {
      pushField(parsed.label, parsed.value);
    }
  }

  if (report.landmark?.trim()) {
    pushField('Landmark', report.landmark.trim());
  }

  if (report.peopleInvolved != null && report.peopleInvolved !== '') {
    pushField('People involved', String(report.peopleInvolved));
  }

  let narrative: string | null = null;
  if (report.description?.trim()) {
    if (hasStructuredFields) {
      const paragraphs = report.description
        .split(/\n\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
      const narrativeParts: string[] = [];

      for (const paragraph of paragraphs) {
        const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
        const fieldLinePattern = /^(.+?):\s*(.+)$/;
        const allLinesAreKnownFields = lines.every((line) => {
          const match = line.match(fieldLinePattern);
          return match && isKnownNarrativeFieldLabel(match[1]);
        });

        if (!allLinesAreKnownFields) {
          narrativeParts.push(paragraph);
        }
      }

      narrative = narrativeParts.length > 0 ? narrativeParts.join('\n\n') : null;
    } else {
      const parsed = parseNarrativeFields(report.description);
      const fieldLabels = new Set(parsed.map((field) => field.label.toLowerCase()));
      const paragraphs = report.description
        .split(/\n\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
      const narrativeParts: string[] = [];

      for (const paragraph of paragraphs) {
        const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
        const fieldLinePattern = /^(.+?):\s*(.+)$/;
        const allLinesAreKnownFields =
          lines.length > 0 &&
          lines.every((line) => {
            const match = line.match(fieldLinePattern);
            return match && fieldLabels.has(match[1].trim().toLowerCase());
          });

        if (!allLinesAreKnownFields) {
          narrativeParts.push(paragraph);
        }
      }

      narrative = narrativeParts.length > 0 ? narrativeParts.join('\n\n') : null;
    }
  }

  return { narrative, fields };
}

/** @deprecated Use resolveCivilianNarrativeDisplay for intake narrative and getSceneAssessmentEntries for scene assessment. */
export function resolveFieldAssessmentDisplay(
  report: EmergencyReportFieldAssessmentInput,
): FieldAssessmentEntry[] {
  return resolveCivilianNarrativeDisplay(report).fields.map((field) => ({
    key: field.label.toLowerCase().replace(/\s+/g, '_'),
    label: field.label,
    value: field.value,
    source: 'fieldAssessment' as const,
  }));
}

export function getPendingDispatcherFollowUpFields(
  report: EmergencyReportFieldAssessmentInput,
): { key: string; label: string }[] {
  if (!report.additionalDetailsRequestedAt || report.additionalDetailsSubmittedAt) {
    return [];
  }

  const incidentType = report.incidentType || 'other_emergency';
  const dispatcherFieldDefs =
    DISPATCHER_ADDITIONAL_DETAIL_FIELDS[incidentType] ||
    DISPATCHER_ADDITIONAL_DETAIL_FIELDS.other_emergency;
  const additionalDetails = normalizeStringRecord(report.additionalDetails);

  return dispatcherFieldDefs.filter((fieldDef) => !additionalDetails[fieldDef.key]);
}

/** Build an assessment view-model from an incident that copied civilian report fields. */
export function buildAssessmentSourceFromIncident(
  incident: EmergencyReportFieldAssessmentInput & {
    incidentCategory?: string | null;
  },
): EmergencyReportFieldAssessmentInput {
  return {
    incidentType: mapIncidentCategoryToEmergencyType(incident.incidentCategory),
    typeProfile: incident.typeProfile ?? null,
    description: incident.description ?? null,
    landmark: incident.landmark ?? null,
    peopleInvolved: incident.peopleInvolved ?? null,
    fieldAssessment: incident.fieldAssessment ?? null,
    additionalDetails: incident.additionalDetails ?? null,
    additionalDetailsRequestedAt: incident.additionalDetailsRequestedAt,
    additionalDetailsSubmittedAt: incident.additionalDetailsSubmittedAt,
  };
}
