import type { Query } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@packages/firebase/admin';
import {
  isResponderDesignation,
  mapCivilianRecord,
  mapCommandCenterRecord,
  mapStaffRecord,
} from '@/lib/server/accounts';
import {
  isExplicitCivilianUserDoc,
  isProtectedAccountEmail,
  mapRoleAlias,
} from '@/lib/server/accountClassification';
import { toMillis } from '@/lib/server/timestamps';
import type { AccountListType, StaffAccountRecord } from '@/lib/accountTypes';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;
const MAX_SCAN = 1500;

const STAFF_SELECT = [
  'email',
  'fullName',
  'name',
  'role',
  'designation',
  'teamCode',
  'teamLabel',
  'active',
  'deleted',
  'createdAt',
  'updatedAt',
] as const;

const CIVILIAN_SELECT = [
  'email',
  'name',
  'firstName',
  'lastName',
  'phone',
  'role',
  'status',
  'disabled',
  'deleted',
  'govIdType',
  'kycSubmittedAt',
  'kycReviewedAt',
  'kycReviewedBy',
  'kycRejectionReason',
  'createdAt',
] as const;

const COMMAND_CENTER_SELECT = [
  'email',
  'name',
  'location',
  'disabled',
  'deleted',
  'createdAt',
  'updatedAt',
] as const;

export interface AccountListParams {
  type: AccountListType;
  search?: string;
  agency?: string;
  status?: string;
  verification?: string;
  page?: number;
  pageSize?: number;
}

export interface AccountListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

function paginate<T>(items: T[], page: number, pageSize: number): AccountListResult<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

function matchesSearch(haystack: Array<string | null | undefined>, search: string): boolean {
  if (!search) return true;
  const needle = search.toLowerCase();
  return haystack.some((value) => (value || '').toLowerCase().includes(needle));
}

function readPaging(params: AccountListParams) {
  const page = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(params.pageSize || DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE)
  );
  return { page, pageSize };
}

/** Web dispatcher operators live in `commandCenters` (e.g. command@rescue.ph). */
function mapCommandCenterAsDispatcher(
  id: string,
  data: Record<string, unknown>
): StaffAccountRecord {
  const mapped = mapCommandCenterRecord(id, data);
  return {
    id: mapped.id,
    email: mapped.email,
    fullName: mapped.name,
    agency: '',
    designation: 'dispatcher',
    teamCode: null,
    teamLabel: null,
    active: !mapped.disabled,
    createdAt: mapped.createdAt,
    updatedAt: mapped.updatedAt,
  };
}

async function listDispatchers(
  params: AccountListParams
): Promise<AccountListResult<StaffAccountRecord>> {
  const { page, pageSize } = readPaging(params);
  const search = (params.search || '').trim();
  const status = (params.status || '').trim();
  const db = getAdminFirestore();

  let query: Query = db.collection('commandCenters');
  if (status === 'active') query = query.where('disabled', '==', false);
  else if (status === 'disabled') query = query.where('disabled', '==', true);

  const snap = await query.select(...COMMAND_CENTER_SELECT).limit(MAX_SCAN).get();
  const rows = snap.docs
    .map((doc) => ({
      record: mapCommandCenterAsDispatcher(doc.id, (doc.data() || {}) as Record<string, unknown>),
      deleted: (doc.data() || {}).deleted === true,
    }))
    .filter((row) => !row.deleted)
    .map((row) => row.record)
    .filter((row) => matchesSearch([row.fullName, row.email], search))
    .sort((a, b) => toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt));

  return paginate(rows, page, pageSize);
}

async function listResponders(
  params: AccountListParams
): Promise<AccountListResult<StaffAccountRecord>> {
  const { page, pageSize } = readPaging(params);
  const search = (params.search || '').trim();
  const agency = (params.agency || '').trim();
  const status = (params.status || '').trim();
  const db = getAdminFirestore();

  let query: Query = db.collection('dispatchers');
  if (agency) query = query.where('role', '==', agency);
  if (status === 'active') query = query.where('active', '==', true);
  else if (status === 'disabled') query = query.where('active', '==', false);

  const snap = await query.select(...STAFF_SELECT).limit(MAX_SCAN).get();
  const rows = snap.docs
    .map((doc) => ({
      record: mapStaffRecord(doc.id, (doc.data() || {}) as Record<string, unknown>),
      rawDesignation: (doc.data() || {}).designation,
      deleted: (doc.data() || {}).deleted === true,
    }))
    .filter((row) => !row.deleted)
    .filter((row) => isResponderDesignation(row.rawDesignation ?? row.record.designation))
    .map((row) => row.record)
    .filter((row) => matchesSearch([row.fullName, row.email, row.agency, row.teamLabel], search))
    .sort((a, b) => toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt));

  return paginate(rows, page, pageSize);
}

