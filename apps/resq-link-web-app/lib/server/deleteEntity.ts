import * as admin from 'firebase-admin';
import { getAdminAuth, getAdminFirestore } from '@packages/firebase/admin';
import type { ManagedAccountType } from '@/lib/accountTypes';
import {
  assertNotSuperAdmin,
  resolveManagedAccount,
  setAuthDisabled,
} from '@/lib/server/accounts';
import { assertDestructiveAccountActionAllowed } from '@/lib/server/accountClassification';
import { mapAgencyDoc } from '@/lib/server/agencies';
import { finalizeAgencyCode } from '@/lib/agencyTypes';

export type DeleteMethod = 'soft_delete';

export interface DeleteDependencyBlock {
  allowed: false;
  message: string;
  code: 'DEPENDENCY_BLOCK';
  details?: Record<string, unknown>;
}

export interface DeleteDependencyOk {
  allowed: true;
  warnings?: string[];
  details?: Record<string, unknown>;
}

export type DeleteDependencyResult = DeleteDependencyBlock | DeleteDependencyOk;

function deletedPayload(actorUid: string, reason?: string | null) {
  return {
    deleted: true,
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedBy: actorUid,
    deletedReason: reason?.trim() || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

export async function checkAccountDeleteDependencies(
  uid: string,
  accountType: ManagedAccountType
): Promise<DeleteDependencyResult> {
  const db = getAdminFirestore();

  if (accountType === 'command_center') {
    const snap = await db
      .collection('incidents')
      .where('commandCenterAdminId', '==', uid)
      .limit(40)
      .get();

    const openCount = snap.docs.filter((doc) => {
      const data = doc.data() || {};
      const resolution = String(data.resolutionStatus || '');
      const status = String(data.status || '');
      return resolution === 'open' || !['resolved', 'unresolved', 'done'].includes(status);
    }).length;

    if (openCount > 0) {
      return {
        allowed: false,
        code: 'DEPENDENCY_BLOCK',
        message:
          'This command center cannot be deleted while it still has open incidents. Resolve or reassign those incidents first, or disable the account instead.',
        details: { openIncidents: openCount },
      };
    }

    return {
      allowed: true,
      warnings: [
        'Historical incidents linked to this command center will be preserved. The login account will be permanently removed from active administration.',
      ],
    };
  }

  // Dispatchers / responders / civilians: soft-delete preserves incident history.
  return {
    allowed: true,
    warnings: [
      'Operational history (incidents, reports, and assignments) will be preserved. The account will no longer appear in active lists or be able to sign in.',
    ],
  };
}

export async function softDeleteManagedAccount(input: {
  uid: string;
  accountType: ManagedAccountType;
  actorUid: string;
  reason?: string | null;
}): Promise<{
  label: string;
  email: string;
  collection: 'dispatchers' | 'users' | 'commandCenters';
  method: DeleteMethod;
  previousActive: boolean;
}> {
  await assertNotSuperAdmin(input.uid);
  await assertDestructiveAccountActionAllowed({
    uid: input.uid,
    accountType: input.accountType,
    action: 'delete',
  });
  const account = await resolveManagedAccount(input.uid, input.accountType);

  if (account.data.deleted === true) {
    throw Object.assign(new Error('This account has already been deleted.'), { status: 409 });
  }

  const deps = await checkAccountDeleteDependencies(input.uid, input.accountType);
  if (!deps.allowed) {
    throw Object.assign(new Error(deps.message), { status: 409, code: deps.code, details: deps.details });
  }

  try {
    await setAuthDisabled(input.uid, true);
  } catch (error: unknown) {
    const status =
      error && typeof error === 'object' && 'status' in error ? Number(error.status) : 0;
    if (status !== 404) throw error;
  }

  const db = getAdminFirestore();
  const payload = {
    ...deletedPayload(input.actorUid, input.reason),
  };

  if (account.collection === 'dispatchers') {
    await db.doc(`dispatchers/${input.uid}`).set(
      {
        ...payload,
        active: false,
      },
      { merge: true }
    );
  } else if (account.collection === 'users') {
    await db.doc(`users/${input.uid}`).set(
      {
        ...payload,
        disabled: true,
      },
      { merge: true }
    );
  } else {
    await db.doc(`commandCenters/${input.uid}`).set(
      {
        ...payload,
        disabled: true,
      },
      { merge: true }
    );
  }

  // Clear role claims so deleted accounts cannot pass claim-based workspace checks.
  try {
    const authUser = await getAdminAuth().getUser(input.uid);
    const previous = (authUser.customClaims || {}) as Record<string, unknown>;
    await getAdminAuth().setCustomUserClaims(input.uid, {
      ...previous,
      role: 'deleted',
      deleted: true,
    });
  } catch {
    // Auth claims are best-effort; Firestore deleted flag is authoritative for admin lists.
  }

  const previousActive =
    account.collection === 'dispatchers'
      ? account.data.active !== false
      : account.data.disabled !== true;

  return {
    label: account.label,
    email: account.email,
    collection: account.collection,
    method: 'soft_delete',
    previousActive,
  };
}

export async function checkAgencyDeleteDependencies(code: string): Promise<DeleteDependencyResult> {
  const normalized = finalizeAgencyCode(code);
  const db = getAdminFirestore();
  const personnel = await db.collection('dispatchers').where('role', '==', normalized).limit(50).get();

  const activePersonnel = personnel.docs.filter((doc) => {
    const data = doc.data() || {};
    return data.deleted !== true;
  });

  if (activePersonnel.length > 0) {
    return {
      allowed: false,
      code: 'DEPENDENCY_BLOCK',
      message: `This agency cannot be deleted because ${activePersonnel.length} dispatcher/responder account(s) are still assigned to it. Reassign or delete those accounts first.`,
      details: { personnelCount: activePersonnel.length },
    };
  }

  return { allowed: true };
}

export async function softDeleteAgency(input: {
  code: string;
  actorUid: string;
  reason?: string | null;
}): Promise<{
  code: string;
  name: string;
  method: DeleteMethod;
  wasSeeded: boolean;
}> {
  const normalized = finalizeAgencyCode(input.code);
  const ref = getAdminFirestore().doc(`agencies/${normalized}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw Object.assign(new Error('Agency not found'), { status: 404 });
  }

  const data = (snap.data() || {}) as Record<string, unknown>;
  if (data.deleted === true) {
    throw Object.assign(new Error('This agency has already been deleted.'), { status: 409 });
  }

  const deps = await checkAgencyDeleteDependencies(normalized);
  if (!deps.allowed) {
    throw Object.assign(new Error(deps.message), { status: 409, code: deps.code, details: deps.details });
  }

  const agency = mapAgencyDoc(normalized, data);
  await ref.set(
    {
      ...deletedPayload(input.actorUid, input.reason),
      isActive: false,
    },
    { merge: true }
  );

  return {
    code: agency.code,
    name: agency.name,
    method: 'soft_delete',
    wasSeeded: data.seeded === true,
  };
}

export async function deleteAdminNotifications(input: {
  recipientUid: string;
  ids?: string[];
  clearRead?: boolean;
}): Promise<{ deletedCount: number }> {
  const db = getAdminFirestore();
  const base = db.collection('adminNotifications').where('recipientUid', '==', input.recipientUid);

  let snap: admin.firestore.QuerySnapshot;
  if (input.ids && input.ids.length > 0) {
    const unique = [...new Set(input.ids.map((id) => id.trim()).filter(Boolean))].slice(0, 100);
    const docs = await Promise.all(unique.map((id) => db.doc(`adminNotifications/${id}`).get()));
    const owned = docs.filter((doc) => doc.exists && doc.data()?.recipientUid === input.recipientUid);
    if (owned.length === 0) return { deletedCount: 0 };
    const batch = db.batch();
    owned.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return { deletedCount: owned.length };
  }

  if (input.clearRead) {
    snap = await base.where('read', '==', true).limit(200).get();
  } else {
    throw Object.assign(new Error('Provide notification ids or clearRead=true'), { status: 400 });
  }

  if (snap.empty) return { deletedCount: 0 };
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return { deletedCount: snap.size };
}
