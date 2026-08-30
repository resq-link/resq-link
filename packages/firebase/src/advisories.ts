import {
  collection,
  addDoc,
  onSnapshot,
  Timestamp,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  type Unsubscribe,
  type QuerySnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseFirestore, getFirebaseAuth } from './config';

export type AdvisorySeverity = 'critical' | 'severe' | 'moderate' | 'info';

export type AdvisoryCategory =
  | 'weather'
  | 'flood'
  | 'fire_hazard'
  | 'evacuation'
  | 'traffic_road'
  | 'health'
  | 'community'
  | 'general';

export type AdvisoryStatus = 'active' | 'draft' | 'archived' | 'expired';

export type AdvisoryTargetScope = 'all' | 'barangay';

export interface AdvisoryPushNotificationStats {
  sent: boolean;
  sentAt?: Timestamp | string | null;
  totalRecipients: number;
  successCount: number;
  failureCount: number;
}

export interface AdvisoryRecord {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: AdvisoryCategory;
  severity: AdvisorySeverity;
  status: AdvisoryStatus;
  targetScope: AdvisoryTargetScope;
  targetBarangays?: string[];
  bannerImageUrl?: string | null;
  actionUrl?: string | null;
  effectiveAt: Timestamp | string;
  expiresAt: Timestamp | string | null;
  createdBy: {
    uid: string;
    name: string;
    email: string;
    agency?: string | null;
  };
  pushNotification: AdvisoryPushNotificationStats;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface CreateAdvisoryInput {
  title: string;
  summary: string;
  content: string;
  category: AdvisoryCategory;
  severity: AdvisorySeverity;
  status?: AdvisoryStatus;
  targetScope?: AdvisoryTargetScope;
  targetBarangays?: string[];
  bannerImageUrl?: string | null;
  actionUrl?: string | null;
  effectiveAt?: Timestamp | Date;
  expiresAt?: Timestamp | Date | null;
  createdBy?: {
    uid: string;
    name: string;
    email: string;
    agency?: string | null;
  };
}

export interface UpdateAdvisoryInput {
  title?: string;
  summary?: string;
  content?: string;
  category?: AdvisoryCategory;
  severity?: AdvisorySeverity;
  status?: AdvisoryStatus;
  targetScope?: AdvisoryTargetScope;
  targetBarangays?: string[];
  bannerImageUrl?: string | null;
  actionUrl?: string | null;
  effectiveAt?: Timestamp | Date;
  expiresAt?: Timestamp | Date | null;
}

export const ADVISORY_CATEGORIES: Record<AdvisoryCategory, { label: string; icon: string }> = {
  weather: { label: 'Weather Alert', icon: 'CloudRain' },
  flood: { label: 'Flood Warning', icon: 'Waves' },
  fire_hazard: { label: 'Fire Hazard', icon: 'Flame' },
  evacuation: { label: 'Evacuation Notice', icon: 'AlertOctagon' },
  traffic_road: { label: 'Road & Traffic', icon: 'Car' },
  health: { label: 'Health Notice', icon: 'HeartPulse' },
  community: { label: 'Community Bulletin', icon: 'Users' },
  general: { label: 'General Announcement', icon: 'Megaphone' },
};

export const ADVISORY_SEVERITIES: Record<
  AdvisorySeverity,
  { label: string; badgeBg: string; badgeText: string; border: string; bgSoft: string; hex: string }
> = {
  critical: {
    label: 'Critical Alert',
    badgeBg: 'bg-red-500/20',
    badgeText: 'text-red-400',
    border: 'border-red-500/40',
    bgSoft: 'bg-red-950/40',
    hex: '#ef4444',
  },
  severe: {
    label: 'Severe Warning',
    badgeBg: 'bg-orange-500/20',
    badgeText: 'text-orange-400',
    border: 'border-orange-500/40',
    bgSoft: 'bg-orange-950/40',
    hex: '#f97316',
  },
  moderate: {
    label: 'Moderate Warning',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-400',
    border: 'border-amber-500/40',
    bgSoft: 'bg-amber-950/40',
    hex: '#f59e0b',
  },
  info: {
    label: 'Informational',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-400',
    border: 'border-cyan-500/40',
    bgSoft: 'bg-cyan-950/40',
    hex: '#06b6d4',
  },
};

const mapAdvisoryDoc = (docSnap: QueryDocumentSnapshot): AdvisoryRecord => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title || '',
    summary: data.summary || '',
    content: data.content || '',
    category: data.category || 'general',
    severity: data.severity || 'info',
    status: data.status || 'active',
    targetScope: data.targetScope || 'all',
    targetBarangays: Array.isArray(data.targetBarangays) ? data.targetBarangays : [],
    bannerImageUrl: data.bannerImageUrl || null,
    actionUrl: data.actionUrl || null,
    effectiveAt: data.effectiveAt || data.createdAt || Timestamp.now(),
    expiresAt: data.expiresAt || null,
    createdBy: data.createdBy || {
      uid: '',
      name: 'Command Center',
      email: '',
    },
    pushNotification: {
      sent: !!data.pushNotification?.sent,
      sentAt: data.pushNotification?.sentAt || null,
      totalRecipients: data.pushNotification?.totalRecipients || 0,
      successCount: data.pushNotification?.successCount || 0,
      failureCount: data.pushNotification?.failureCount || 0,
    },
    createdAt: data.createdAt || Timestamp.now(),
    updatedAt: data.updatedAt || Timestamp.now(),
  };
};

