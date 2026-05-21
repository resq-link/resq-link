import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './config';
import { normalizeQuadrant, type OperationalQuadrant } from './quadrants';
import type { ResourceRecord, ResourceStatus, ResourceType } from './resources';
import { type DispatcherRole } from './auth';

export type IncidentSource = 'civilian_app' | 'call' | 'sms' | 'walk_in' | 'radio' | 'manual';
export type IncidentCategory =
  | 'fire'
  | 'peace_and_order'
  | 'medical'
  | 'vehicular'
  | 'utility'
  | 'community'
  | 'other';
export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus =
  | 'new'
  | 'awaiting_resources'
  | 'liaison_pending'
  | 'dispatched'
  | 'enroute'
  | 'on_scene'
  | 'resolved'
  | 'unresolved';
export type ResolutionStatus = 'open' | 'resolved' | 'unresolved';
export type AgencyCode =
  | 'PNP'
  | 'RESCUE_1111'
  | 'TCPGH'
  | 'CHO'
  | 'BFP'
  | 'TFLC'
  | 'PCG'
  | 'PSSO_TCTMG'
  | 'BARANGAY_OFFICIALS'
  | 'WATER_DISTRICT'
  | 'CAGELCO_1'
  | 'COMMAND_CENTER'
  | 'OTHER';

export type TeamOnDuty = 'Whiskey' | 'X-ray' | 'Yankee' | 'Zulu';
export type ScheduleOfDuty = 'AM' | 'PM';

export interface IncidentTypeRule {
  id: string;
  label: string;
  category: IncidentCategory;
  priority: IncidentPriority;
  recommendedAgencies: AgencyCode[];
  suggestedResourceTypes: ResourceType[];
  requiresExternalAgency: boolean;
  requiresVehicularReason?: boolean;
}

export interface IncidentRecord {
  id?: string;
  referenceNumber: string;
  associatedReportIds?: string[]; // Linked citizen emergency report IDs
  source: IncidentSource;
  createdByUserId: string;
  commandCenterAdminId: string;
  incidentCategory: IncidentCategory;
  incidentSubtypeId: string;
  incidentSubtypeLabel: string;
  priority: IncidentPriority;
  locationText: string;
  landmark?: string | null;
  quadrant?: OperationalQuadrant | null;
  latitude?: number | null;
  longitude?: number | null;
  callerName?: string | null;
  callerContact?: string | null;
  description?: string | null;
  vehicularAccidentReason?: string | null;
  notes?: string | null;
  requiresExternalAgency: boolean;
  recommendedAgencies: AgencyCode[];
  assignedAgencies: AgencyCode[];
  assignedResourceIds: string[];
  teamId?: string | null;
  teamName?: string | null;
  // Duty fields (Phase 1: derived from dispatcher intake date/time)
  incidentDate?: string | null; // YYYY-MM-DD (Asia/Manila)
  incidentTime?: string | null; // hh:mm AM/PM (Asia/Manila)
  dateOfDuty?: string | null; // YYYY-MM-DD (derived == incidentDate)
  scheduleOfDuty?: ScheduleOfDuty | null; // derived from incidentTime AM/PM
  teamOnDuty?: TeamOnDuty | null;
  status: IncidentStatus;
  resolutionStatus: ResolutionStatus;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
  resolvedAt?: Date | Timestamp | null;
  // Responder Tracking Fields (1 team per incident)
  acceptedAt?: Date | Timestamp | null;
  touchdownAt?: Date | Timestamp | null;
  responseTimeSeconds?: number | null;
  touchdownByDispatcherId?: string | null;
  touchdownByName?: string | null;
  touchdownSource?: 'gps' | 'manual' | null;
  touchdownDistanceMeters?: number | null;
  postIncidentReport?: {
    reasonForIncident?: string | null;
    notes?: string | null;
    peopleInvolved?: number | null;
    peopleStatus?: string | null;
    hospital?: string | null;
    submittedAt?: Date | Timestamp | null;
    submittedByDispatcherId?: string | null;
    submittedByName?: string | null;
  } | null;
}

export interface IncidentDispatchRecord {
  id?: string;
  incidentId: string;
  incidentReferenceNumber: string;
  agency: AgencyCode;
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  resourceCode?: string | null;
  primaryResponderId?: string | null;
  assignedResponderIds?: string[];
  teamId?: string | null;
  teamName?: string | null;
  status: 'assigned';
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface CreateIncidentInput {
  source: IncidentSource;
  incidentSubtypeId: string;
  locationText: string;
  landmark?: string | null;
  quadrant?: OperationalQuadrant | null;
  latitude?: number | null;
  longitude?: number | null;
  callerName?: string | null;
  callerContact?: string | null;
  description?: string | null;
  vehicularAccidentReason?: string | null;
  notes?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  // Duty fields (Phase 1)
  teamOnDuty: TeamOnDuty;
  incidentDate: string; // YYYY-MM-DD
  incidentTime: string; // hh:mm AM/PM
}

export interface SaveIncidentTypeRuleInput {
  id: string;
  label: string;
  category: IncidentCategory;
  priority: IncidentPriority;
  recommendedAgencies: AgencyCode[];
  suggestedResourceTypes: ResourceType[];
  requiresExternalAgency: boolean;
  requiresVehicularReason?: boolean;
}

const resourceTypeByAgency: Partial<Record<AgencyCode, ResourceType>> = {
  PNP: 'PNP',
  RESCUE_1111: 'MDRRMO',
  TCPGH: 'AMBULANCE',
  CHO: 'AMBULANCE',
  BFP: 'BFP',
  TFLC: 'MDRRMO',
  PCG: 'PCG',
  PSSO_TCTMG: 'OTHER',
};

const agencyCatalog: Record<AgencyCode, string> = {
  PNP: 'PNP',
  RESCUE_1111: 'Rescue 1111',
  TCPGH: 'Tuguegarao City People’s General Hospital (TCPGH)',
  CHO: 'City Health Office (CHO)',
  BFP: 'BFP',
  TFLC: 'Task Force Lingkod Cagayan (TFLC)',
  PCG: 'Philippine Coast Guard (PCG)',
  PSSO_TCTMG: 'PSSO / TCTMG',
  BARANGAY_OFFICIALS: 'Barangay Officials',
  WATER_DISTRICT: 'Water District',
  CAGELCO_1: 'CAGELCO 1',
  COMMAND_CENTER: 'Command Center',
  OTHER: 'Others',
};
let incidentTypeRulesCache: IncidentTypeRule[] = [];
const incidentRuleMap = new Map<string, IncidentTypeRule>();

const ensureAuthenticated = () => {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to manage incidents');
  }
  return currentUser;
};

