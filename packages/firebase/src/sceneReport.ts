import type { Timestamp } from 'firebase/firestore';
import type { AgencyCode } from './incidents';

export type SituationStatus = 'under_control' | 'ongoing' | 'critical' | 'false_alarm';

export type PeopleAffectedOption = 'none' | 'injured' | 'rescued' | 'fatality';

export interface PeopleAffectedCounts {
  injured?: number;
  rescued?: number;
  fatality?: number;
}

export type AdditionalResourceType =
  | 'fire_unit'
  | 'ambulance'
  | 'police'
  | 'rescue_team'
  | 'additional_personnel'
  | 'other';

export interface SceneReportRecord {
  situationStatus: SituationStatus;
  peopleAffected: PeopleAffectedOption[];
  /** @deprecated Legacy aggregate — use peopleAffectedCounts when available. */
  numberOfPeople?: number | null;
  peopleAffectedCounts?: PeopleAffectedCounts | null;
  actionsTaken: string[];
  actionsTakenOther?: string | null;
  additionalResourcesNeeded: boolean;
  additionalResourceType?: AdditionalResourceType | null;
  additionalResourceTypeOther?: string | null;
  actionPhotoUrl?: string | null;
  remarks?: string | null;
  submittedAt?: Date | Timestamp | null;
  submittedByDispatcherId?: string | null;
  submittedByName?: string | null;
}

export const SITUATION_STATUS_OPTIONS: { value: SituationStatus; label: string }[] = [
  { value: 'under_control', label: 'Under Control' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'critical', label: 'Critical' },
  { value: 'false_alarm', label: 'False Alarm' },
];

export const PEOPLE_AFFECTED_OPTIONS: { value: PeopleAffectedOption; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'injured', label: 'Injured' },
  { value: 'rescued', label: 'Rescued' },
  { value: 'fatality', label: 'Fatality' },
];

export const ADDITIONAL_RESOURCE_OPTIONS: { value: AdditionalResourceType; label: string }[] = [
  { value: 'fire_unit', label: 'Fire Unit' },
  { value: 'ambulance', label: 'Ambulance' },
  { value: 'police', label: 'Police' },
  { value: 'rescue_team', label: 'Rescue Team' },
  { value: 'additional_personnel', label: 'Additional Personnel' },
  { value: 'other', label: 'Other' },
];

const BFP_ACTIONS = [
  'Fire Suppression',
  'Rescue',
  'Evacuation',
  'First Aid',
  'Scene Secured',
  'Hazard Control',
  'Other',
];

const AMBULANCE_ACTIONS = [
  'First Aid',
  'Patient Assessment',
  'Patient Stabilized',
  'CPR',
  'Patient Transport',
  'Other',
];

const POLICE_ACTIONS = [
  'Scene Secured',
  'Traffic Control',
  'Crowd Control',
  'Evacuation Assistance',
  'Investigation Assistance',
  'Other',
];

const RESCUE_ACTIONS = [
  'Rescue',
  'Evacuation',
  'First Aid',
  'Search Operation',
  'Hazard Assessment',
  'Scene Secured',
  'Other',
];

const DEFAULT_ACTIONS = [
  'Scene Secured',
  'First Aid',
  'Rescue',
  'Evacuation',
  'Other',
];

export function getActionsTakenOptionsForAgency(
  agency?: AgencyCode | string | null,
  resourceType?: string | null,
): string[] {
  const normalizedAgency = String(agency || '').toLowerCase();
  const normalizedType = String(resourceType || '').toLowerCase();

  if (
    normalizedAgency.includes('bfp') ||
    normalizedAgency.includes('fire') ||
    normalizedType.includes('fire')
  ) {
    return BFP_ACTIONS;
  }

  if (
    normalizedAgency.includes('ambulance') ||
    normalizedAgency.includes('medical') ||
    normalizedType.includes('ambulance') ||
    normalizedType.includes('medical')
  ) {
    return AMBULANCE_ACTIONS;
  }

  if (
    normalizedAgency.includes('police') ||
    normalizedAgency.includes('pnp') ||
    normalizedType.includes('police')
  ) {
    return POLICE_ACTIONS;
  }

  if (
    normalizedAgency.includes('mdrrmo') ||
    normalizedAgency.includes('rescue') ||
    normalizedType.includes('rescue')
  ) {
    return RESCUE_ACTIONS;
  }

  return DEFAULT_ACTIONS;
}

