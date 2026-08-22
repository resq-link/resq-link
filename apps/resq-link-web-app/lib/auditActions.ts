export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'account.create.dispatcher': 'Created Dispatcher',
  'account.create.responder': 'Created Responder',
  'account.create.civilian': 'Created Civilian',
  'account.create.command_center': 'Created Command Center',
  'account.disable': 'Disabled Account',
  'account.enable': 'Enabled Account',
  'account.update_staff': 'Updated Staff Account',
  'account.reset_password': 'Reset Password',
  'command_center.update': 'Updated Command Center',
  'kyc.approve': 'Approved KYC',
  'kyc.reject': 'Rejected KYC',
  'agency.create': 'Created Agency',
  'agency.update': 'Updated Agency',
  'agency.disable': 'Disabled Agency',
  'agency.enable': 'Enabled Agency',
  'admin.profile.update': 'Updated Admin Profile',
  'admin.password.change': 'Changed Admin Password',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] || action;
}