const normalizeNullableString = (value?: string | null): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const normalizeNullableNumber = (value?: number | null): number | null => {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  return value;
};

const normalizeTeamOnDuty = (value: unknown): TeamOnDuty | null => {
  if (value === 'Whiskey' || value === 'X-ray' || value === 'Yankee' || value === 'Zulu') {
    return value;
  }
  return null;
};

const normalizeScheduleOfDuty = (value: unknown): ScheduleOfDuty | null => {
  if (value === 'AM' || value === 'PM') return value;
  return null;
};

const normalizeIncidentDate = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
};

const INCIDENT_TIME_REGEX = /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i;
const normalizeIncidentTimeAndDeriveSchedule = (
  value: unknown
): { incidentTime: string; scheduleOfDuty: ScheduleOfDuty } => {
  if (typeof value !== 'string') {
    throw new Error('Incident time is invalid.');
  }

  const trimmed = value.trim();
  const match = trimmed.match(INCIDENT_TIME_REGEX);
  if (!match) {
    throw new Error('Incident time must be in format hh:mm AM/PM.');
  }

  const hourRaw = match[1]
  const minute = match[2]
  const periodRaw = match[3]

  const hour = Number(hourRaw)
  const period = periodRaw.toUpperCase() as 'AM' | 'PM'
  const scheduleOfDuty: ScheduleOfDuty = period === 'PM' ? 'PM' : 'AM'

  const hh = String(hour).padStart(2, '0')
  const incidentTime = `${hh}:${minute} ${period}`

  return { incidentTime, scheduleOfDuty }
}

const arraysMatch = (left: string[], right: string[]) => {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((value, index) => value === rightSorted[index]);
};

const toIncidentRecord = (snapshot: DocumentData): IncidentRecord => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    referenceNumber: data.referenceNumber || '',
    associatedReportIds: Array.isArray(data.associatedReportIds) ? data.associatedReportIds : [],
    source: data.source || 'manual',
    createdByUserId: data.createdByUserId || '',
    commandCenterAdminId: data.commandCenterAdminId || '',
    incidentCategory: data.incidentCategory || 'other',
    incidentSubtypeId: data.incidentSubtypeId || '',
    incidentSubtypeLabel: data.incidentSubtypeLabel || '',
    priority: data.priority || 'medium',
    locationText: data.locationText || '',
    landmark: data.landmark || null,
    quadrant: normalizeQuadrant(data.quadrant),
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    callerName: data.callerName || null,
    callerContact: data.callerContact || null,
    description: data.description || null,
    vehicularAccidentReason: data.vehicularAccidentReason || null,
    notes: data.notes || null,
    requiresExternalAgency: Boolean(data.requiresExternalAgency),
    recommendedAgencies: Array.isArray(data.recommendedAgencies) ? data.recommendedAgencies : [],
    assignedAgencies: Array.isArray(data.assignedAgencies) ? data.assignedAgencies : [],
    assignedResourceIds: Array.isArray(data.assignedResourceIds) ? data.assignedResourceIds : [],
    teamId: data.teamId || null,
    teamName: data.teamName || null,
    incidentDate: normalizeIncidentDate(data.incidentDate),
    incidentTime: typeof data.incidentTime === 'string' ? data.incidentTime : null,
    dateOfDuty: normalizeIncidentDate(data.dateOfDuty),
    scheduleOfDuty: normalizeScheduleOfDuty(data.scheduleOfDuty),
    teamOnDuty: normalizeTeamOnDuty(data.teamOnDuty),
    status: data.status || 'new',
    resolutionStatus: data.resolutionStatus || 'open',
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
    resolvedAt: data.resolvedAt?.toDate ? data.resolvedAt.toDate() : null,
    acceptedAt: data.acceptedAt?.toDate ? data.acceptedAt.toDate() : (data.acceptedAt ? new Date(data.acceptedAt) : null),
    touchdownAt: data.touchdownAt?.toDate ? data.touchdownAt.toDate() : (data.touchdownAt ? new Date(data.touchdownAt) : null),
    responseTimeSeconds: typeof data.responseTimeSeconds === 'number' ? data.responseTimeSeconds : null,
  };
};

const toIncidentTypeRule = (snapshot: DocumentData): IncidentTypeRule => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    label: data.label || snapshot.id,
    category: data.category || 'other',
    priority: data.priority || 'medium',
    recommendedAgencies: Array.isArray(data.recommendedAgencies) ? data.recommendedAgencies : [],
    suggestedResourceTypes: Array.isArray(data.suggestedResourceTypes) ? data.suggestedResourceTypes : [],
    requiresExternalAgency:
      typeof data.requiresExternalAgency === 'boolean'
        ? data.requiresExternalAgency
        : false,
    requiresVehicularReason:
      typeof data.requiresVehicularReason === 'boolean'
        ? data.requiresVehicularReason
        : false,
  };
};

const setIncidentTypeRulesCache = (rules: IncidentTypeRule[]) => {
  incidentTypeRulesCache = [...rules];
  incidentRuleMap.clear();
  rules.forEach((rule) => {
    incidentRuleMap.set(rule.id, rule);
  });
};

