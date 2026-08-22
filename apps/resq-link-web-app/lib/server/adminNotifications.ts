import * as admin from 'firebase-admin';
import { getAdminFirestore } from '@packages/firebase/admin';
import {
  categoryForType,
  type AdminNotificationCategory,
  type AdminNotificationRecord,
  type AdminNotificationType,
} from '@/lib/adminNotifications';
import { toIso } from '@/lib/server/timestamps';

const COLLECTION = 'adminNotifications';

export interface CreateAdminNotificationInput {
  type: AdminNotificationType;
  title: string;
  message: string;
  targetUrl: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Skip notifying this Super Admin (usually the actor). */
  excludeUid?: string | null;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const next: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) next[key] = entry;
  }
  return next as T;
}

async function listAdminUids(): Promise<string[]> {
  const snap = await getAdminFirestore().collection('admins').get();
  return snap.docs.map((doc) => doc.id).filter(Boolean);
}

/**
 * Fan-out an administrative awareness notification to Super Admin recipients.
 * Failures are logged and never thrown — privileged actions must still succeed.
 */
export async function notifySuperAdmins(input: CreateAdminNotificationInput): Promise<void> {
  try {
    const recipients = (await listAdminUids()).filter((uid) => uid !== input.excludeUid);
    if (recipients.length === 0) return;

    const db = getAdminFirestore();
    const batch = db.batch();
    const category = categoryForType(input.type);
    const createdAt = admin.firestore.FieldValue.serverTimestamp();

    for (const recipientUid of recipients) {
      const ref = db.collection(COLLECTION).doc();
      batch.set(
        ref,
        stripUndefined({
          type: input.type,
          category,
          title: input.title,
          message: input.message,
          targetUrl: input.targetUrl,
          targetId: input.targetId || null,
          recipientUid,
          read: false,
          createdAt,
          metadata: input.metadata || null,
        })
      );
    }

    await batch.commit();
  } catch (error) {
    console.error('Failed to create admin notifications', input.type, error);
  }
}

export function mapAdminNotificationDoc(id: string, data: Record<string, unknown>): AdminNotificationRecord {
  const type = (typeof data.type === 'string' ? data.type : 'system.notice') as AdminNotificationType;
  const category =
    data.category === 'kyc' || data.category === 'accounts' || data.category === 'system'
      ? (data.category as AdminNotificationCategory)
      : categoryForType(type);

  return {
    id,
    type,
    category,
    title: typeof data.title === 'string' ? data.title : 'Notification',
    message: typeof data.message === 'string' ? data.message : '',
    targetUrl: typeof data.targetUrl === 'string' ? data.targetUrl : '/admin/dashboard',
    targetId: typeof data.targetId === 'string' ? data.targetId : null,
    recipientUid: typeof data.recipientUid === 'string' ? data.recipientUid : '',
    read: Boolean(data.read),
    createdAt: toIso(data.createdAt),
    metadata:
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : null,
  };
}
