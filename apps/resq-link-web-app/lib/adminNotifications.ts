/**
 * Super Admin awareness notifications — actionable events only.
 *
 * Audit Logs record what happened.
 * Notifications surface events that need attention, awareness, or action.
 *
 * Routine CRUD (create/edit/enable/disable agency/staff/civilian) must not
 * fan out here; use recordAudit / recordAdminEvent instead.
 */

export type AdminNotificationType =
  // KYC — Super Admin action queue
  | 'kyc.submitted'
  | 'kyc.resubmitted'
  | 'kyc.approved'
  | 'kyc.rejected'
  // Operational — emergencies / dispatch (wired as features land)
  | 'incident.reported'
  | 'incident.escalated'
  | 'incident.reassigned'
  | 'incident.attention'
  | 'dispatch.failed'
  | 'push.delivery_failed'
  // System / security
  | 'account.reset_password'
  | 'system.notice'
  | 'system.security'
  | 'system.failure'
  // Legacy types retained for reading old documents until cleaned
  | 'account.created.dispatcher'
  | 'account.created.responder'
  | 'account.created.civilian'
  | 'account.created.command_center'
  | 'account.updated.dispatcher'
  | 'account.updated.responder'
  | 'account.updated.civilian'
  | 'account.disabled'
  | 'account.enabled'
  | 'account.deleted'
  | 'command_center.updated'
  | 'agency.created'
  | 'agency.updated'
  | 'agency.disabled'
  | 'agency.enabled'
  | 'agency.deleted';

/** Inbox filter categories — no “Accounts” (that belonged in Audit Logs). */
export type AdminNotificationCategory = 'kyc' | 'operational' | 'system';

export interface AdminNotificationRecord {
  id: string;
  type: AdminNotificationType;
  category: AdminNotificationCategory;
  title: string;
  message: string;
  targetUrl: string;
  targetId: string | null;
  recipientUid: string;
  read: boolean;
  createdAt: string | null;
  metadata: Record<string, unknown> | null;
  eventKey: string | null;
}

const KYC_TYPES: ReadonlySet<AdminNotificationType> = new Set([
  'kyc.submitted',
  'kyc.resubmitted',
  'kyc.approved',
  'kyc.rejected',
]);

const OPERATIONAL_TYPES: ReadonlySet<AdminNotificationType> = new Set([
  'incident.reported',
  'incident.escalated',
  'incident.reassigned',
  'incident.attention',
  'dispatch.failed',
  'push.delivery_failed',
]);

/**
 * Types that may fan out to the Super Admin Notifications inbox.
 * Everything else is Audit Logs only (or targeted mobile/email elsewhere).
 */
export const SUPER_ADMIN_NOTIFY_TYPES: ReadonlySet<AdminNotificationType> = new Set([
  'kyc.submitted',
  'kyc.resubmitted',
  'incident.reported',
  'incident.escalated',
  'incident.reassigned',
  'incident.attention',
  'dispatch.failed',
  'push.delivery_failed',
  'account.reset_password',
  'system.notice',
  'system.security',
  'system.failure',
]);

/** @deprecated Prefer {@link SUPER_ADMIN_NOTIFY_TYPES} / {@link shouldNotify}. */
export const NOTIFY_TYPES = SUPER_ADMIN_NOTIFY_TYPES;

export function shouldNotify(type: AdminNotificationType): boolean {
  return SUPER_ADMIN_NOTIFY_TYPES.has(type);
}

export function categoryForType(type: AdminNotificationType): AdminNotificationCategory {
  if (KYC_TYPES.has(type)) return 'kyc';
  if (OPERATIONAL_TYPES.has(type)) return 'operational';
  return 'system';
}

function createdAtToIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value === 'object') {
    const candidate = value as {
      toDate?: () => Date;
      toMillis?: () => number;
      _seconds?: number;
      seconds?: number;
    };
    if (typeof candidate.toDate === 'function') {
      try {
        return candidate.toDate().toISOString();
      } catch {
        return null;
      }
    }
    if (typeof candidate.toMillis === 'function') {
      return new Date(candidate.toMillis()).toISOString();
    }
    const seconds = candidate._seconds ?? candidate.seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000).toISOString();
    }
  }
  return null;
}

function normalizeCategory(
  raw: unknown,
  type: AdminNotificationType
): AdminNotificationCategory {
  if (raw === 'kyc' || raw === 'operational' || raw === 'system') {
    return raw;
  }
  // Legacy “accounts” docs → derive from type (usually system after cleanup).
  if (raw === 'accounts') {
    return categoryForType(type);
  }
  return categoryForType(type);
}

/** Map a Firestore adminNotifications document (client or Admin SDK shape). */
export function mapAdminNotificationRecord(
  id: string,
  data: Record<string, unknown>
): AdminNotificationRecord {
  const type = (typeof data.type === 'string' ? data.type : 'system.notice') as AdminNotificationType;

  return {
    id,
    type,
    category: normalizeCategory(data.category, type),
    title: typeof data.title === 'string' ? data.title : 'Notification',
    message: typeof data.message === 'string' ? data.message : '',
    targetUrl: typeof data.targetUrl === 'string' ? data.targetUrl : '/admin/dashboard',
    targetId: typeof data.targetId === 'string' ? data.targetId : null,
    recipientUid: typeof data.recipientUid === 'string' ? data.recipientUid : '',
    read: Boolean(data.read),
    createdAt: createdAtToIso(data.createdAt),
    metadata:
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : null,
    eventKey: typeof data.eventKey === 'string' ? data.eventKey : null,
  };
}
