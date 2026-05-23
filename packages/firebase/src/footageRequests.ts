import {
  collection,
  addDoc,
  onSnapshot,
  Timestamp,
  doc,
  updateDoc,
  QuerySnapshot,
  QueryDocumentSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { getFirebaseFirestore, getFirebaseAuth } from './config';
import {
  firebaseWarnOnce,
  isFirestoreMissingIndexError,
} from './logger';

let userFootageCompositeIndexAvailable: boolean | null = null;

export const FOOTAGE_PURPOSE_KEYS = [
  'investigation',
  'vehicular_accident',
  'robbery',
  'carnapping',
  'hit_and_run',
  'lost_belonging',
  'missing_person',
  'suspicious_person',
  'road_rage',
  'theft',
  'buy_bust',
  'commotion',
  'act_of_lasciviousness',
  'other',
] as const;

export type FootageRequestPurpose = (typeof FOOTAGE_PURPOSE_KEYS)[number];

export const FOOTAGE_PURPOSE_LABELS: Record<FootageRequestPurpose, string> = {
  investigation: 'Investigation',
  vehicular_accident: 'Vehicular Accident',
  robbery: 'Robbery',
  carnapping: 'Carnapping',
  hit_and_run: 'Hit and Run',
  lost_belonging: 'Lost Belonging',
  missing_person: 'Missing Person',
  suspicious_person: 'Suspicious Person',
  road_rage: 'Road Rage',
  theft: 'Theft',
  buy_bust: 'Buy Bust',
  commotion: 'Commotion',
  act_of_lasciviousness: 'Act of Lasciviousness',
  other: 'Others',
};

export type FootageRequestStatus = 'pending' | 'footage_found' | 'footage_not_found';

export interface FootageRequest {
  id?: string;
  userId: string;
  purpose: FootageRequestPurpose;
  purposeOtherText: string | null;
  locationText: string;
  notes: string | null;
  incidentDate: string;
  status: FootageRequestStatus;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export type SubmitFootageRequestInput = {
  userId: string;
  purpose: FootageRequestPurpose;
  purposeOtherText?: string | null;
  locationText: string;
  notes?: string | null;
  incidentDate: string;
};

const convertDoc = (snap: QueryDocumentSnapshot): FootageRequest => {
  const data = snap.data();
  return {
    id: snap.id,
    userId: data.userId || '',
    purpose: (data.purpose as FootageRequestPurpose) || 'other',
    purposeOtherText: data.purposeOtherText ?? data.purpose_other_text ?? null,
    locationText: data.locationText || data.location_text || '',
    notes: data.notes ?? null,
    incidentDate: data.incidentDate || data.incident_date || '',
    status: (data.status as FootageRequestStatus) || 'pending',
    createdAt: data.createdAt?.toDate
      ? data.createdAt.toDate()
      : data.created_at?.toDate
        ? data.created_at.toDate()
        : undefined,
    updatedAt: data.updatedAt?.toDate
      ? data.updatedAt.toDate()
      : data.updated_at?.toDate
        ? data.updated_at.toDate()
        : undefined,
  };
};

const getTime = (d: Date | Timestamp | undefined): number => {
  if (!d) return 0;
  if (d instanceof Date) return d.getTime();
  if (typeof d === 'object' && d && 'toDate' in d) {
    return (d as Timestamp).toDate().getTime();
  }
  return 0;
};

/**
 * Submit a footage request (civilian, Firebase Auth required).
 */
export async function submitFootageRequest(
  input: SubmitFootageRequestInput
): Promise<FootageRequest> {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated with Firebase Auth to submit a footage request');
  }

  if (input.purpose === 'other') {
    const detail = (input.purposeOtherText || '').trim();
    if (!detail) {
      throw new Error('Please describe the purpose when selecting Others');
    }
  }

  const locationText = input.locationText.trim();
  if (!locationText) {
    throw new Error('Location of incident is required');
  }

  const incidentDate = input.incidentDate.trim();
  if (!incidentDate) {
    throw new Error('Date is required');
  }

  const col = collection(getFirebaseFirestore(), 'footageRequests');
  const now = Timestamp.now();
  const docData = {
    userId: currentUser.uid,
    purpose: input.purpose,
    purposeOtherText:
      input.purpose === 'other' ? (input.purposeOtherText || '').trim() : null,
    locationText,
    notes: input.notes != null ? String(input.notes).trim() || null : null,
    incidentDate,
    status: 'pending' as const,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await addDoc(col, docData);
  return {
    id: ref.id,
    userId: currentUser.uid,
    purpose: input.purpose,
    purposeOtherText: docData.purposeOtherText,
    locationText,
    notes: docData.notes,
    incidentDate,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Fetch footage requests submitted by the signed-in user (newest first).
 */
export async function getUserFootageRequests(
  userId: string,
  limitCount: number = 50
): Promise<FootageRequest[]> {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to fetch footage requests');
  }
  const targetUserId = userId || currentUser.uid;

  const col = collection(getFirebaseFirestore(), 'footageRequests');

  const fetchEqualityOnly = async () => {
    const q = query(col, where('userId', '==', targetUserId), limit(limitCount * 2));
    const snap = await getDocs(q);
    const list = snap.docs.map(convertDoc);
    list.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
    return list.slice(0, limitCount);
  };

  if (userFootageCompositeIndexAvailable === false) {
    return fetchEqualityOnly();
  }

  try {
    const q = query(
      col,
      where('userId', '==', targetUserId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    userFootageCompositeIndexAvailable = true;
    return snap.docs.map(convertDoc);
  } catch (indexError: unknown) {
    if (isFirestoreMissingIndexError(indexError)) {
      userFootageCompositeIndexAvailable = false;
      firebaseWarnOnce(
        'footageRequests-userId-createdAt-index',
        'Composite index missing for footageRequests (userId + createdAt). Using in-memory sort. Deploy packages/firebase/firestore.indexes.json.'
      );
      return fetchEqualityOnly();
    }
    throw indexError;
  }
}

/**
 * Real-time updates for the current user's footage requests (for civilian app history).
 * Uses equality-only query + in-memory sort to avoid composite index requirement.
 */
export function subscribeToUserFootageRequests(
  callback: (requests: FootageRequest[]) => void,
  options?: { userId?: string; limitCount?: number }
): () => void {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      callback([]);
      return () => {};
    }
    const targetUserId = options?.userId ?? currentUser.uid;
    const cap = options?.limitCount ?? 50;
    const col = collection(getFirebaseFirestore(), 'footageRequests');
    const q = query(col, where('userId', '==', targetUserId), limit(cap));

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        let list = snapshot.docs.map(convertDoc);
        list.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
        callback(list);
      },
      (error) => {
        console.error('Error in user footage requests subscription:', error);
        callback([]);
      }
    );
  } catch (error) {
    console.error('Error setting up user footage requests subscription:', error);
    return () => {};
  }
}

/**
 * Real-time subscription for command center / dispatchers (all requests, newest first).
 */
export function subscribeToFootageRequests(
  callback: (requests: FootageRequest[]) => void
): () => void {
  try {
    const col = collection(getFirebaseFirestore(), 'footageRequests');
    return onSnapshot(
      col,
      (snapshot: QuerySnapshot) => {
        let list = snapshot.docs.map(convertDoc);
        list.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
        callback(list);
      },
      (error) => {
        console.error('Error in footage requests subscription:', error);
        callback([]);
      }
    );
  } catch (error) {
    console.error('Error setting up footage requests subscription:', error);
    return () => {};
  }
}

export async function updateFootageRequestStatus(
  id: string,
  status: Extract<FootageRequestStatus, 'footage_found' | 'footage_not_found'>
): Promise<void> {
  const ref = doc(getFirebaseFirestore(), 'footageRequests', id);
  await updateDoc(ref, {
    status,
    updatedAt: Timestamp.now(),
  });
}
