import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { getAdminAuth, getAdminFirestore } from '@packages/firebase/admin';
import {
  categoryForType,
  mapAdminNotificationRecord,
  shouldNotify,
  type AdminNotificationRecord,
  type AdminNotificationType,
} from '@/lib/adminNotifications';

const COLLECTION = 'adminNotifications';

export interface CreateAdminNotificationInput {
  type: AdminNotificationType;
  title: string;
  message: string;
  targetUrl: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  /**
   * Stable key for this logical event (e.g. `agency.created:BFP`).
   * When set, each recipient gets a deterministic doc id so retries do not duplicate.
   */
  eventKey?: string | null;
  /**
   * Prefer notifying all Super Admins including the actor for actionable events
   * (e.g. KYC queue) so the inbox stays consistent across sessions.
   */
  excludeUid?: string | null;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const next: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) next[key] = entry;
  }
  return next as T;
}

function notificationDocId(eventKey: string, recipientUid: string): string {
  const digest = createHash('sha256')
    .update(`${eventKey}::${recipientUid}`)
    .digest('hex')
    .slice(0, 40);
  return `evt_${digest}`;
}

async function listAdminRecipientUids(): Promise<string[]> {
  const db = getAdminFirestore();
  const auth = getAdminAuth();
  const snap = await db.collection('admins').get();
  const uids = new Set<string>();

  for (const doc of snap.docs) {
    if (doc.id) uids.add(doc.id);
    const email = doc.data()?.email;
    if (typeof email !== 'string' || !email.includes('@')) continue;
    try {
      const user = await auth.getUserByEmail(email.trim().toLowerCase());
      if (user.uid) uids.add(user.uid);
    } catch {
      // Email may not map to Auth yet; keep the document id as a recipient.
    }
  }

  return [...uids];
}

/**
 * Fan-out an actionable awareness notification to Super Admin recipients.
 * Failures are logged and never thrown — privileged actions must still succeed.
 *
 * Prefer {@link recordAdminEvent} from `@/lib/server/adminEvents` so audit +
 * shouldNotify gating stay in one place. Routine CRUD must not call this.
 */
export async function notifySuperAdmins(input: CreateAdminNotificationInput): Promise<void> {
  try {
    // Defense in depth: routine CRUD types never fan out to the Super Admin inbox.
    if (!shouldNotify(input.type)) {
      return;
    }

    const recipients = (await listAdminRecipientUids()).filter((uid) => uid !== input.excludeUid);
    if (recipients.length === 0) return;

    const db = getAdminFirestore();
    const batch = db.batch();
    const category = categoryForType(input.type);
    const createdAt = admin.firestore.FieldValue.serverTimestamp();
    const eventKey = typeof input.eventKey === 'string' && input.eventKey.trim() ? input.eventKey.trim() : null;

    for (const recipientUid of recipients) {
      const ref = eventKey
        ? db.collection(COLLECTION).doc(notificationDocId(eventKey, recipientUid))
        : db.collection(COLLECTION).doc();
      const payload = stripUndefined({
        type: input.type,
        category,
        title: input.title,
        message: input.message,
        targetUrl: input.targetUrl,
        targetId: input.targetId || null,
        recipientUid,
        read: false,
        createdAt,
        eventKey,
        metadata: input.metadata || null,
      });
      if (eventKey) {
        batch.set(ref, payload, { merge: true });
      } else {
        batch.set(ref, payload);
      }
    }

    await batch.commit();
  } catch (error) {
    console.error('Failed to create admin notifications', input.type, error);
  }
}

/** Canonical shared entry point for Super Admin system notifications. */
export const createSystemNotification = notifySuperAdmins;

export function mapAdminNotificationDoc(
  id: string,
  data: Record<string, unknown>
): AdminNotificationRecord {
  return mapAdminNotificationRecord(id, data);
}
