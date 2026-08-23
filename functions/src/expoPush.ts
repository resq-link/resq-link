import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
/** Expo accepts at most 100 messages per request. */
const BATCH_SIZE = 100;

export const ALERT_CHANNEL = 'incident-alerts-v2';
/** Must match the bundled asset and the client's notification channel. */
export const ALARM_SOUND = 'incident_alarm.wav';
/** Must match the category registered in the responder app for tray actions. */
export const ALERT_CATEGORY = 'incident-alert';

export const CIVILIAN_ALERT_CHANNEL = 'emergency-updates';

export type StoredToken = {
  token: string;
  platform?: 'ios' | 'android' | 'web';
};

export type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound: string;
  channelId: string;
  priority: 'high';
  interruptionLevel: 'time-sensitive' | 'critical';
  ttl: number;
  categoryId?: string;
};

export type PushTarget = {
  responderId: string;
  tokens: StoredToken[];
};

/** Collect Expo tokens for the given responder uids, skipping those with none. */
export async function loadResponderTokens(
  responderIds: string[]
): Promise<PushTarget[]> {
  if (responderIds.length === 0) return [];
  const db = getFirestore();

  const snaps = await Promise.all(
    responderIds.map((id) => db.collection('dispatchers').doc(id).get())
  );

  const targets: PushTarget[] = [];
  snaps.forEach((snap, index) => {
    if (!snap.exists) return;
    // Off-duty responders must not be woken — duty is mirrored on the
    // dispatcher doc as onDutyResourceId when they claim a vehicle.
    if (!snap.get('onDutyResourceId')) return;
    const raw = snap.get('pushTokens');
    const tokens: StoredToken[] = Array.isArray(raw)
      ? raw.filter((entry) => entry?.token && typeof entry.token === 'string')
      : [];
    if (tokens.length > 0) {
      targets.push({ responderId: responderIds[index], tokens });
    }
  });

  return targets;
}

/** Collect Expo tokens for a civilian user. */
export async function loadCivilianTokens(
  userId: string
): Promise<PushTarget | null> {
  if (!userId) return null;
  const db = getFirestore();
  const snap = await db.collection('users').doc(userId).get();
  if (!snap.exists) return null;

  const raw = snap.get('pushTokens');
  const tokens: StoredToken[] = Array.isArray(raw)
    ? raw.filter((entry) => entry?.token && typeof entry.token === 'string')
    : [];

  if (tokens.length === 0) return null;
  return { responderId: userId, tokens };
}

/**
 * Send messages to Expo and prune tokens the service reports as dead.
 *
 * A DeviceNotRegistered ticket means the app was uninstalled or the token was
 * reissued; leaving it in place would make every future alert retry a device
 * that can never receive it.
 */
export async function sendExpoPush(
  messages: ExpoMessage[],
  tokenOwners: Map<string, string>
): Promise<{ sent: number; removed: number }> {
  let sent = 0;
  let removed = 0;

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    let payload: { data?: Array<{ status: string; details?: { error?: string } }> };

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });
      if (!response.ok) {
        logger.error('Expo push rejected the batch', {
          status: response.status,
          body: (await response.text()).slice(0, 500),
        });
        continue;
      }
      payload = (await response.json()) as typeof payload;
    } catch (error) {
      logger.error('Expo push request failed', { error: String(error) });
      continue;
    }

    const tickets = payload.data ?? [];
    for (let t = 0; t < tickets.length; t++) {
      const ticket = tickets[t];
      const token = batch[t]?.to;
      if (ticket?.status === 'ok') {
        sent++;
        continue;
      }
      if (ticket?.details?.error === 'DeviceNotRegistered' && token) {
        removed += await pruneToken(tokenOwners.get(token), token);
      } else {
        logger.warn('Expo push ticket error', {
          token,
          error: ticket?.details?.error,
        });
      }
    }
  }

  return { sent, removed };
}

async function pruneToken(
  ownerId: string | undefined,
  token: string
): Promise<number> {
  if (!ownerId) return 0;
  const db = getFirestore();
  let removed = 0;

  for (const coll of ['dispatchers', 'users'] as const) {
    const ref = db.collection(coll).doc(ownerId);
    try {
      const snap = await ref.get();
      if (!snap.exists) continue;
      const raw = snap.get('pushTokens');
      if (!Array.isArray(raw)) continue;
      const stale = raw.filter((entry) => entry?.token === token);
      if (stale.length > 0) {
        await ref.update({ pushTokens: FieldValue.arrayRemove(...stale) });
        logger.info('Pruned dead push token', { collection: coll, ownerId });
        removed++;
      }
    } catch (error) {
      logger.warn('Could not prune token', { collection: coll, ownerId, error: String(error) });
    }
  }

  return removed > 0 ? 1 : 0;
}
