import { Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './config';
import { mapIncidentCategoryToEmergencyType } from './civilianFieldAssessment';

export type ResponderAssessmentRecord = {
  fields: Record<string, string>;
  /** @deprecated Legacy on-scene photo stored on assessment — use incident.onScenePhotoUrl for arrival evidence */
  scenePhotoUrl?: string | null;
  /** @deprecated Action evidence now lives on postIncidentReport.actionPhotoUrl */
  actionPhotoUrl?: string | null;
  updatedAt?: Date | Timestamp | null;
  updatedById?: string | null;
  updatedByName?: string | null;
};

export type SceneAssessmentField = { key: string; label: string };

/** Responder on-scene assessment fields — independent from civilian intake answers. */
export const RESPONDER_SCENE_ASSESSMENT_FIELDS: Record<string, SceneAssessmentField[]> = {
  fire: [
    { key: 'fireScale', label: 'Fire scale' },
    { key: 'affectedArea', label: 'Affected area' },
    { key: 'hazards', label: 'Hazards' },
    { key: 'confirmedCasualties', label: 'Confirmed casualties' },
    { key: 'peopleRescued', label: 'People rescued' },
    { key: 'currentOperations', label: 'Current operations' },
    { key: 'remarks', label: 'Remarks' },
  ],
  medical: [
    { key: 'patientCondition', label: 'Patient condition' },
    { key: 'patientsOnScene', label: 'Patients on scene' },
    { key: 'treatmentProvided', label: 'Treatment provided' },
    { key: 'transportStatus', label: 'Transport status' },
    { key: 'hazards', label: 'Hazards' },
    { key: 'currentOperations', label: 'Current operations' },
    { key: 'remarks', label: 'Remarks' },
  ],
  vehicular_accident: [
    { key: 'collisionType', label: 'Collision type' },
    { key: 'affectedArea', label: 'Affected area / road impact' },
    { key: 'injuredPersons', label: 'Injured persons' },
    { key: 'hazards', label: 'Hazards' },
    { key: 'currentOperations', label: 'Current operations' },
    { key: 'remarks', label: 'Remarks' },
  ],
  police_emergency: [
    { key: 'threatNature', label: 'Nature of threat' },
    { key: 'sceneStatus', label: 'Scene status' },
    { key: 'suspectStatus', label: 'Suspect status' },
    { key: 'hazards', label: 'Hazards' },
    { key: 'currentOperations', label: 'Current operations' },
    { key: 'remarks', label: 'Remarks' },
  ],
  electrical_powerline_hazard: [
    { key: 'hazardType', label: 'Hazard type' },
    { key: 'affectedArea', label: 'Affected area' },
    { key: 'utilityStatus', label: 'Utility / power status' },
    { key: 'hazards', label: 'Hazards' },
    { key: 'currentOperations', label: 'Current operations' },
    { key: 'remarks', label: 'Remarks' },
  ],
  other_emergency: [
    { key: 'incidentSummary', label: 'On-scene summary' },
    { key: 'affectedArea', label: 'Affected area' },
    { key: 'hazards', label: 'Hazards' },
    { key: 'confirmedCasualties', label: 'Confirmed casualties' },
    { key: 'peopleRescued', label: 'People rescued' },
    { key: 'currentOperations', label: 'Current operations' },
    { key: 'remarks', label: 'Remarks' },
  ],
};

export function getSceneAssessmentFieldDefs(
  incidentType?: string | null,
): SceneAssessmentField[] {
  const key = incidentType || 'other_emergency';
  return RESPONDER_SCENE_ASSESSMENT_FIELDS[key] || RESPONDER_SCENE_ASSESSMENT_FIELDS.other_emergency;
}

function normalizeAssessmentFields(
  fields: Record<string, string> | null | undefined,
): Record<string, string> {
  if (!fields || typeof fields !== 'object') {
    return {};
  }
  return Object.entries(fields).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'string' && value.trim()) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});
}

export function parseResponderAssessment(raw: unknown): ResponderAssessmentRecord | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const fields =
    data.fields && typeof data.fields === 'object'
      ? normalizeAssessmentFields(data.fields as Record<string, string>)
      : {};

  const scenePhotoUrl =
    typeof data.scenePhotoUrl === 'string' && data.scenePhotoUrl.trim()
      ? data.scenePhotoUrl.trim()
      : null;

  const actionPhotoUrl =
    typeof data.actionPhotoUrl === 'string' && data.actionPhotoUrl.trim()
      ? data.actionPhotoUrl.trim()
      : null;

  if (Object.keys(fields).length === 0) {
    return null;
  }

  return {
    fields,
    scenePhotoUrl,
    actionPhotoUrl,
    updatedAt:
      data.updatedAt && typeof data.updatedAt === 'object' && 'toDate' in data.updatedAt
        ? (data.updatedAt as Timestamp).toDate()
        : data.updatedAt
        ? new Date(data.updatedAt as string | number)
        : null,
    updatedById: typeof data.updatedById === 'string' ? data.updatedById : null,
    updatedByName: typeof data.updatedByName === 'string' ? data.updatedByName : null,
  };
}

