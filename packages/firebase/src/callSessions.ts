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
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './config';

export type CallRole = 'civilian' | 'dispatcher' | 'responder' | 'command_center';
export type CallType = 'direct_emergency' | 'incident_call';
export type CallSessionStatus =
  | 'queued'
  | 'ringing'
  | 'accepted'
  | 'connected'
  | 'ended'
  | 'missed'
  | 'declined'
  | 'failed';

export interface IncidentCallSession {
  id?: string;
  callType: CallType;
  incidentId?: string | null;
  incidentReferenceNumber?: string | null;
  incidentType?: string | null;
  incidentLocationText?: string | null;
  channelName: string;
  roomName: string;
  callerUserId: string;
  callerRole: CallRole;
  callerName?: string | null;
  callerPhone?: string | null;
  targetRole?: CallRole | null;
  targetUserId?: string | null;
  targetName?: string | null;
  responderUserId?: string | null;
  assignedResponderId?: string | null;
  status: CallSessionStatus;
  acceptedByUserId?: string | null;
  acceptedByName?: string | null;
  acceptedAt?: Date | Timestamp | null;
  connectedAt?: Date | Timestamp | null;
  endedAt?: Date | Timestamp | null;
  endedBy?: string | null;
  failReason?: string | null;
  createdAt?: Date | Timestamp | null;
  updatedAt?: Date | Timestamp | null;
}

export interface StartIncidentCallSessionInput {
  incidentId: string;
  callerUserId?: string;
  callerRole?: CallRole;
  callerName?: string;
  callerPhone?: string;
  targetUserId?: string | null;
  targetRole?: CallRole | null;
  targetName?: string | null;
  incidentReferenceNumber?: string | null;
  incidentType?: string | null;
  incidentLocationText?: string | null;
  responderUserId?: string | null;
  assignedResponderId?: string | null;
}

export interface StartDirectEmergencyCallInput {
  callerUserId: string;
  callerName?: string;
  callerPhone?: string;
  locationText?: string | null;
}

const ACTIVE_CALL_STATUSES: CallSessionStatus[] = ['queued', 'ringing', 'accepted', 'connected'];

const ensureAuthenticated = () => {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to manage call sessions');
  }
  return currentUser;
};

const normalizeRequiredId = (value: string, label: string) => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  return normalized;
};

const toDateOrNull = (value: unknown): Date | null => {
  if (!value) return null;
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate();
  }
  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const buildIncidentCallChannelName = (incidentId: string) =>
  `incident_${normalizeRequiredId(incidentId, 'Incident ID')}`;

export const buildDirectEmergencyRoomName = (callId: string) =>
  `emergency_direct_${normalizeRequiredId(callId, 'Call ID')}`;

export const toIncidentCallSession = (snapshot: DocumentData): IncidentCallSession => {
  const data = snapshot.data();
  const rawStatus = data.status as CallSessionStatus;
  const status: CallSessionStatus =
    ACTIVE_CALL_STATUSES.includes(rawStatus) ||
    rawStatus === 'ended' ||
    rawStatus === 'missed' ||
    rawStatus === 'declined' ||
    rawStatus === 'failed'
      ? rawStatus
      : 'failed';

  const channel =
    data.roomName ||
    data.channelName ||
    (data.incidentId ? buildIncidentCallChannelName(data.incidentId) : `call_${snapshot.id}`);

  return {
    id: snapshot.id,
    callType: data.callType === 'direct_emergency' ? 'direct_emergency' : 'incident_call',
    incidentId: data.incidentId || null,
    incidentReferenceNumber: data.incidentReferenceNumber || null,
    incidentType: data.incidentType || null,
    incidentLocationText: data.incidentLocationText || null,
    channelName: channel,
    roomName: channel,
    callerUserId: data.callerUserId || '',
    callerRole: data.callerRole || 'civilian',
    callerName: data.callerName || null,
    callerPhone: data.callerPhone || null,
    targetRole: data.targetRole || null,
    targetUserId: data.targetUserId || null,
    targetName: data.targetName || null,
    responderUserId: data.responderUserId || null,
    assignedResponderId: data.assignedResponderId || null,
    status,
    acceptedByUserId: data.acceptedByUserId || null,
    acceptedByName: data.acceptedByName || null,
    createdAt: toDateOrNull(data.createdAt),
    acceptedAt: toDateOrNull(data.acceptedAt),
    connectedAt: toDateOrNull(data.connectedAt),
    endedAt: toDateOrNull(data.endedAt),
    endedBy: data.endedBy || null,
    failReason: data.failReason || null,
    updatedAt: toDateOrNull(data.updatedAt),
  };
};