/**
 * Create a new public advisory record in Firestore.
 */
export async function createAdvisory(input: CreateAdvisoryInput): Promise<string> {
  const db = getFirebaseFirestore();
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;

  const now = Timestamp.now();
  const effectiveAt =
    input.effectiveAt instanceof Date
      ? Timestamp.fromDate(input.effectiveAt)
      : input.effectiveAt || now;
  const expiresAt =
    input.expiresAt instanceof Date
      ? Timestamp.fromDate(input.expiresAt)
      : input.expiresAt || null;

  const docData = {
    title: input.title.trim(),
    summary: input.summary.trim(),
    content: input.content.trim(),
    category: input.category || 'general',
    severity: input.severity || 'info',
    status: input.status || 'active',
    targetScope: input.targetScope || 'all',
    targetBarangays: input.targetBarangays || [],
    bannerImageUrl: input.bannerImageUrl || null,
    actionUrl: input.actionUrl || null,
    effectiveAt,
    expiresAt,
    createdBy: input.createdBy || {
      uid: currentUser?.uid || '',
      name: currentUser?.displayName || 'Command Center Staff',
      email: currentUser?.email || '',
    },
    pushNotification: {
      sent: false,
      sentAt: null,
      totalRecipients: 0,
      successCount: 0,
      failureCount: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, 'advisories'), docData);
  return docRef.id;
}

/**
 * Update an existing advisory.
 */
export async function updateAdvisory(
  advisoryId: string,
  input: UpdateAdvisoryInput
): Promise<void> {
  const db = getFirebaseFirestore();
  const ref = doc(db, 'advisories', advisoryId);

  const updates: Record<string, any> = {
    updatedAt: Timestamp.now(),
  };

  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.summary !== undefined) updates.summary = input.summary.trim();
  if (input.content !== undefined) updates.content = input.content.trim();
  if (input.category !== undefined) updates.category = input.category;
  if (input.severity !== undefined) updates.severity = input.severity;
  if (input.status !== undefined) updates.status = input.status;
  if (input.targetScope !== undefined) updates.targetScope = input.targetScope;
  if (input.targetBarangays !== undefined) updates.targetBarangays = input.targetBarangays;
  if (input.bannerImageUrl !== undefined) updates.bannerImageUrl = input.bannerImageUrl;
  if (input.actionUrl !== undefined) updates.actionUrl = input.actionUrl;
  if (input.effectiveAt !== undefined) {
    updates.effectiveAt =
      input.effectiveAt instanceof Date
        ? Timestamp.fromDate(input.effectiveAt)
        : input.effectiveAt;
  }
  if (input.expiresAt !== undefined) {
    updates.expiresAt =
      input.expiresAt instanceof Date
        ? Timestamp.fromDate(input.expiresAt)
        : input.expiresAt;
  }

  await updateDoc(ref, updates);
}

/**
 * Mark an advisory as archived.
 */
export async function archiveAdvisory(advisoryId: string): Promise<void> {
  await updateAdvisory(advisoryId, { status: 'archived' });
}

/**
 * Mark an advisory as expired.
 */
export async function expireAdvisory(advisoryId: string): Promise<void> {
  await updateAdvisory(advisoryId, { status: 'expired' });
}

/**
 * Delete an advisory permanently.
 */
export async function deleteAdvisory(advisoryId: string): Promise<void> {
  const db = getFirebaseFirestore();
  await deleteDoc(doc(db, 'advisories', advisoryId));
}

/**
 * Get a single advisory by ID.
 */
export async function getAdvisory(advisoryId: string): Promise<AdvisoryRecord | null> {
  const db = getFirebaseFirestore();
  const snap = await getDoc(doc(db, 'advisories', advisoryId));
  if (!snap.exists()) return null;
  return mapAdvisoryDoc(snap as QueryDocumentSnapshot);
}

/**
 * Fetch all active advisories.
 */
export async function getActiveAdvisories(): Promise<AdvisoryRecord[]> {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, 'advisories'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapAdvisoryDoc);
}

/**
 * Real-time subscription to all advisories (for Command Center).
 */
export function subscribeToAdvisories(
  callback: (advisories: AdvisoryRecord[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getFirebaseFirestore();
  const q = query(collection(db, 'advisories'), orderBy('createdAt', 'desc'), limit(100));

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const records = snapshot.docs.map(mapAdvisoryDoc);
      callback(records);
    },
    (err) => {
      console.error('[subscribeToAdvisories] Firestore listener error:', err);
      onError?.(err);
    }
  );
}

/**
 * Real-time subscription to active advisories (for Civilian Mobile App banner and list).
 * Filters client-side so no composite index (status + createdAt) is required at query time.
 */
export function subscribeToActiveAdvisories(
  callback: (advisories: AdvisoryRecord[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getFirebaseFirestore();
  const q = query(collection(db, 'advisories'), orderBy('createdAt', 'desc'), limit(100));

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const records = snapshot.docs
        .map(mapAdvisoryDoc)
        .filter((record) => record.status === 'active')
        .slice(0, 25);
      callback(records);
    },
    (err) => {
      console.error('[subscribeToActiveAdvisories] Firestore listener error:', err);
      onError?.(err);
    }
  );
}
