import { ref, onValue, remove, set, onDisconnect } from 'firebase/database';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import {
  getFirebaseAuth,
  getFirebaseFirestore,
  getFirebaseRealtimeDatabase,
  isFirebaseRealtimeDatabaseConfigured,
} from './config';

/**
 * RTDB path — keep in sync with `packages/firebase/database.rules.json`.
 * Deploy rules so `presence/responders` has `.read` for authenticated clients (dashboard aggregate count).
 */
const RTDB_RESPONDER_PRESENCE_ROOT = 'presence/responders';

let presenceSessionCleanup: (() => void) | null = null;

/**
 * Matches dispatcher-web responder pool filtering: designation contains "responder".
 * Only these accounts are counted as "online responders" for the dashboard metric.
 */
export function isResponderDesignation(profile: DocumentData | undefined | null): boolean {
  const raw = typeof profile?.designation === 'string' ? profile.designation.trim().toLowerCase() : '';
  return raw.includes('responder');
}

async function loadDispatcherProfile(uid: string): Promise<DocumentData | null> {
  const snap = await getDoc(doc(getFirebaseFirestore(), 'dispatchers', uid));
  return snap.exists() ? snap.data() ?? null : null;
}

/**
 * Firebase Realtime Database presence: uses `.info/connected` + `onDisconnect(remove)`
 * so stale nodes disappear when the client loses connection (kill, crash, network drop).
 */
export async function beginResponderRealtimePresence(): Promise<void> {
  presenceSessionCleanup?.();
  presenceSessionCleanup = null;

  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return;

  const profile = await loadDispatcherProfile(user.uid);
  if (!profile || profile.active === false || !isResponderDesignation(profile)) return;

  if (!isFirebaseRealtimeDatabaseConfigured()) return;

  let db;
  try {
    db = getFirebaseRealtimeDatabase();
  } catch {
    return;
  }

  const presenceRef = ref(db, `${RTDB_RESPONDER_PRESENCE_ROOT}/${user.uid}`);
  const connectedRef = ref(db, '.info/connected');

  const unsubscribeConnected = onValue(connectedRef, connSnap => {
    if (connSnap.val() !== true) return;
    // Ensures presence row is removed server-side when the socket drops.
    void onDisconnect(presenceRef).remove();
    void set(presenceRef, true);
  });

  presenceSessionCleanup = () => {
    unsubscribeConnected();
    void remove(presenceRef);
  };
}

/** Drop local listeners and RTDB node (e.g. sign-out). */
export async function clearResponderRealtimePresence(): Promise<void> {
  presenceSessionCleanup?.();
  presenceSessionCleanup = null;

  const user = getFirebaseAuth().currentUser;
  if (!user || !isFirebaseRealtimeDatabaseConfigured()) return;

  try {
    const db = getFirebaseRealtimeDatabase();
    await remove(ref(db, `${RTDB_RESPONDER_PRESENCE_ROOT}/${user.uid}`));
  } catch {
    /* offline / permission edge cases */
  }
}

/**
 * Immediate offline when the app backgrounds (RTDB may stay connected briefly on mobile).
 */
export async function suspendResponderRealtimePresence(): Promise<void> {
  presenceSessionCleanup?.();
  presenceSessionCleanup = null;

  const user = getFirebaseAuth().currentUser;
  if (!user || !isFirebaseRealtimeDatabaseConfigured()) return;

  try {
    const db = getFirebaseRealtimeDatabase();
    await remove(ref(db, `${RTDB_RESPONDER_PRESENCE_ROOT}/${user.uid}`));
  } catch {
    /* ignore */
  }
}

export async function resumeResponderRealtimePresence(): Promise<void> {
  await beginResponderRealtimePresence();
}

function subscribeRtdbResponderCount(onCount: (count: number) => void): () => void {
  const db = getFirebaseRealtimeDatabase();
  const rootRef = ref(db, RTDB_RESPONDER_PRESENCE_ROOT);
  const unsub = onValue(
    rootRef,
    snapshot => {
      const val = snapshot.val() as Record<string, unknown> | null;
      onCount(val ? Object.keys(val).length : 0);
    },
    err => {
      console.error('❌ RTDB online responder count:', err);
      onCount(0);
    },
  );
  return unsub;
}

function subscribeFirestoreResponderCountFallback(onCount: (count: number) => void): () => void {
  const fs = getFirebaseFirestore();
  const q = query(collection(fs, 'dispatchers'), where('isOnline', '==', true));
  return onSnapshot(
    q,
    snapshot => {
      let n = 0;
      snapshot.forEach(docSnap => {
        if (isResponderDesignation(docSnap.data())) n += 1;
      });
      onCount(n);
    },
    err => {
      console.error('❌ Firestore online responder count fallback:', err);
      onCount(0);
    },
  );
}

/**
 * Live count of responders currently marked online.
 * Prefers Realtime Database presence; falls back to Firestore `isOnline` if RTDB URL is not configured.
 */
export function subscribeToOnlineResponderCount(onCount: (count: number) => void): () => void {
  if (isFirebaseRealtimeDatabaseConfigured()) {
    try {
      return subscribeRtdbResponderCount(onCount);
    } catch (e) {
      console.warn('⚠️ RTDB count unavailable, using Firestore fallback:', e);
    }
  }
  return subscribeFirestoreResponderCountFallback(onCount);
}
