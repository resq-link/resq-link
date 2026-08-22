export type AdminNotificationType =
  | 'kyc.submitted'
  | 'account.created.dispatcher'
  | 'account.created.responder'
  | 'account.created.civilian'
  | 'account.created.command_center'
  | 'account.disabled'
  | 'account.enabled'
  | 'account.reset_password'
  | 'command_center.updated'
  | 'agency.created'
  | 'agency.updated'
  | 'agency.disabled'
  | 'agency.enabled'
  | 'system.notice';

export type AdminNotificationCategory = 'kyc' | 'accounts' | 'system';

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
}

export function categoryForType(type: AdminNotificationType): AdminNotificationCategory {
  if (type === 'kyc.submitted') return 'kyc';
  if (
    type === 'system.notice' ||
    type === 'agency.created' ||
    type === 'agency.updated' ||
    type === 'agency.disabled' ||
    type === 'agency.enabled'
  ) {
    return 'system';
  }
  return 'accounts';
}