export type SceneAssessmentEntry = { key: string; label: string; value: string };

export function getSceneAssessmentEntries(
  assessment: ResponderAssessmentRecord | null | undefined,
  incidentType?: string | null,
): SceneAssessmentEntry[] {
  if (!assessment?.fields) {
    return [];
  }

  const fieldDefs = getSceneAssessmentFieldDefs(incidentType);
  const entries: SceneAssessmentEntry[] = [];
  const seen = new Set<string>();

  for (const fieldDef of fieldDefs) {
    const value = assessment.fields[fieldDef.key];
    if (value) {
      entries.push({ key: fieldDef.key, label: fieldDef.label, value });
      seen.add(fieldDef.key);
    }
  }

  for (const [key, value] of Object.entries(assessment.fields)) {
    if (seen.has(key)) {
      continue;
    }
    entries.push({ key, label: key, value });
  }

  return entries;
}

export function hasResponderSceneAssessment(
  assessment: ResponderAssessmentRecord | null | undefined,
): boolean {
  return getSceneAssessmentEntries(assessment).length > 0;
}

/** Action photo for display — prefers dedicated field, legacy scenePhotoUrl only in assessment context. */
export function getResponderAssessmentActionPhotoUrl(
  assessment: ResponderAssessmentRecord | null | undefined,
): string | null {
  if (!assessment) return null;
  return assessment.actionPhotoUrl?.trim() || assessment.scenePhotoUrl?.trim() || null;
}

async function writeResponderAssessment(
  refPath: 'emergencies' | 'incidents',
  docId: string,
  fields: Record<string, string>,
  options?: {
    updatedByName?: string | null;
    actionPhotoUrl?: string | null;
    scenePhotoUrl?: string | null;
  },
): Promise<ResponderAssessmentRecord> {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to submit scene assessment');
  }

  const normalizedFields = normalizeAssessmentFields(fields);
  if (Object.keys(normalizedFields).length === 0) {
    throw new Error('At least one assessment field is required');
  }

  const now = Timestamp.now();

  const docRef = doc(getFirebaseFirestore(), refPath, docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error(`${refPath === 'emergencies' ? 'Emergency report' : 'Incident'} not found`);
  }

  const existingAssessment = parseResponderAssessment(snap.data()?.responderAssessment);
  // Preserve legacy photo fields if present; new action photos belong on post-report.
  const actionPhotoUrl =
    options?.actionPhotoUrl !== undefined
      ? options.actionPhotoUrl?.trim() || null
      : existingAssessment?.actionPhotoUrl ?? null;

  const scenePhotoUrl =
    options?.scenePhotoUrl !== undefined
      ? options.scenePhotoUrl?.trim() || null
      : existingAssessment?.scenePhotoUrl ?? null;

  const payload: ResponderAssessmentRecord = {
    fields: normalizedFields,
    actionPhotoUrl,
    scenePhotoUrl,
    updatedAt: now,
    updatedById: currentUser.uid,
    updatedByName:
      options?.updatedByName?.trim() ||
      currentUser.displayName ||
      currentUser.email ||
      currentUser.uid,
  };

  await updateDoc(docRef, {
    responderAssessment: payload,
    updatedAt: now,
  });

  return payload;
}

export async function submitResponderSceneAssessmentForEmergency(
  reportId: string,
  fields: Record<string, string>,
  options?: {
    updatedByName?: string | null;
    actionPhotoUrl?: string | null;
    scenePhotoUrl?: string | null;
  },
): Promise<ResponderAssessmentRecord> {
  return writeResponderAssessment('emergencies', reportId, fields, options);
}

export async function submitResponderSceneAssessmentForIncident(
  incidentId: string,
  fields: Record<string, string>,
  options?: {
    updatedByName?: string | null;
    actionPhotoUrl?: string | null;
    scenePhotoUrl?: string | null;
  },
): Promise<ResponderAssessmentRecord> {
  const assessment = await writeResponderAssessment(
    'incidents',
    incidentId,
    fields,
    options,
  );

  const incidentRef = doc(getFirebaseFirestore(), 'incidents', incidentId);
  const incidentSnap = await getDoc(incidentRef);
  const associatedReportIds = incidentSnap.data()?.associatedReportIds;
  if (Array.isArray(associatedReportIds) && associatedReportIds.length > 0) {
    const primaryReportId = associatedReportIds[0];
    if (typeof primaryReportId === 'string' && primaryReportId.trim()) {
      try {
        await writeResponderAssessment(
          'emergencies',
          primaryReportId,
          fields,
          options,
        );
      } catch {
        // Primary report sync is best-effort; incident assessment remains source of truth.
      }
    }
  }

  return assessment;
}

export function resolveSceneAssessmentIncidentType(input: {
  incidentType?: string | null;
  incidentCategory?: string | null;
}): string {
  if (input.incidentType) {
    return input.incidentType;
  }
  return mapIncidentCategoryToEmergencyType(input.incidentCategory);
}
