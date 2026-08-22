import { getAdminAuth, getAdminFirestore, isAdmin } from '@packages/firebase/admin';
import type { ManagedAccountType, StaffAccountRecord } from '../accountTypes';
import { civilianVerification } from '../status';
import { toIso } from './timestamps';

type FirestoreData = Record<string, unknown>;

export function isResponderDesignation(value: unknown): boolean {
  return String(value || '').toLowerCase().includes('responder');
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function mapStaffRecord(
  id: string,
  data: FirestoreData
): StaffAccountRecord {
  return {
    id,
    email: asString(data.email),
    fullName: asString(data.fullName) || asString(data.name),
    agency: asString(data.role),
    designation: asString(data.designation) || 'dispatcher',
    teamCode: asString(data.teamCode) || null,
    teamLabel: asString(data.teamLabel) || asString(data.teamCode) || null,
    active: data.active !== false,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export interface ResolvedAccount {
  type: ManagedAccountType;
  collection: 'dispatchers' | 'users' | 'commandCenters';
  label: string;
  email: string;
  data: FirestoreData;
}

export async function resolveManagedAccount(
  uid: string,
  expectedType: ManagedAccountType
): Promise<ResolvedAccount> {
  const db = getAdminFirestore();

  if (expectedType === 'dispatcher' || expectedType === 'responder') {
    const snap = await db.doc(`dispatchers/${uid}`).get();
    if (!snap.exists) {
      throw Object.assign(new Error('Staff account not found'), { status: 404 });
    }
    const data = (snap.data() || {}) as FirestoreData;
    const responder = isResponderDesignation(data.designation);
    if (expectedType === 'responder' && !responder) {
      throw Object.assign(new Error('This account is not a responder'), { status: 400 });
    }
    if (expectedType === 'dispatcher' && responder) {
      throw Object.assign(new Error('This account is not a dispatcher'), { status: 400 });
    }
    return {
      type: expectedType,
      collection: 'dispatchers',
      label: asString(data.fullName) || asString(data.email) || uid,
      email: asString(data.email),
      data,
    };
  }

  if (expectedType === 'civilian') {
    const snap = await db.doc(`users/${uid}`).get();
    if (!snap.exists) {
      throw Object.assign(new Error('Civilian account not found'), { status: 404 });
    }
    const data = (snap.data() || {}) as FirestoreData;
    const role = asString(data.role).toLowerCase();
    if (role && role !== 'civilian') {
      throw Object.assign(new Error('This account is not a civilian'), { status: 400 });
    }
    return {
      type: 'civilian',
      collection: 'users',
      label: asString(data.name) || asString(data.email) || uid,
      email: asString(data.email),
      data,
    };
  }

  const snap = await db.doc(`commandCenters/${uid}`).get();
  if (!snap.exists) {
    throw Object.assign(new Error('Command center not found'), { status: 404 });
  }
  const data = (snap.data() || {}) as FirestoreData;
  return {
    type: 'command_center',
    collection: 'commandCenters',
    label: asString(data.name) || asString(data.email) || uid,
    email: asString(data.email),
    data,
  };
}

export async function assertNotSuperAdmin(uid: string): Promise<void> {
  if (await isAdmin(uid)) {
    throw Object.assign(
      new Error('Super administrator accounts cannot be disabled from this console.'),
      { status: 400 }
    );
  }
}

export async function setAuthDisabled(uid: string, disabled: boolean): Promise<void> {
  try {
    await getAdminAuth().updateUser(uid, { disabled });
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code === 'auth/user-not-found') {
      throw Object.assign(new Error('Account not found'), { status: 404 });
    }
    throw error;
  }
}

export function httpErrorStatus(error: unknown): number {
  if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
    return error.status;
  }
  return 500;
}

export function mapCivilianRecord(id: string, data: FirestoreData) {
  const disabled = data.disabled === true;
  return {
    id,
    email: asString(data.email),
    name:
      asString(data.name) ||
      `${asString(data.firstName)} ${asString(data.lastName)}`.trim(),
    phone: asString(data.phone),
    status: asString(data.status) || 'active',
    disabled,
    verification: civilianVerification(asString(data.status), disabled),
    kycSubmittedAt: toIso(data.kycSubmittedAt),
    kycReviewedAt: toIso(data.kycReviewedAt),
    kycReviewedBy: asString(data.kycReviewedBy) || null,
    kycRejectionReason: asString(data.kycRejectionReason) || null,
    createdAt: toIso(data.createdAt),
  };
}

export function mapCommandCenterRecord(id: string, data: FirestoreData) {
  return {
    id,
    email: asString(data.email),
    name: asString(data.name),
    location: asString(data.location),
    disabled: data.disabled === true,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}
