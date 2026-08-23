import {
  Timestamp,
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './config';

/**
 * Expo push tokens for responder devices.
 *
 * Tokens live on the responder's `dispatchers/{uid}` document (responders are
 * dispatcher records whose designation contains "responder" — see
 * `responderPresence.isResponderDesignation`). A responder can be signed in on
 * more than one device, so tokens are an array and every entry carries the
 * platform, which the alert Cloud Function needs to shape the payload.
 */

export type PushPlatform = 'ios' | 'android' | 'web';

export type ResponderPushToken = {
  token: string;
  platform: PushPlatform;
  updatedAt: Timestamp | Date | null;
};

export type CivilianPushToken = {
  token: string;
  platform: PushPlatform;
  updatedAt: Timestamp | Date | null;
};

const ensureAuthenticated = () => {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to manage push tokens');
  }
  return currentUser;
};

const dispatcherRef = (uid: string) => doc(getFirebaseFirestore(), 'dispatchers', uid);
const userRef = (uid: string) => doc(getFirebaseFirestore(), 'users', uid);

const readTokens = async (uid: string): Promise<ResponderPushToken[]> => {
  const snap = await getDoc(dispatcherRef(uid));
  const raw = snap.exists() ? snap.data()?.pushTokens : null;
  return Array.isArray(raw) ? (raw as ResponderPushToken[]) : [];
};

const readUserTokens = async (uid: string): Promise<CivilianPushToken[]> => {
  const snap = await getDoc(userRef(uid));
  const raw = snap.exists() ? snap.data()?.pushTokens : null;
  return Array.isArray(raw) ? (raw as CivilianPushToken[]) : [];
};

/**
 * Register (or refresh) the current device's Expo push token for responders.
 *
 * Safe to call on every launch: an unchanged token is a no-op, and a token that
 * has moved to another account is removed from this one first so a device never
 * receives alerts for a responder who is no longer signed in on it.
 */
export async function saveResponderPushToken(
  token: string,
  platform: PushPlatform
): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) return;

  const currentUser = ensureAuthenticated();
  const existing = await readTokens(currentUser.uid);
  const match = existing.find((entry) => entry?.token === trimmed);
  if (match && match.platform === platform) {
    return;
  }

  const stale = existing.filter((entry) => entry?.token === trimmed);
  if (stale.length > 0) {
    await updateDoc(dispatcherRef(currentUser.uid), {
      pushTokens: arrayRemove(...stale),
    });
  }

  await updateDoc(dispatcherRef(currentUser.uid), {
    pushTokens: arrayUnion({
      token: trimmed,
      platform,
      updatedAt: Timestamp.now(),
    }),
    updatedAt: Timestamp.now(),
  });
}

/** Drop this device's token — call on sign-out so alerts stop reaching it. */
export async function removeResponderPushToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) return;

  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) return;

  const stale = (await readTokens(currentUser.uid)).filter(
    (entry) => entry?.token === trimmed
  );
  if (stale.length === 0) return;

  await updateDoc(dispatcherRef(currentUser.uid), {
    pushTokens: arrayRemove(...stale),
  });
}

/**
 * Register (or refresh) the current device's Expo push token for civilians.
 * Stores under users/{uid}.pushTokens.
 */
export async function saveCivilianPushToken(
  token: string,
  platform: PushPlatform
): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) return;

  const currentUser = ensureAuthenticated();
  const existing = await readUserTokens(currentUser.uid);
  const match = existing.find((entry) => entry?.token === trimmed);
  if (match && match.platform === platform) {
    return;
  }

  const stale = existing.filter((entry) => entry?.token === trimmed);
  if (stale.length > 0) {
    await updateDoc(userRef(currentUser.uid), {
      pushTokens: arrayRemove(...stale),
    });
  }

  await updateDoc(userRef(currentUser.uid), {
    pushTokens: arrayUnion({
      token: trimmed,
      platform,
      updatedAt: Timestamp.now(),
    }),
    updatedAt: Timestamp.now(),
  });
}

/** Drop this device's token for civilian — call on sign-out. */
export async function removeCivilianPushToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) return;

  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) return;

  const stale = (await readUserTokens(currentUser.uid)).filter(
    (entry) => entry?.token === trimmed
  );
  if (stale.length === 0) return;

  await updateDoc(userRef(currentUser.uid), {
    pushTokens: arrayRemove(...stale),
  });
}

