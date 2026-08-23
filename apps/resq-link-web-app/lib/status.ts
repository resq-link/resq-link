import type { AccountStatusKey, CivilianVerification } from './accountTypes';

export interface StatusDisplay {
  key: AccountStatusKey;
  label: string;
  symbol: string;
  className: string;
}

const STATUS_MAP: Record<AccountStatusKey, StatusDisplay> = {
  active: {
    key: 'active',
    label: 'Active',
    symbol: '●',
    className:
      'bg-primary-50 text-primary-800 ring-primary-200 dark:bg-primary-500/15 dark:text-primary-300 dark:ring-primary-500/30',
  },
  disabled: {
    key: 'disabled',
    label: 'Disabled',
    symbol: '○',
    className:
      'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/30',
  },
  pending: {
    key: 'pending',
    label: 'Pending',
    symbol: '◷',
    className:
      'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
  },
  pending_kyc: {
    key: 'pending_kyc',
    label: 'Pending KYC',
    symbol: '◷',
    className:
      'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30',
  },
  rejected: {
    key: 'rejected',
    label: 'Rejected',
    symbol: '✕',
    className:
      'bg-red-50 text-red-800 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30',
  },
};

export function staffAccountStatus(active: boolean): StatusDisplay {
  return active ? STATUS_MAP.active : STATUS_MAP.disabled;
}

export function civilianVerification(status: string | undefined, disabled: boolean): CivilianVerification {
  if (disabled) return 'unknown';
  if (status === 'active') return 'verified';
  if (status === 'pending_kyc_review') return 'pending_kyc';
  if (status === 'pending_email_verification') return 'pending_email';
  if (status === 'rejected') return 'rejected';
  return 'unknown';
}

export function civilianAccountStatus(status: string | undefined, disabled: boolean): StatusDisplay {
  if (disabled) return STATUS_MAP.disabled;
  if (status === 'rejected') return STATUS_MAP.rejected;
  if (status === 'pending_kyc_review') return STATUS_MAP.pending_kyc;
  if (status === 'pending_email_verification') return STATUS_MAP.pending;
  return STATUS_MAP.active;
}

export function verificationLabel(value: CivilianVerification): string {
  switch (value) {
    case 'verified':
      return 'Verified';
    case 'pending_kyc':
      return 'Pending KYC';
    case 'pending_email':
      return 'Pending email';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Unknown';
  }
}

export function getStatusDisplay(key: AccountStatusKey): StatusDisplay {
  return STATUS_MAP[key];
}