async function listCivilians(
  params: AccountListParams
): Promise<AccountListResult<ReturnType<typeof mapCivilianRecord>>> {
  const { page, pageSize } = readPaging(params);
  const search = (params.search || '').trim();
  const status = (params.status || '').trim();
  const verification = (params.verification || '').trim();
  const db = getAdminFirestore();

  let query: Query = db.collection('users');
  if (status === 'disabled') {
    query = query.where('disabled', '==', true);
  } else if (status === 'rejected') {
    query = query.where('status', '==', 'rejected');
  } else if (status === 'active') {
    query = query.where('status', '==', 'active');
  }

  if (verification === 'pending_kyc') {
    query = query.where('status', '==', 'pending_kyc_review');
  } else if (verification === 'pending_email') {
    query = query.where('status', '==', 'pending_email_verification');
  } else if (verification === 'rejected') {
    query = query.where('status', '==', 'rejected');
  } else if (verification === 'verified') {
    query = query.where('status', '==', 'active');
  }

  const snap = await query.select(...CIVILIAN_SELECT).limit(MAX_SCAN).get();
  const rows = snap.docs
    .map((doc) => ({
      record: mapCivilianRecord(doc.id, (doc.data() || {}) as Record<string, unknown>),
      data: (doc.data() || {}) as Record<string, unknown>,
    }))
    .filter((row) => isExplicitCivilianUserDoc(row.data))
    .filter((row) => !isProtectedAccountEmail(row.record.email))
    .filter((row) => mapRoleAlias(row.data.role) === 'civilian')
    .map((row) => row.record)
    .filter((row) => matchesSearch([row.name, row.email, row.phone], search))
    .filter((row) => {
      if (status === 'active') return !row.disabled && row.status === 'active';
      if (status === 'disabled') return row.disabled;
      if (status === 'rejected') return row.status === 'rejected' && !row.disabled;
      return true;
    })
    .filter((row) => {
      if (!verification || verification === 'all') return true;
      if (verification === 'verified') return row.verification === 'verified';
      if (verification === 'pending_kyc') return row.verification === 'pending_kyc';
      if (verification === 'pending_email') return row.verification === 'pending_email';
      if (verification === 'rejected') return row.verification === 'rejected';
      return true;
    })
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

  return paginate(rows, page, pageSize);
}

async function listCommandCenters(
  params: AccountListParams
): Promise<AccountListResult<ReturnType<typeof mapCommandCenterRecord>>> {
  const { page, pageSize } = readPaging(params);
  const search = (params.search || '').trim();
  const status = (params.status || '').trim();
  const db = getAdminFirestore();

  let query: Query = db.collection('commandCenters');
  if (status === 'active') query = query.where('disabled', '==', false);
  else if (status === 'disabled') query = query.where('disabled', '==', true);

  const snap = await query.select(...COMMAND_CENTER_SELECT).limit(MAX_SCAN).get();
  const rows = snap.docs
    .map((doc) => ({
      record: mapCommandCenterRecord(doc.id, (doc.data() || {}) as Record<string, unknown>),
      deleted: (doc.data() || {}).deleted === true,
    }))
    .filter((row) => !row.deleted)
    .map((row) => row.record)
    .filter((row) => matchesSearch([row.name, row.email, row.location], search))
    .sort((a, b) => toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt));

  return paginate(rows, page, pageSize);
}

export async function listManagedAccounts(params: AccountListParams) {
  if (params.type === 'dispatchers') {
    return listDispatchers(params);
  }
  if (params.type === 'responders') {
    return listResponders(params);
  }
  if (params.type === 'civilians') {
    return listCivilians(params);
  }
  return listCommandCenters(params);
}