const toDispatchRecord = (
  incidentId: string,
  referenceNumber: string,
  resource: ResourceRecord,
  teamId?: string | null,
  teamName?: string | null
): Omit<IncidentDispatchRecord, 'id'> => ({
  incidentId,
  incidentReferenceNumber: referenceNumber,
  agency: inferAgencyCodeForResource(resource),
  resourceId: resource.id || '',
  resourceName: resource.name,
  resourceType: resource.type,
  resourceCode: resource.resourceCode || null,
  primaryResponderId: resource.primaryResponderId || resource.assignedResponderId || null,
  assignedResponderIds: Array.isArray(resource.assignedResponderIds)
    ? resource.assignedResponderIds
    : resource.assignedResponderId
      ? [resource.assignedResponderId]
      : [],
  teamId: teamId || null,
  teamName: teamName || null,
  status: 'assigned',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const inferAgencyCodeForResource = (resource: Pick<ResourceRecord, 'agency' | 'type'>): AgencyCode => {
  const haystack = `${resource.agency || ''} ${resource.type}`.toLowerCase();
  if (haystack.includes('bfp')) return 'BFP';
  if (haystack.includes('pnp')) return 'PNP';
  if (haystack.includes('coast') || haystack.includes('pcg')) return 'PCG';
  if (haystack.includes('hospital') || haystack.includes('tcpgh')) return 'TCPGH';
  if (haystack.includes('health') || haystack.includes('cho')) return 'CHO';
  if (resource.type === 'AMBULANCE') return 'TCPGH';
  if (haystack.includes('rescue') || haystack.includes('mdrrmo')) return 'RESCUE_1111';
  if (haystack.includes('lingkod') || haystack.includes('tflc')) return 'TFLC';
  if (haystack.includes('psso') || haystack.includes('tctmg') || haystack.includes('traffic')) return 'PSSO_TCTMG';
  if (haystack.includes('cagelco')) return 'CAGELCO_1';
  if (haystack.includes('water')) return 'WATER_DISTRICT';
  return 'OTHER';
};

const isResourceAvailable = (status: ResourceStatus) => status === 'available';

const normalizeResponderIds = (resource: Pick<ResourceRecord, 'primaryResponderId' | 'assignedResponderId' | 'assignedResponderIds'>): string[] => {
  const ids = [
    resource.primaryResponderId,
    resource.assignedResponderId,
    ...(Array.isArray(resource.assignedResponderIds) ? resource.assignedResponderIds : []),
  ];
  return Array.from(new Set(ids.map((id) => id?.trim()).filter((id): id is string => Boolean(id))));
};

const isAgencyResponderProfile = (profile: Record<string, unknown>): boolean => {
  const designation = typeof profile.designation === 'string' ? profile.designation.trim().toLowerCase() : '';
  const role = typeof profile.role === 'string' ? profile.role.trim().toUpperCase() : '';
  return (
    designation.includes('responder') ||
    ['AMBULANCE', 'BFP', 'PNP', 'MDRRMO', 'PCG'].includes(role)
  );
};

async function assertResourceHasActiveResponder(resource: ResourceRecord): Promise<string[]> {
  const responderIds = normalizeResponderIds(resource);
  const primaryResponderId = resource.primaryResponderId || resource.assignedResponderId || responderIds[0] || null;

  if (!primaryResponderId || responderIds.length === 0) {
    throw new Error(`Resource "${resource.name}" must be bound to an active responder before dispatch.`);
  }

  const primaryResponderSnapshot = await getDoc(doc(getFirebaseFirestore(), 'dispatchers', primaryResponderId));
  if (!primaryResponderSnapshot.exists()) {
    throw new Error(`Primary responder for "${resource.name}" was not found.`);
  }

  const primaryResponder = primaryResponderSnapshot.data();
  if (primaryResponder.active === false || !isAgencyResponderProfile(primaryResponder)) {
    throw new Error(`Primary responder for "${resource.name}" must be an active responder or agency account.`);
  }

  return responderIds;
}

export const incidentAgencyCatalog = agencyCatalog;

export function getIncidentTypeRules(): IncidentTypeRule[] {
  return incidentTypeRulesCache;
}

export function getIncidentTypeRuleById(ruleId: string): IncidentTypeRule | null {
  return incidentRuleMap.get(ruleId) || null;
}

export async function fetchIncidentTypeRules(): Promise<IncidentTypeRule[]> {
  const rulesRef = collection(getFirebaseFirestore(), 'incidentTypeRules');
  const snapshot = await getDocs(query(rulesRef, limit(500)));
  const rules = snapshot.docs
    .map(toIncidentTypeRule)
    .sort((left, right) => left.label.localeCompare(right.label));
  setIncidentTypeRulesCache(rules);
  return rules;
}

export async function resolveIncidentTypeRuleById(ruleId: string): Promise<IncidentTypeRule | null> {
  try {
    const snapshot = await getDoc(doc(getFirebaseFirestore(), 'incidentTypeRules', ruleId));
    if (snapshot.exists()) {
      const rule = toIncidentTypeRule(snapshot);
      const nextRules = incidentTypeRulesCache
        .filter((item) => item.id !== rule.id)
        .concat(rule)
        .sort((left, right) => left.label.localeCompare(right.label));
      setIncidentTypeRulesCache(nextRules);
      return rule;
    }
  } catch (error) {
    console.error('Error resolving incident type rule from Firestore:', error);
  }

  return null;
}

export function getAgencyLabel(agency: AgencyCode): string {
  return agencyCatalog[agency];
}

export function getExpectedResourceTypesForAgencies(agencies: AgencyCode[]): ResourceType[] {
  return Array.from(
    new Set(
      agencies
        .map((agency) => resourceTypeByAgency[agency])
        .filter((value): value is ResourceType => Boolean(value))
    )
  );
}

export async function saveIncidentTypeRule(input: SaveIncidentTypeRuleInput): Promise<IncidentTypeRule> {
  ensureAuthenticated();

  if (!input.id.trim()) {
    throw new Error('Incident rule ID is required.');
  }

  if (!input.label.trim()) {
    throw new Error('Incident rule label is required.');
  }

  if (input.recommendedAgencies.length === 0) {
    throw new Error('At least one agency must be assigned to the incident type.');
  }

  const payload: IncidentTypeRule = {
    id: input.id.trim(),
    label: input.label.trim(),
    category: input.category,
    priority: input.priority,
    recommendedAgencies: Array.from(new Set(input.recommendedAgencies)),
    suggestedResourceTypes: Array.from(new Set(input.suggestedResourceTypes)),
    requiresExternalAgency: input.requiresExternalAgency,
    requiresVehicularReason: Boolean(input.requiresVehicularReason),
  };

  await setDoc(doc(getFirebaseFirestore(), 'incidentTypeRules', payload.id), {
    ...payload,
    updatedAt: Timestamp.now(),
  });

  const nextRules = incidentTypeRulesCache
    .filter((item) => item.id !== payload.id)
    .concat(payload)
    .sort((left, right) => left.label.localeCompare(right.label));
  setIncidentTypeRulesCache(nextRules);

  return payload;
}

function isPermissionDenied(error: any): boolean {
  const code = error?.code
  const message = (error?.message ?? '').toLowerCase()
  return (
    code === 'permission-denied' ||
    message.includes('missing or insufficient permissions') ||
    message.includes('insufficient permissions') ||
    message.includes('permission denied')
  )
}

export function subscribeToIncidentTypeRules(
  callback: (rules: IncidentTypeRule[]) => void
): () => void {
  try {
    if (!getFirebaseAuth().currentUser) {
      setIncidentTypeRulesCache([]);
      callback([]);
      return () => {};
    }

    const rulesRef = collection(getFirebaseFirestore(), 'incidentTypeRules');
    const q = query(rulesRef, limit(500));

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        const rules = snapshot.docs
          .map(toIncidentTypeRule)
          .sort((left, right) => left.label.localeCompare(right.label));
        setIncidentTypeRulesCache(rules);
        callback(rules);
      },
      (error) => {
        setIncidentTypeRulesCache([]);
        if (isPermissionDenied(error)) {
          callback([]);
          return
        }
        console.error('Error subscribing to incident type rules:', error);
        callback([]);
      }
    );
  } catch (error) {
    setIncidentTypeRulesCache([]);
    if (!isPermissionDenied(error)) {
      console.error('Error setting up incident type rule subscription:', error);
    }
    callback([]);
    return () => {};
  }
}