export function getSituationStatusLabel(status?: SituationStatus | string | null): string {
  const match = SITUATION_STATUS_OPTIONS.find((option) => option.value === status);
  return match?.label || String(status || '—');
}

export function getPeopleAffectedLabels(values?: PeopleAffectedOption[] | null): string {
  if (!values?.length) return '—';
  return values
    .map((value) => PEOPLE_AFFECTED_OPTIONS.find((option) => option.value === value)?.label || value)
    .join(', ');
}

function parseNonNegativeInt(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const rounded = Math.floor(value);
  return rounded >= 0 ? rounded : undefined;
}

export function parsePeopleAffectedCounts(raw: unknown): PeopleAffectedCounts | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const injured = parseNonNegativeInt(data.injured);
  const rescued = parseNonNegativeInt(data.rescued);
  const fatality = parseNonNegativeInt(data.fatality);
  if (injured == null && rescued == null && fatality == null) return null;
  return {
    injured: injured ?? 0,
    rescued: rescued ?? 0,
    fatality: fatality ?? 0,
  };
}

export function computeTotalPeopleAffected(
  counts?: PeopleAffectedCounts | null,
  fallbackTotal?: number | null,
): number | null {
  if (counts) {
    return (counts.injured ?? 0) + (counts.rescued ?? 0) + (counts.fatality ?? 0);
  }
  return typeof fallbackTotal === 'number' ? fallbackTotal : null;
}

export type PeopleAffectedDisplay = {
  mode: 'detailed' | 'legacy';
  injured?: number;
  rescued?: number;
  fatality?: number;
  total?: number | null;
  labels?: string;
  legacyNote?: string | null;
};

/** Display helper for Command Center and history views. */
export function getPeopleAffectedDisplay(sceneReport: SceneReportRecord | null | undefined): PeopleAffectedDisplay {
  if (!sceneReport) {
    return { mode: 'legacy', labels: '—', total: null };
  }

  const counts = sceneReport.peopleAffectedCounts;
  const hasDetailedCounts =
    counts &&
    (counts.injured != null || counts.rescued != null || counts.fatality != null);

  if (hasDetailedCounts) {
    return {
      mode: 'detailed',
      injured: counts.injured ?? 0,
      rescued: counts.rescued ?? 0,
      fatality: counts.fatality ?? 0,
      total: computeTotalPeopleAffected(counts),
      labels: getPeopleAffectedLabels(sceneReport.peopleAffected),
    };
  }

  const labels = getPeopleAffectedLabels(sceneReport.peopleAffected);
  const total =
    typeof sceneReport.numberOfPeople === 'number' ? sceneReport.numberOfPeople : null;
  const hasNonNone = sceneReport.peopleAffected?.some((value) => value !== 'none');

  return {
    mode: 'legacy',
    labels,
    total,
    legacyNote:
      hasNonNone && total != null
        ? 'Legacy report — individual category counts unavailable'
        : null,
  };
}

export function getAdditionalResourceLabel(type?: AdditionalResourceType | string | null): string {
  const match = ADDITIONAL_RESOURCE_OPTIONS.find((option) => option.value === type);
  return match?.label || String(type || '—');
}

export function hasSceneReport(record?: SceneReportRecord | null): boolean {
  return Boolean(record?.submittedAt && record?.situationStatus);
}

export function mapSceneReportToLegacyPostReport(sceneReport: SceneReportRecord) {
  const peopleStatus = getPeopleAffectedLabels(sceneReport.peopleAffected);
  const actionsSummary = sceneReport.actionsTaken.join(', ');
  const notesParts = [actionsSummary, sceneReport.remarks?.trim()].filter(Boolean);
  const totalPeople =
    computeTotalPeopleAffected(sceneReport.peopleAffectedCounts, sceneReport.numberOfPeople);

  return {
    reasonForIncident: getSituationStatusLabel(sceneReport.situationStatus),
    notes: notesParts.join('\n'),
    peopleInvolved: totalPeople,
    peopleStatus,
    hospital: null,
    photoUrl: sceneReport.actionPhotoUrl?.trim() || null,
    actionPhotoUrl: sceneReport.actionPhotoUrl?.trim() || null,
    submittedAt: sceneReport.submittedAt,
    submittedByDispatcherId: sceneReport.submittedByDispatcherId,
    submittedByName: sceneReport.submittedByName,
  };
}

