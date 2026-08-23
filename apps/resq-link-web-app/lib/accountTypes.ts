export type AccountListType = 'dispatchers' | 'responders' | 'civilians' | 'command-centers';

export type ManagedAccountType = 'dispatcher' | 'responder' | 'civilian' | 'command_center';

export type AccountStatusKey = 'active' | 'disabled' | 'pending' | 'pending_kyc' | 'rejected';

export type CivilianVerification = 'verified' | 'pending_kyc' | 'pending_email' | 'rejected' | 'unknown';

export interface StaffAccountRecord {
  id: string;
  email: string;
  fullName: string;
  agency: string;
  designation: string;
  teamCode: string | null;
  teamLabel: string | null;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CivilianAccountRecord {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  disabled: boolean;
  verification: CivilianVerification;
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;
  kycReviewedBy: string | null;
  kycRejectionReason: string | null;
  createdAt: string | null;
}

export interface CommandCenterRecord {
  id: string;
  email: string;
  name: string;
  location: string;
  disabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AuditLogRecord {
  id: string;
  actorUid: string;
  actorEmail: string | null;
  action: string;
  targetUid: string | null;
  targetLabel: string | null;
  targetCollection: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
}

export interface DashboardStats {
  civilians: { total: number; thisMonth: number };
  responders: { total: number; active: number };
  dispatchers: { total: number; active: number };
  agencies: { total: number; active: number };
  pendingKyc: number;
  disabledAccounts: number;
}

export interface NeedsAttentionItem {
  id: string;
  label: string;
  href: string;
  count: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface KycListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  govIdType: string;
  govIdFrontUrl: string;
  status: string;
  kycRejectionReason: string | null;
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;
  kycReviewedBy: string | null;
}
