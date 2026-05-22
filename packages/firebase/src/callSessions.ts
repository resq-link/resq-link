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

export type CallRole = 'civilian' | 'responder';
export type CallSessionStatus =
  | 'ringing'
  | 'accepted'
  | 'connected'
  | 'ended'
  | 'missed'
  | 'failed';

export interface IncidentCallSession {
  id?: string;
  incidentId: string;
  channelName: string;
  callerUserId: string;
  callerRole: CallRole;
  responderUserId?: string | null;
  assignedResponderId?: string | null;
  status: CallSessionStatus;
  createdAt?: Date | Timestamp;
  acceptedAt?: Date | Timestamp | null;
  connectedAt?: Date | Timestamp | null;
  endedAt?: Date | Timestamp | null;
  endedBy?: string | null;
  failReason?: string | null;
  updatedAt?: Date | Timestamp;
}

export interface StartIncidentCallSessionInput {
  incidentId: string;
  responderUserId?: string | null;
  assignedResponderId?: string | null;
}

const ACTIVE_CALL_STATUSES: CallSessionStatus[] = ['ringing', 'accepted', 'connected'];

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

const toDateOrNull = (value: unknown) => {
  if (!value) return null;
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate();
  }
  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const buildIncidentCallChannelName = (incidentId: string) =>
  `incident_${normalizeRequiredId(incidentId, 'Incident ID')}`;

export const toIncidentCallSession = (snapshot: DocumentData): IncidentCallSession => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    incidentId: data.incidentId || '',
    channelName: data.channelName || '',
    callerUserId: data.callerUserId || '',
    callerRole: data.callerRole === 'responder' ? 'responder' : 'civilian',
    responderUserId: data.responderUserId || null,
    assignedResponderId: data.assignedResponderId || null,
    status: ACTIVE_CALL_STATUSES.includes(data.status) ||
      data.status === 'ended' ||
      data.status === 'missed' ||
      data.status === 'failed'
      ? data.status
      : 'failed',
    createdAt: toDateOrNull(data.createdAt),
    acceptedAt: toDateOrNull(data.acceptedAt),
    connectedAt: toDateOrNull(data.connectedAt),
    endedAt: toDateOrNull(data.endedAt),
    endedBy: data.endedBy || null,
    failReason: data.failReason || null,
    updatedAt: toDateOrNull(data.updatedAt),
  };
};

export async function startIncidentCallSession(
  input: StartIncidentCallSessionInput
): Promise<IncidentCallSession> {
  const currentUser = ensureAuthenticated();
  const incidentId = normalizeRequiredId(input.incidentId, 'Incident ID');
  const channelName = buildIncidentCallChannelName(incidentId);
  const db = getFirebaseFirestore();
  const timestamp = Timestamp.now();

  const existing = await getDocs(
    query(
      collection(db, 'callSessions'),
      where('incidentId', '==', incidentId),
      where('callerUserId', '==', currentUser.uid),
      where('status', 'in', ACTIVE_CALL_STATUSES),
      limit(1)
    )
  );

  const payload = {
    incidentId,
    channelName,
    callerUserId: currentUser.uid,
    callerRole: 'civilian' as CallRole,
    responderUserId: input.responderUserId || input.assignedResponderId || null,
    assignedResponderId: input.assignedResponderId || input.responderUserId || null,
    status: 'ringing' as CallSessionStatus,
    acceptedAt: null,
    connectedAt: null,
    endedAt: null,
    endedBy: null,
    failReason: null,
    updatedAt: timestamp,
  };

  if (!existing.empty) {
    const existingDoc = existing.docs[0];
    await updateDoc(existingDoc.ref, payload);
    return {
      ...toIncidentCallSession(existingDoc),
      ...payload,
      id: existingDoc.id,
      createdAt: toDateOrNull(existingDoc.data().createdAt),
      updatedAt: timestamp,
    };
  }

  const ref = await addDoc(collection(db, 'callSessions'), {
    ...payload,
    createdAt: timestamp,
    acceptedAt: null,
    connectedAt: null,
  });

  return {
    id: ref.id,
    ...payload,
    createdAt: timestamp,
    acceptedAt: null,
    connectedAt: null,
  };
}

export async function acceptIncidentCallSession(sessionId: string): Promise<void> {
  const currentUser = ensureAuthenticated();
  await updateDoc(doc(getFirebaseFirestore(), 'callSessions', normalizeRequiredId(sessionId, 'Call session ID')), {
    responderUserId: currentUser.uid,
    assignedResponderId: currentUser.uid,
    status: 'accepted',
    acceptedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function declineIncidentCallSession(sessionId: string): Promise<void> {
  const currentUser = ensureAuthenticated();
  await updateDoc(doc(getFirebaseFirestore(), 'callSessions', normalizeRequiredId(sessionId, 'Call session ID')), {
    status: 'missed',
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

export function subscribeToIncidentCallSessions(
  incidentId: string,
  callback: (sessions: IncidentCallSession[]) => void
): () => void {
  const constraints: QueryConstraint[] = [
    where('incidentId', '==', normalizeRequiredId(incidentId, 'Incident ID')),
    limit(20),
  ];

  return onSnapshot(
    query(collection(getFirebaseFirestore(), 'callSessions'), ...constraints),
    (snapshot: QuerySnapshot) => callback(snapshot.docs.map(toIncidentCallSession)),
    (error) => {
      console.error('Error subscribing to incident call sessions:', error);
      callback([]);
    }
  );
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

export async function getIncidentCallSession(sessionId: string): Promise<IncidentCallSession | null> {
  const snapshot = await getDoc(
    doc(getFirebaseFirestore(), 'callSessions', normalizeRequiredId(sessionId, 'Call session ID'))
  );
  return snapshot.exists() ? toIncidentCallSession(snapshot) : null;
}

export function subscribeToActiveIncidentCallSessions(
  callback: (sessions: IncidentCallSession[]) => void
): () => void {
  // Intended for command-center dispatch surfaces. Firestore rules should restrict
  // this broader listener to command center users only.
  return onSnapshot(
    query(
      collection(getFirebaseFirestore(), 'callSessions'),
      where('status', 'in', ACTIVE_CALL_STATUSES),
      limit(50)
    ),
    (snapshot: QuerySnapshot) => callback(snapshot.docs.map(toIncidentCallSession)),
    (error) => {
      console.error('Error subscribing to active call sessions:', error);
      callback([]);
    }
  );
}

export function subscribeToResponderIncomingCallSessions(
  responderUserId: string,
  callback: (sessions: IncidentCallSession[]) => void
): () => void {
  const normalizedResponderId = normalizeRequiredId(responderUserId, 'Responder ID');

  // Firestore rules should restrict this collection so civilians can only create/read their
  // own incident calls and responders can only read/update sessions assigned to their uid/team.
  return onSnapshot(
    query(
      collection(getFirebaseFirestore(), 'callSessions'),
      where('assignedResponderId', '==', normalizedResponderId),
      where('status', 'in', ['ringing', 'accepted', 'connected']),
      limit(20)
    ),
    (snapshot: QuerySnapshot) => callback(snapshot.docs.map(toIncidentCallSession)),
    (error) => {
      console.error('Error subscribing to responder call sessions:', error);
      callback([]);
    }
  );
}