export async function createIncident(input: CreateIncidentInput): Promise<IncidentRecord> {
  const currentUser = ensureAuthenticated();
  const rule = await resolveIncidentTypeRuleById(input.incidentSubtypeId);

  if (!rule) {
    throw new Error('Incident subtype is invalid.');
  }

  if (!input.locationText.trim()) {
    throw new Error('Incident location is required.');
  }

  if (rule.requiresVehicularReason && !normalizeNullableString(input.vehicularAccidentReason)) {
    throw new Error('Vehicular incidents require an accident reason.');
  }

  if (!input.teamOnDuty) {
    throw new Error('Team on duty is required.');
  }

  const incidentDate = normalizeIncidentDate(input.incidentDate);
  if (!incidentDate) {
    throw new Error('Incident date is required.');
  }

  const { incidentTime, scheduleOfDuty } = normalizeIncidentTimeAndDeriveSchedule(input.incidentTime);

  const incidentsRef = collection(getFirebaseFirestore(), 'incidents');
  const createdAt = Timestamp.now();
  const initialStatus: IncidentStatus = rule.requiresExternalAgency ? 'liaison_pending' : 'awaiting_resources';
  const referenceNumber = `INC-${Date.now()}`;

  const payload: Omit<IncidentRecord, 'id' | 'createdAt' | 'updatedAt'> & {
    createdAt: Timestamp;
    updatedAt: Timestamp;
  } = {
    referenceNumber,
    associatedReportIds: [],
    source: input.source,
    createdByUserId: currentUser.uid,
    commandCenterAdminId: currentUser.uid,
    incidentCategory: rule.category,
    incidentSubtypeId: rule.id,
    incidentSubtypeLabel: rule.label,
    priority: rule.priority,
    locationText: input.locationText.trim(),
    landmark: normalizeNullableString(input.landmark),
    quadrant: normalizeQuadrant(input.quadrant),
    latitude: normalizeNullableNumber(input.latitude),
    longitude: normalizeNullableNumber(input.longitude),
    callerName: normalizeNullableString(input.callerName),
    callerContact: normalizeNullableString(input.callerContact),
    description: normalizeNullableString(input.description),
    vehicularAccidentReason: normalizeNullableString(input.vehicularAccidentReason),
    notes: normalizeNullableString(input.notes),
    requiresExternalAgency: rule.requiresExternalAgency,
    recommendedAgencies: rule.recommendedAgencies,
    assignedAgencies: rule.recommendedAgencies,
    assignedResourceIds: [],
    teamId: normalizeNullableString(input.teamId),
    // Team assignment is derived from the selected "teamOnDuty" only.
    // Provision-style inputs (e.g. nullable teamName) are ignored for new incidents.
    teamName: input.teamOnDuty,
    teamOnDuty: input.teamOnDuty,
    incidentDate,
    incidentTime,
    dateOfDuty: incidentDate,
    scheduleOfDuty,
    status: initialStatus,
    resolutionStatus: 'open',
    createdAt,
    updatedAt: createdAt,
    resolvedAt: null,
  };

  const created = await addDoc(incidentsRef, payload);
  return {
    ...payload,
    id: created.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function dispatchIncidentResources(
  incidentId: string,
  resourceIds: string[]
): Promise<void> {
  const currentUser = ensureAuthenticated();
  const normalizedIds = Array.from(new Set(resourceIds.map((id) => id.trim()).filter(Boolean)));

  if (normalizedIds.length === 0) {
    return;
  }

  const incidentRef = doc(getFirebaseFirestore(), 'incidents', incidentId);
  const incidentSnapshot = await getDoc(incidentRef);

  if (!incidentSnapshot.exists()) {
    throw new Error('Incident not found.');
  }

  const incident = toIncidentRecord(incidentSnapshot);
  if (incident.commandCenterAdminId !== currentUser.uid) {
    throw new Error('Only the command center admin assigned to the incident can dispatch resources.');
  }

  const rule = await resolveIncidentTypeRuleById(incident.incidentSubtypeId);
  if (!rule) {
    throw new Error('Incident rule no longer exists.');
  }

  const resources = await Promise.all(
    normalizedIds.map(async (resourceId) => {
      const resourceSnapshot = await getDoc(doc(getFirebaseFirestore(), 'resources', resourceId));
      if (!resourceSnapshot.exists()) {
        throw new Error(`Resource ${resourceId} was not found.`);
      }

      const data = resourceSnapshot.data();
      const resource: ResourceRecord = {
        id: resourceSnapshot.id,
        name: data.name || '',
        resourceCode: data.resourceCode || null,
        type: data.type || 'OTHER',
        customType: data.customType || null,
        agency: data.agency || null,
        department: data.department || null,
        teamId: data.teamId || null,
        teamName: data.teamName || null,
        status: data.status || 'available',
        stationName: data.stationName || null,
        quadrant: data.quadrant || null,
        stationLatitude: data.stationLatitude ?? null,
        stationLongitude: data.stationLongitude ?? null,
        currentLatitude: data.currentLatitude ?? null,
        currentLongitude: data.currentLongitude ?? null,
        primaryResponderId: data.primaryResponderId || data.assignedResponderId || null,
        assignedResponderIds: Array.isArray(data.assignedResponderIds)
          ? data.assignedResponderIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
          : data.assignedResponderId
            ? [data.assignedResponderId]
            : [],
        assignedResponderId: data.assignedResponderId || null,
        assignedIncidentId: data.assignedIncidentId || null,
        notes: data.notes || null,
        isActive: data.isActive !== false,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
      };
      return { ref: resourceSnapshot.ref, resource };
    })
  );

  const resourceAgencyCodes = Array.from(new Set(resources.map(({ resource }) => inferAgencyCodeForResource(resource))));
  const invalidAgency = resourceAgencyCodes.find((agency) => !incident.assignedAgencies.includes(agency));
  if (invalidAgency) {
    throw new Error(`Selected resource does not match the mandatory agency routing: ${getAgencyLabel(invalidAgency)}.`);
  }

  const missingAgencies = incident.assignedAgencies.filter((agency) => !resourceAgencyCodes.includes(agency));
  const requiredResourceTypes = getExpectedResourceTypesForAgencies(incident.assignedAgencies);
  const selectedTypes = Array.from(new Set(resources.map(({ resource }) => resource.type)));
  const missingResourceTypes = requiredResourceTypes.filter((type) => !selectedTypes.includes(type));
  const hasTypeCoverage =
    requiredResourceTypes.length === 0 ||
    missingResourceTypes.length === 0;

  if (missingAgencies.length > 0 && hasTypeCoverage === false) {
    throw new Error(
      `Selected resources do not fully cover the mandatory agency recommendation. Missing: ${missingAgencies.map(getAgencyLabel).join(', ')} / ${missingResourceTypes.join(', ')}.`
    );
  }

  const unavailable = resources.find(({ resource }) => !isResourceAvailable(resource.status));
  if (unavailable) {
    throw new Error(`Resource "${unavailable.resource.name}" is not available.`);
  }

  const boundResponderIds = Array.from(
    new Set((await Promise.all(resources.map(({ resource }) => assertResourceHasActiveResponder(resource)))).flat())
  );
  const existingIds = incident.assignedResourceIds || [];
  const mergedResourceIds = Array.from(new Set([...existingIds, ...normalizedIds, ...boundResponderIds]));
  const batch = writeBatch(getFirebaseFirestore());
  const dispatchesRef = collection(getFirebaseFirestore(), 'incidentDispatches');
  const timestamp = Timestamp.now();

  resources.forEach(({ ref, resource }) => {
    const dispatchRef = doc(dispatchesRef);
    const dispatchPayload = toDispatchRecord(
      incidentId,
      incident.referenceNumber,
      resource,
      resource.teamId || incident.teamId || null,
      resource.teamName || incident.teamName || null
    );

    batch.set(dispatchRef, {
      ...dispatchPayload,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    batch.update(ref, {
      status: 'assigned',
      assignedIncidentId: incidentId,
      updatedAt: timestamp,
    });
  });

  batch.update(incidentRef, {
    assignedAgencies: rule.recommendedAgencies,
    assignedResourceIds: mergedResourceIds,
    status: 'dispatched',
    updatedAt: timestamp,
  });

  await batch.commit();
}

export async function deleteIncident(incidentId: string): Promise<void> {
  const currentUser = ensureAuthenticated();
  const db = getFirebaseFirestore();
  const incidentRef = doc(db, 'incidents', incidentId);
  const incidentSnapshot = await getDoc(incidentRef);

  if (!incidentSnapshot.exists()) {
    return;
  }

  const incident = toIncidentRecord(incidentSnapshot);
  if (incident.commandCenterAdminId !== currentUser.uid) {
    throw new Error('Only the command center admin assigned to the incident can remove it.');
  }

  const batch = writeBatch(db);
  const resourcesSnapshot = await getDocs(
    query(collection(db, 'resources'), where('assignedIncidentId', '==', incidentId))
  );
  const dispatchesSnapshot = await getDocs(
    query(collection(db, 'incidentDispatches'), where('incidentId', '==', incidentId))
  );
  const timestamp = Timestamp.now();

  resourcesSnapshot.forEach((resourceDoc) => {
    batch.update(resourceDoc.ref, {
      status: 'available',
      assignedIncidentId: null,
      updatedAt: timestamp,
    });
  });

  dispatchesSnapshot.forEach((dispatchDoc) => {
    batch.delete(dispatchDoc.ref);
  });

  batch.delete(incidentRef);
  await batch.commit();
}

export function subscribeToIncidents(
  callback: (incidents: IncidentRecord[]) => void,
  limitCount: number = 100,
  options?: {
    includeAllCommandCenters?: boolean;
  }
): () => void {
  try {
    // Avoid permission errors during auth initialization races.
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      callback([]);
      return () => {};
    }

    const incidentsRef = collection(getFirebaseFirestore(), 'incidents');
    const constraints = options?.includeAllCommandCenters
      ? [limit(limitCount * 3)]
      : [
          // Scope to the signed-in command center by default.
          // This matches authorization checks used in `dispatchIncidentResources`.
          where('commandCenterAdminId', '==', currentUser.uid),
          limit(limitCount * 3),
        ];
    const q = query(incidentsRef, ...constraints);

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        const incidents = snapshot.docs
          .map(toIncidentRecord)
          .sort((left, right) => {
            const leftTime =
              left.createdAt instanceof Date
                ? left.createdAt.getTime()
                : left.createdAt && typeof left.createdAt === 'object' && 'toDate' in left.createdAt
                  ? left.createdAt.toDate().getTime()
                  : 0;
            const rightTime =
              right.createdAt instanceof Date
                ? right.createdAt.getTime()
                : right.createdAt && typeof right.createdAt === 'object' && 'toDate' in right.createdAt
                  ? right.createdAt.toDate().getTime()
                  : 0;
            return rightTime - leftTime;
          })
          .slice(0, limitCount);
        callback(incidents);
      },
      (error) => {
        // Avoid console spam for expected auth/rules failures.
        if (isPermissionDenied(error)) {
          callback([]);
          return
        }
        console.error('Error subscribing to incidents:', error);
        callback([]);
      }
    );
  } catch (error) {
    if (!isPermissionDenied(error)) {
      console.error('Error setting up incidents subscription:', error);
    }
    return () => {};
  }
}

export function formatIncidentStatus(status: IncidentStatus): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getIncidentPriorityTone(priority: IncidentPriority): string {
  switch (priority) {
    case 'critical':
      return 'text-red-300';
    case 'high':
      return 'text-amber-300';
    case 'medium':
      return 'text-blue-300';
    default:
      return 'text-slate-300';
  }
}

export function getIncidentResourceMatch(
  resource: Pick<ResourceRecord, 'agency' | 'department' | 'type' | 'status' | 'primaryResponderId' | 'assignedResponderId' | 'assignedResponderIds'>,
  rule: IncidentTypeRule
): boolean {
  if (!isResourceAvailable(resource.status)) {
    return false;
  }

  if (normalizeResponderIds(resource).length === 0) {
    return false;
  }

  const inferredAgency = inferAgencyCodeForResource(resource);
  if (rule.recommendedAgencies.includes(inferredAgency)) {
    return true;
  }

  return rule.suggestedResourceTypes.includes(resource.type);
}

export function validateIncidentAgencyRouting(
  incidentSubtypeId: string,
  agencies: AgencyCode[]
): boolean {
  const rule = getIncidentTypeRuleById(incidentSubtypeId);
  if (!rule) {
    return false;
  }

  return arraysMatch(rule.recommendedAgencies, agencies);
}

/**
 * Associate multiple emergency reports with a master incident record in a batch/transaction.
 * Updates both the incident's associatedReportIds array and the status/incidentId of each report.
 * @param incidentId - The ID of the master incident record
 * @param reportIds - Array of emergency report IDs to associate
 */
export async function associateReportsWithIncident(
  incidentId: string,
  reportIds: string[]
): Promise<void> {
  const currentUser = ensureAuthenticated();
  
  const db = getFirebaseFirestore();
  const incidentRef = doc(db, 'incidents', incidentId);
  const incidentSnapshot = await getDoc(incidentRef);
  
  if (!incidentSnapshot.exists()) {
    throw new Error('Incident not found.');
  }
  
  const incident = toIncidentRecord(incidentSnapshot);
  if (incident.commandCenterAdminId !== currentUser.uid) {
    throw new Error('Only the command center admin assigned to the incident can associate reports.');
  }

  const batch = writeBatch(db);
  const timestamp = Timestamp.now();
  
  // Calculate merged report IDs
  const existingReportIds = incident.associatedReportIds || [];
  const mergedReportIds = Array.from(new Set([...existingReportIds, ...reportIds]));
  
  // Determine if this is a late association (incident already enroute, on scene, or resolved)
  const isLateAssociation = ['enroute', 'on_scene', 'resolved'].includes(incident.status);
  
  // Fetch assignment details from an existing associated report if possible
  let existingAssignment: any = {};
  if (existingReportIds.length > 0) {
    try {
      const existingRef = doc(db, 'emergencies', existingReportIds[0]);
      const existingSnap = await getDoc(existingRef);
      if (existingSnap.exists()) {
        const eData = existingSnap.data();
        existingAssignment = {
          responder: eData.responder || null,
          assignedResponderId: eData.assignedResponderId || null,
          assignedAgency: eData.assignedAgency || null,
          suggestedAgency: eData.suggestedAgency || null,
          dispatcherId: eData.dispatcherId || eData.dispatcher_id || null,
        };
      }
    } catch (err) {
      console.error('Error fetching existing report for assignment cloning:', err);
    }
  }

  // Update each EmergencyReport document to link it to the incident
  reportIds.forEach((reportId) => {
    const reportRef = doc(db, 'emergencies', reportId);
    const reportPayload: any = {
      incidentId: incidentId,
      updatedAt: timestamp,
    };

    if (isLateAssociation) {
      reportPayload.status = incident.status;
      if (incident.acceptedAt) reportPayload.acceptedAt = incident.acceptedAt;
      if (incident.touchdownAt) reportPayload.touchdownAt = incident.touchdownAt;
      if (incident.responseTimeSeconds != null) reportPayload.responseTimeSeconds = incident.responseTimeSeconds;
      if (incident.resolvedAt) reportPayload.resolvedAt = incident.resolvedAt;

      // Copy BFP responder/dispatcher credentials so they can read/manage this civilian report in Firestore rules
      if (existingAssignment.responder) reportPayload.responder = existingAssignment.responder;
      if (existingAssignment.assignedResponderId) reportPayload.assignedResponderId = existingAssignment.assignedResponderId;
      if (existingAssignment.assignedAgency) reportPayload.assignedAgency = existingAssignment.assignedAgency;
      if (existingAssignment.suggestedAgency) reportPayload.suggestedAgency = existingAssignment.suggestedAgency;
      if (existingAssignment.dispatcherId) {
        reportPayload.dispatcherId = existingAssignment.dispatcherId;
        reportPayload.dispatcher_id = existingAssignment.dispatcherId;
      }
    } else {
      reportPayload.status = 'linked';
    }

    batch.update(reportRef, reportPayload);
  });
  
  // Update the master IncidentRecord
  batch.update(incidentRef, {
    associatedReportIds: mergedReportIds,
    updatedAt: timestamp,
  });
  
  await batch.commit();
}

/**
 * Unassociate an emergency report from a master incident record.
 * @param incidentId - The ID of the master incident record
 * @param reportId - The ID of the emergency report to unlink
 */
export async function disassociateReportFromIncident(
  incidentId: string,
  reportId: string
): Promise<void> {
  const currentUser = ensureAuthenticated();
  
  const db = getFirebaseFirestore();
  const incidentRef = doc(db, 'incidents', incidentId);
  const incidentSnapshot = await getDoc(incidentRef);
  
  if (!incidentSnapshot.exists()) {
    throw new Error('Incident not found.');
  }
  
  const incident = toIncidentRecord(incidentSnapshot);
  if (incident.commandCenterAdminId !== currentUser.uid) {
    throw new Error('Only the command center admin assigned to the incident can disassociate reports.');
  }

  const batch = writeBatch(db);
  const timestamp = Timestamp.now();
  
  // Remove the report ID from the incident's array
  const existingReportIds = incident.associatedReportIds || [];
  const updatedReportIds = existingReportIds.filter(id => id !== reportId);
  
  // Update the EmergencyReport document to unlink it
  const reportRef = doc(db, 'emergencies', reportId);
  batch.update(reportRef, {
    incidentId: null,
    status: 'pending', // Reverts to pending when unlinked
    updatedAt: timestamp,
  });
  
  // Update the master IncidentRecord
  batch.update(incidentRef, {
    associatedReportIds: updatedReportIds,
    updatedAt: timestamp,
  });
  
  await batch.commit();
}

/**
 * Elevate a civilian emergency report to a master incident record atomically.
 */
export async function elevateEmergencyToIncident(
  reportId: string,
  input: {
    priority?: 'low' | 'medium' | 'high' | 'critical' | null;
    teamOnDuty: string;
    incidentSubtypeId: string;
    incidentSubtypeLabel: string;
    assignedResponderId?: string | null;
    responderName?: string | null;
    assignedAgency?: DispatcherRole | null;
  }
): Promise<IncidentRecord> {
  const currentUser = ensureAuthenticated();
  const db = getFirebaseFirestore();
  
  // 1. Fetch the civilian emergency report
  const reportRef = doc(db, 'emergencies', reportId);
  const reportSnap = await getDoc(reportRef);
  if (!reportSnap.exists()) {
    throw new Error('Civilian report not found.');
  }
  const report = reportSnap.data();

  // 2. Set up the master incident fields
  const incidentsRef = collection(db, 'incidents');
  const incidentDocRef = doc(incidentsRef); // Auto-generate ID
  const referenceNumber = `INC-${Date.now()}`;
  const timestamp = Timestamp.now();

  const isAssigned = Boolean(input.assignedResponderId || input.responderName);
  const initialStatus: IncidentStatus = isAssigned ? 'dispatched' : 'awaiting_resources';

  const incidentPayload: IncidentRecord = {
    id: incidentDocRef.id,
    referenceNumber,
    associatedReportIds: [reportId],
    source: 'civilian_app',
    createdByUserId: currentUser.uid,
    commandCenterAdminId: currentUser.uid,
    incidentCategory: report.incidentType || 'other',
    incidentSubtypeId: input.incidentSubtypeId,
    incidentSubtypeLabel: input.incidentSubtypeLabel,
    priority: input.priority || report.priority || 'medium',
    locationText: report.locationText || 'No location provided',
    landmark: report.landmark || null,
    quadrant: report.quadrant || null,
    latitude: report.latitude || null,
    longitude: report.longitude || null,
    callerName: report.userName || 'Citizen Reporter',
    callerContact: report.userPhone || null,
    description: report.description || 'No description provided.',
    teamOnDuty: input.teamOnDuty as any,
    status: initialStatus,
    resolutionStatus: 'open',
    requiresExternalAgency: false, // Default to false, resolved in UI rules
    recommendedAgencies: [],
    assignedAgencies: input.assignedAgency ? [input.assignedAgency as any] : [],
    assignedResourceIds: input.assignedResponderId ? [input.assignedResponderId] : [],
    incidentDate: new Date().toISOString().split('T')[0],
    incidentTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // 3. Update the civilian report: point to new master incident, inherit responder and agency
  const reportUpdatePayload: any = {
    incidentId: incidentDocRef.id,
    status: isAssigned ? 'active' : 'linked', // active if responder is dispatched, linked otherwise
    assignedResponderId: input.assignedResponderId || null,
    dispatcherId: input.assignedResponderId || null,
    responder: input.responderName || null,
    assignedAgency: input.assignedAgency || null,
    updatedAt: timestamp,
  };

  const batch = writeBatch(db);

  // Write new incident
  batch.set(incidentDocRef, incidentPayload);

  // Update original civilian report
  batch.update(reportRef, reportUpdatePayload);

  // Propagate to secondary grouped reports if any
  // Note: Secondary reports have primaryReportId === reportId
  const q = query(
    collection(db, 'emergencies'),
    where('primaryReportId', '==', reportId)
  );
  const secondariesSnap = await getDocs(q);
  secondariesSnap.forEach((secDoc) => {
    batch.update(secDoc.ref, {
      incidentId: incidentDocRef.id,
      status: isAssigned ? 'active' : 'linked',
      assignedResponderId: input.assignedResponderId || null,
      dispatcherId: input.assignedResponderId || null,
      responder: input.responderName || null,
      assignedAgency: input.assignedAgency || null,
      updatedAt: timestamp,
    });
  });

  await batch.commit();

  return incidentPayload;
}
// Append this to incidents.ts

export function subscribeToResponderAssignedIncidents(
  responderId: string,
  callback: (incidents: IncidentRecord[]) => void,
  options?: {
    statusFilter?: 'all' | 'pending' | 'active' | 'resolved';
    limitCount?: number;
  }
): () => void {
  try {
    const db = getFirebaseFirestore();
    const constraints: any[] = [
      where('assignedResourceIds', 'array-contains', responderId)
    ];
    
    if (options?.statusFilter && options.statusFilter !== 'all') {
      if (options.statusFilter === 'pending' || options.statusFilter === 'active') {
        // Approximate mapping: active means dispatched/enroute/on_scene
        constraints.push(where('status', 'in', ['dispatched', 'enroute', 'on_scene', 'awaiting_resources']));
      } else if (options.statusFilter === 'resolved') {
        constraints.push(where('status', 'in', ['resolved', 'unresolved']));
      }
    }
    
    const fetchLimit = options?.limitCount || 100;
    constraints.push(limit(fetchLimit));
    
    const q = query(collection(db, 'incidents'), ...constraints);
    
    return onSnapshot(q, (snapshot) => {
      const incidents = snapshot.docs.map(doc => doc.data() as IncidentRecord);
      callback(incidents);
    }, (error) => {
      console.error('Error in incident subscription:', error);
      callback([]);
    });
  } catch (error) {
    console.error('Error setting up incident subscription:', error);
    callback([]);
    return () => {};
  }
}

async function propagateIncidentUpdatesToReports(incidentId: string, updates: any) {
  try {
    const db = getFirebaseFirestore();
    const q = query(collection(db, 'emergencies'), where('incidentId', '==', incidentId));
    const snap = await getDocs(q);
    const updatePromises: Promise<any>[] = [];
    
    const reportUpdates: any = { updatedAt: Timestamp.now() };
    if (updates.status) {
      if (updates.status === 'enroute') reportUpdates.status = 'enroute';
      else if (updates.status === 'on_scene') reportUpdates.status = 'on_scene';
      else if (updates.status === 'resolved') reportUpdates.status = 'resolved';
    }
    if (updates.acceptedAt) reportUpdates.acceptedAt = updates.acceptedAt;
    if (updates.touchdownAt) reportUpdates.touchdownAt = updates.touchdownAt;
    if (updates.responseTimeSeconds) reportUpdates.responseTimeSeconds = updates.responseTimeSeconds;
    if (updates.postIncidentReport) reportUpdates.postIncidentReport = updates.postIncidentReport;
    
    snap.forEach((docSnap) => {
      updatePromises.push(updateDoc(docSnap.ref, reportUpdates));
    });
    await Promise.all(updatePromises);
  } catch (error) {
    console.error(`Error propagating incident updates to reports:`, error);
  }
}

async function updateResourcesForIncidentStatus(
  incidentId: string,
  status: ResourceStatus,
  options?: { clearAssignment?: boolean }
) {
  try {
    const db = getFirebaseFirestore();
    const q = query(collection(db, 'resources'), where('assignedIncidentId', '==', incidentId));
    const snap = await getDocs(q);
    const timestamp = Timestamp.now();
    const updates: Record<string, unknown> = {
      status,
      updatedAt: timestamp,
    };

    if (options?.clearAssignment) {
      updates.assignedIncidentId = null;
    }

    await Promise.all(snap.docs.map((resourceDoc) => updateDoc(resourceDoc.ref, updates)));
  } catch (error) {
    console.error('Error updating resources for incident status:', error);
  }
}

export async function acceptIncident(incidentId: string): Promise<IncidentRecord> {
  const currentUser = ensureAuthenticated();
  const db = getFirebaseFirestore();
  const incidentRef = doc(db, 'incidents', incidentId);
  const snap = await getDoc(incidentRef);
  if (!snap.exists()) throw new Error('Incident not found');
  
  const currentData = snap.data() as IncidentRecord;
  if (!currentData.assignedResourceIds.includes(currentUser.uid)) {
    throw new Error('Only an assigned responder can accept this incident');
  }
  
  const acceptedAt = Timestamp.now();
  const updateData = { status: 'enroute' as IncidentStatus, acceptedAt, updatedAt: Timestamp.now() };
  await updateDoc(incidentRef, updateData);
  await propagateIncidentUpdatesToReports(incidentId, updateData);
  await updateResourcesForIncidentStatus(incidentId, 'en_route');
  
  const updatedSnap = await getDoc(incidentRef);
  return updatedSnap.data() as IncidentRecord;
}

export async function markIncidentTouchdown(
  incidentId: string,
  options: { source: 'gps' | 'manual'; distanceMeters?: number | null; }
): Promise<IncidentRecord> {
  const currentUser = ensureAuthenticated();
  const db = getFirebaseFirestore();
  const incidentRef = doc(db, 'incidents', incidentId);
  const snap = await getDoc(incidentRef);
  if (!snap.exists()) throw new Error('Incident not found');
  
  const currentData = snap.data() as IncidentRecord;
  if (!currentData.assignedResourceIds.includes(currentUser.uid)) {
    throw new Error('Only an assigned responder can mark touchdown');
  }
  
  const touchdownAt = currentData.touchdownAt || Timestamp.now();
  let responseTimeSeconds: number | null = null;
  if (currentData.acceptedAt) {
    const acceptedMs = currentData.acceptedAt instanceof Timestamp ? currentData.acceptedAt.toDate().getTime() : new Date(currentData.acceptedAt).getTime();
    const touchdownMs = touchdownAt instanceof Timestamp ? touchdownAt.toDate().getTime() : new Date(touchdownAt).getTime();
    const diff = Math.round((touchdownMs - acceptedMs) / 1000);
    if (diff >= 0) responseTimeSeconds = diff;
  }
  
  const updateData: any = {
    touchdownAt,
    touchdownByDispatcherId: currentUser.uid,
    touchdownByName: currentUser.displayName || currentUser.email || currentUser.uid,
    touchdownSource: options.source,
    touchdownDistanceMeters: typeof options.distanceMeters === 'number' ? options.distanceMeters : null,
    responseTimeSeconds,
    updatedAt: Timestamp.now()
  };
  
  if (currentData.status !== 'on_scene') {
    updateData.status = 'on_scene' as IncidentStatus;
  }
  
  await updateDoc(incidentRef, updateData);
  await propagateIncidentUpdatesToReports(incidentId, updateData);
  await updateResourcesForIncidentStatus(incidentId, 'on_scene');
  
  const updatedSnap = await getDoc(incidentRef);
  return updatedSnap.data() as IncidentRecord;
}

export async function submitPostIncidentReportForIncident(
  incidentId: string,
  postReport: {
    reasonForIncident?: string | null;
    notes?: string | null;
    peopleInvolved?: number | null;
    peopleStatus?: string | null;
    hospital?: string | null;
  }
): Promise<IncidentRecord> {
  const currentUser = ensureAuthenticated();
  const db = getFirebaseFirestore();
  const incidentRef = doc(db, 'incidents', incidentId);
  const snap = await getDoc(incidentRef);
  if (!snap.exists()) throw new Error('Incident not found');
  
  const currentData = snap.data() as IncidentRecord;
  if (!currentData.assignedResourceIds.includes(currentUser.uid)) {
    throw new Error('Only an assigned responder can submit a post report');
  }
  
  const updateData = {
    postIncidentReport: {
      reasonForIncident: postReport.reasonForIncident?.trim() || null,
      notes: postReport.notes?.trim() || null,
      peopleInvolved: typeof postReport.peopleInvolved === 'number' ? postReport.peopleInvolved : null,
      peopleStatus: postReport.peopleStatus?.trim() || null,
      hospital: postReport.hospital?.trim() || null,
      submittedAt: Timestamp.now(),
      submittedByDispatcherId: currentUser.uid,
      submittedByName: currentUser.displayName || currentUser.email || currentUser.uid,
    },
    updatedAt: Timestamp.now(),
  };
  
  await updateDoc(incidentRef, updateData);
  await propagateIncidentUpdatesToReports(incidentId, updateData);
  
  const updatedSnap = await getDoc(incidentRef);
  return updatedSnap.data() as IncidentRecord;
}

export async function updateIncidentCaseStatus(
  incidentId: string,
  newStatus: 'enroute' | 'on_scene' | 'done' | 'resolved'
): Promise<IncidentRecord> {
  const currentUser = ensureAuthenticated();
  const db = getFirebaseFirestore();
  const incidentRef = doc(db, 'incidents', incidentId);
  const snap = await getDoc(incidentRef);
  if (!snap.exists()) throw new Error('Incident not found');
  
  const currentData = snap.data() as IncidentRecord;
  if (!currentData.assignedResourceIds.includes(currentUser.uid)) {
    throw new Error('Only an assigned responder can update this case');
  }
  
  const finalStatus = (newStatus === 'done' ? 'resolved' : newStatus) as IncidentStatus;
  const updateData: any = {
    status: finalStatus,
    updatedAt: Timestamp.now(),
  };
  
  if (finalStatus === 'resolved') {
    updateData.resolutionStatus = 'resolved';
    updateData.resolvedAt = Timestamp.now();
  }
  
  await updateDoc(incidentRef, updateData);
  await propagateIncidentUpdatesToReports(incidentId, updateData);
  await updateResourcesForIncidentStatus(
    incidentId,
    finalStatus === 'enroute' ? 'en_route' : finalStatus === 'on_scene' ? 'on_scene' : 'available',
    { clearAssignment: finalStatus === 'resolved' }
  );
  
  const updatedSnap = await getDoc(incidentRef);
  return updatedSnap.data() as IncidentRecord;
}
// Append this to incidents.ts
export async function declineIncident(
  incidentId: string,
  reason: string
): Promise<IncidentRecord> {
  const currentUser = ensureAuthenticated();
  const db = getFirebaseFirestore();
  const incidentRef = doc(db, 'incidents', incidentId);
  const snap = await getDoc(incidentRef);
  if (!snap.exists()) throw new Error('Incident not found');
  
  const currentData = snap.data() as IncidentRecord;
  if (!currentData.assignedResourceIds.includes(currentUser.uid)) {
    throw new Error('Only an assigned responder can decline this incident');
  }
  
  // Remove them from assignedResourceIds and change status to awaiting_resources
  const newAssigned = currentData.assignedResourceIds.filter(id => id !== currentUser.uid);
  const updateData: any = {
    assignedResourceIds: newAssigned,
    status: newAssigned.length > 0 ? currentData.status : 'awaiting_resources',
    updatedAt: Timestamp.now(),
  };
  
  await updateDoc(incidentRef, updateData);
  await propagateIncidentUpdatesToReports(incidentId, { status: updateData.status });
  
  const updatedSnap = await getDoc(incidentRef);
  return updatedSnap.data() as IncidentRecord;
}
