import type { WriteAuditLogInput } from '@packages/firebase/admin';
import { recordAudit } from '@/lib/server/audit';
import {
  notifySuperAdmins,
  type CreateAdminNotificationInput,
} from '@/lib/server/adminNotifications';
import {
  shouldNotify,
  type AdminNotificationType,
} from '@/lib/adminNotifications';

export { shouldNotify } from '@/lib/adminNotifications';

export type RecordAdminEventInput = {
  /** Always written when provided — historical trail for CRUD and decisions. */
  audit?: WriteAuditLogInput | null;
  /**
   * Super Admin inbox fan-out. Only written when {@link shouldNotify} is true
   * for `notification.type`. Routine CRUD should omit this field.
   */
  notification?: CreateAdminNotificationInput | null;
};

/**
 * Central admin event path:
 *
 *   recordAdminEvent(event)
 *     → writeAuditLog (when audit provided)
 *     → createNotification (only when shouldNotify(type))
 *
 * Prefer this over calling notifySuperAdmins directly from route handlers.
 */
export async function recordAdminEvent(input: RecordAdminEventInput): Promise<void> {
  if (input.audit) {
    await recordAudit(input.audit);
  }

  const notification = input.notification;
  if (!notification) return;

  if (!shouldNotify(notification.type as AdminNotificationType)) {
    return;
  }

  await notifySuperAdmins(notification);
}