function parseTimestamp(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && value && 'toDate' in value) {
    const parsed = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const VALID_SITUATION_STATUSES = new Set<SituationStatus>([
  'under_control',
  'ongoing',
  'critical',
  'false_alarm',
]);

const VALID_PEOPLE_AFFECTED = new Set<PeopleAffectedOption>([
  'none',
  'injured',
  'rescued',
  'fatality',
]);

const VALID_ADDITIONAL_RESOURCE_TYPES = new Set<AdditionalResourceType>([
  'fire_unit',
  'ambulance',
  'police',
  'rescue_team',
  'additional_personnel',
  'other',
]);

export function parseSceneReportRecord(raw: unknown): SceneReportRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const situationStatus = data.situationStatus;
  if (typeof situationStatus !== 'string' || !VALID_SITUATION_STATUSES.has(situationStatus as SituationStatus)) {
    return null;
  }

  const peopleAffected = Array.isArray(data.peopleAffected)
    ? data.peopleAffected.filter(
        (value): value is PeopleAffectedOption =>
          typeof value === 'string' && VALID_PEOPLE_AFFECTED.has(value as PeopleAffectedOption),
      )
    : [];

  const actionsTaken = Array.isArray(data.actionsTaken)
    ? data.actionsTaken.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];

  const additionalResourceType =
    typeof data.additionalResourceType === 'string' &&
    VALID_ADDITIONAL_RESOURCE_TYPES.has(data.additionalResourceType as AdditionalResourceType)
      ? (data.additionalResourceType as AdditionalResourceType)
      : null;

  return {
    situationStatus: situationStatus as SituationStatus,
    peopleAffected,
    numberOfPeople: typeof data.numberOfPeople === 'number' ? data.numberOfPeople : null,
    peopleAffectedCounts: parsePeopleAffectedCounts(data.peopleAffectedCounts),
    actionsTaken,
    actionsTakenOther:
      typeof data.actionsTakenOther === 'string' ? data.actionsTakenOther.trim() || null : null,
    additionalResourcesNeeded: Boolean(data.additionalResourcesNeeded),
    additionalResourceType,
    additionalResourceTypeOther:
      typeof data.additionalResourceTypeOther === 'string'
        ? data.additionalResourceTypeOther.trim() || null
        : null,
    actionPhotoUrl: typeof data.actionPhotoUrl === 'string' ? data.actionPhotoUrl.trim() || null : null,
    remarks: typeof data.remarks === 'string' ? data.remarks.trim() || null : null,
    submittedAt: parseTimestamp(data.submittedAt),
    submittedByDispatcherId:
      typeof data.submittedByDispatcherId === 'string' ? data.submittedByDispatcherId : null,
    submittedByName: typeof data.submittedByName === 'string' ? data.submittedByName : null,
  };
}

export function parseSceneReportsMap(
  raw: unknown,
): Record<string, SceneReportRecord> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const entries = Object.entries(raw as Record<string, unknown>)
    .map(([uid, value]) => {
      const parsed = parseSceneReportRecord(value);
      return parsed ? ([uid, parsed] as const) : null;
    })
    .filter(Boolean) as Array<[string, SceneReportRecord]>;
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export interface NormalizedResponderReport {
  source: 'scene_report' | 'legacy_post_report';
  sceneReport: SceneReportRecord | null;
  legacyPostReport?: {
    reasonForIncident?: string | null;
    notes?: string | null;
    peopleInvolved?: number | null;
    peopleStatus?: string | null;
    hospital?: string | null;
    actionPhotoUrl?: string | null;
    submittedAt?: Date | null;
    submittedByName?: string | null;
  } | null;
}