/**
 * Start a 1-Click Direct Emergency Call to Dispatch from the Civilian App home screen
 */
export async function startDirectEmergencyCall(
  input: StartDirectEmergencyCallInput
): Promise<IncidentCallSession> {
  const currentUser = ensureAuthenticated();
  const callerUserId = input.callerUserId || currentUser.uid;
  const db = getFirebaseFirestore();
  const timestamp = Timestamp.now();

  const roomName = `direct_emergency_${callerUserId.slice(0, 8)}_${Date.now()}`;

  const payload = {
    callType: 'direct_emergency' as CallType,
    incidentId: null,
    incidentReferenceNumber: '1-CLICK SOS',
    incidentType: 'direct_emergency',
    incidentLocationText: input.locationText || null,
    channelName: roomName,
    roomName,
    callerUserId,
    callerRole: 'civilian' as CallRole,
    callerName: input.callerName || currentUser.displayName || 'Citizen in Need',
    callerPhone: input.callerPhone || currentUser.phoneNumber || null,
    targetRole: 'dispatcher' as CallRole,
    targetUserId: null,
    targetName: 'Command Center Dispatch',
    responderUserId: null,
    assignedResponderId: null,
    status: 'ringing' as CallSessionStatus,
    acceptedByUserId: null,
    acceptedByName: null,
    acceptedAt: null,
    connectedAt: null,
    endedAt: null,
    endedBy: null,
    failReason: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const ref = await addDoc(collection(db, 'callSessions'), payload);

  return {
    ...payload,
    id: ref.id,
    createdAt: timestamp.toDate(),
    updatedAt: timestamp.toDate(),
  };
}

/**
 * Start an Incident Voice Call (Civilian <-> Dispatcher, Dispatcher <-> Civilian, Dispatcher <-> Responder, Responder <-> Civilian)
 */
export async function startIncidentCallSession(
  input: StartIncidentCallSessionInput
): Promise<IncidentCallSession> {
  const currentUser = ensureAuthenticated();
  const incidentId = normalizeRequiredId(input.incidentId, 'Incident ID');
  const channelName = buildIncidentCallChannelName(incidentId);
  const roomName = channelName;
  const db = getFirebaseFirestore();
  const timestamp = Timestamp.now();

  const callerUserId = input.callerUserId || currentUser.uid;
  const callerRole = input.callerRole || 'civilian';

  const payload = {
    callType: 'incident_call' as CallType,
    incidentId,
    incidentReferenceNumber: input.incidentReferenceNumber || null,
    incidentType: input.incidentType || null,
    incidentLocationText: input.incidentLocationText || null,
    channelName,
    roomName,
    callerUserId,
    callerRole,
    callerName: input.callerName || currentUser.displayName || null,
    callerPhone: input.callerPhone || currentUser.phoneNumber || null,
    targetRole: input.targetRole || (callerRole === 'civilian' ? 'dispatcher' : 'civilian'),
    targetUserId: input.targetUserId || null,
    targetName: input.targetName || null,
    responderUserId: input.responderUserId || input.assignedResponderId || null,
    assignedResponderId: input.assignedResponderId || input.responderUserId || null,
    status: 'ringing' as CallSessionStatus,
    acceptedByUserId: null,
    acceptedByName: null,
    acceptedAt: null,
    connectedAt: null,
    endedAt: null,
    endedBy: null,
    failReason: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const ref = await addDoc(collection(db, 'callSessions'), payload);

  return {
    ...payload,
    id: ref.id,
    createdAt: timestamp.toDate(),
    updatedAt: timestamp.toDate(),
  };
}

export async function acceptIncidentCallSession(
  sessionId: string,
  acceptor?: { uid?: string; name?: string }
): Promise<void> {
  const currentUser = ensureAuthenticated();
  const uid = acceptor?.uid || currentUser.uid;
  const name = acceptor?.name || currentUser.displayName || 'Dispatcher';

  await updateDoc(doc(getFirebaseFirestore(), 'callSessions', normalizeRequiredId(sessionId, 'Call session ID')), {
    acceptedByUserId: uid,
    acceptedByName: name,
    status: 'accepted',
    acceptedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function declineIncidentCallSession(sessionId: string, reason?: string): Promise<void> {
  const currentUser = ensureAuthenticated();
  await updateDoc(doc(getFirebaseFirestore(), 'callSessions', normalizeRequiredId(sessionId, 'Call session ID')), {
    status: 'declined',
    failReason: reason || 'Declined by recipient',
    endedAt: Timestamp.now(),
    endedBy: currentUser.uid,
    updatedAt: Timestamp.now(),
  });
}

export async function markIncidentCallConnected(sessionId: string): Promise<void> {
  ensureAuthenticated();
  await updateDoc(doc(getFirebaseFirestore(), 'callSessions', normalizeRequiredId(sessionId, 'Call session ID')), {
    status: 'connected',
    connectedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function endIncidentCallSession(sessionId: string): Promise<void> {
  const currentUser = ensureAuthenticated();
  await updateDoc(doc(getFirebaseFirestore(), 'callSessions', normalizeRequiredId(sessionId, 'Call session ID')), {
    status: 'ended',
    endedAt: Timestamp.now(),
    endedBy: currentUser.uid,
    updatedAt: Timestamp.now(),
  });
}

export async function failIncidentCallSession(sessionId: string, reason?: string): Promise<void> {
  const currentUser = ensureAuthenticated();
  await updateDoc(doc(getFirebaseFirestore(), 'callSessions', normalizeRequiredId(sessionId, 'Call session ID')), {
    status: 'failed',
    failReason: reason || null,
    endedAt: Timestamp.now(),
    endedBy: currentUser.uid,
    updatedAt: Timestamp.now(),
  });
}

export function subscribeToIncidentCallSession(
  sessionId: string,
  callback: (session: IncidentCallSession | null) => void
): () => void {
  return onSnapshot(
    doc(getFirebaseFirestore(), 'callSessions', normalizeRequiredId(sessionId, 'Call session ID')),
    (snapshot) => callback(snapshot.exists() ? toIncidentCallSession(snapshot) : null),
    (error) => {
      console.error('Error subscribing to call session:', error);
      callback(null);
    }
  );
}

/**
 * Real-time listener for Command Center / Dispatcher incoming calls (Ringing)
 */
export function subscribeToIncomingCallsForDispatcher(
  callback: (sessions: IncidentCallSession[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(getFirebaseFirestore(), 'callSessions'),
      where('status', 'in', ['ringing', 'queued']),
      limit(20)
    ),
    (snapshot: QuerySnapshot) => {
      const list = snapshot.docs
        .map(toIncidentCallSession)
        .filter((s) => s.targetRole === 'dispatcher' || s.callType === 'direct_emergency' || !s.targetUserId);
      callback(list);
    },
    (error) => {
      console.error('Error subscribing to incoming dispatcher calls:', error);
      callback([]);
    }
  );
}

/**
 * Real-time listener for Call Queue (active + ringing + queued calls)
 */
export function subscribeToDispatcherCallQueue(
  callback: (sessions: IncidentCallSession[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(getFirebaseFirestore(), 'callSessions'),
      where('status', 'in', ['queued', 'ringing', 'accepted', 'connected']),
      limit(50)
    ),
    (snapshot: QuerySnapshot) => {
      const list = snapshot.docs
        .map(toIncidentCallSession)
        .sort((a, b) => {
          const aMs = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const bMs = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return bMs - aMs;
        });
      callback(list);
    },
    (error) => {
      console.error('Error subscribing to dispatcher call queue:', error);
      callback([]);
    }
  );
}

/**
 * Real-time listener for active call ringing for a specific user (Civilian or Responder)
 */
export function subscribeToUserIncomingCalls(
  userId: string,
  callback: (sessions: IncidentCallSession[]) => void
): () => void {
  const normalizedUid = normalizeRequiredId(userId, 'User ID');
  return onSnapshot(
    query(
      collection(getFirebaseFirestore(), 'callSessions'),
      where('targetUserId', '==', normalizedUid),
      where('status', 'in', ['ringing', 'accepted', 'connected']),
      limit(10)
    ),
    (snapshot: QuerySnapshot) => callback(snapshot.docs.map(toIncidentCallSession)),
    (error) => {
      console.error('Error subscribing to user incoming calls:', error);
      callback([]);
    }
  );
}