export function normalizeResponderReport(
  incident: {
    sceneReports?: Record<string, SceneReportRecord> | null;
    postIncidentReports?: Record<string, Record<string, unknown>> | null;
    postIncidentReport?: Record<string, unknown> | null;
    responderAssignments?: Record<
      string,
      {
        sceneReport?: SceneReportRecord | null;
        postIncidentReport?: Record<string, unknown> | null;
        responderAssessment?: unknown;
      }
    > | null;
  } | null | undefined,
  responderId: string,
): NormalizedResponderReport | null {
  if (!incident || !responderId) return null;

  const fromRootMap = parseSceneReportRecord(incident.sceneReports?.[responderId]);
  if (hasSceneReport(fromRootMap)) {
    return { source: 'scene_report', sceneReport: fromRootMap };
  }

  const fromAssignment = parseSceneReportRecord(
    incident.responderAssignments?.[responderId]?.sceneReport,
  );
  if (hasSceneReport(fromAssignment)) {
    return { source: 'scene_report', sceneReport: fromAssignment };
  }

  const legacyFromMap = incident.postIncidentReports?.[responderId];
  const legacyFromAssignment = incident.responderAssignments?.[responderId]?.postIncidentReport;
  const legacySingle = incident.postIncidentReport;
  const legacyRaw = legacyFromMap || legacyFromAssignment || legacySingle;

  if (legacyRaw && typeof legacyRaw === 'object') {
    const submittedAt = parseTimestamp(legacyRaw.submittedAt);
    if (submittedAt || legacyRaw.reasonForIncident || legacyRaw.notes) {
      return {
        source: 'legacy_post_report',
        sceneReport: null,
        legacyPostReport: {
          reasonForIncident:
            typeof legacyRaw.reasonForIncident === 'string' ? legacyRaw.reasonForIncident : null,
          notes: typeof legacyRaw.notes === 'string' ? legacyRaw.notes : null,
          peopleInvolved:
            typeof legacyRaw.peopleInvolved === 'number' ? legacyRaw.peopleInvolved : null,
          peopleStatus: typeof legacyRaw.peopleStatus === 'string' ? legacyRaw.peopleStatus : null,
          hospital: typeof legacyRaw.hospital === 'string' ? legacyRaw.hospital : null,
          actionPhotoUrl:
            typeof legacyRaw.actionPhotoUrl === 'string'
              ? legacyRaw.actionPhotoUrl
              : typeof legacyRaw.photoUrl === 'string'
                ? legacyRaw.photoUrl
                : null,
          submittedAt,
          submittedByName:
            typeof legacyRaw.submittedByName === 'string' ? legacyRaw.submittedByName : null,
        },
      };
    }
  }

  return null;
}

export function validateArrivalTime(
  arrivalTime: Date,
  options?: { acceptedAt?: Date | null; now?: Date },
): string | null {
  const now = options?.now ?? new Date();
  if (Number.isNaN(arrivalTime.getTime())) {
    return 'Arrival time is invalid.';
  }
  if (arrivalTime.getTime() > now.getTime()) {
    return 'Arrival time cannot be in the future.';
  }
  const acceptedAt = options?.acceptedAt;
  if (acceptedAt && !Number.isNaN(acceptedAt.getTime()) && arrivalTime.getTime() < acceptedAt.getTime()) {
    return 'Arrival time cannot be before case acceptance.';
  }
  return null;
}

export function validateSceneReportInput(input: Partial<SceneReportRecord>): string | null {
  if (!input.situationStatus) return 'Situation status is required.';
  if (!input.peopleAffected?.length) return 'People affected is required.';
  const hasNonNonePeople = input.peopleAffected.some((value) => value !== 'none');

  if (hasNonNonePeople) {
    const counts = input.peopleAffectedCounts;
    if (counts) {
      const selectedCategories = input.peopleAffected.filter((value) => value !== 'none');
      for (const category of selectedCategories) {
        const key =
          category === 'fatality' ? 'fatality' : (category as 'injured' | 'rescued');
        const value = counts[key];
        if (typeof value !== 'number' || value < 0) {
          return `Enter a valid count for ${category}.`;
        }
      }
    } else if (typeof input.numberOfPeople !== 'number') {
      return 'Number of people is required when people are affected.';
    }
  }

  if (!input.actionsTaken?.length) return 'At least one action taken is required.';
  if (typeof input.additionalResourcesNeeded !== 'boolean') {
    return 'Additional resources question must be answered.';
  }
  if (input.additionalResourcesNeeded && !input.additionalResourceType) {
    return 'Select the type of additional resources needed.';
  }
  return null;
}
