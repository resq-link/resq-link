import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminFirestore } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import {
  httpErrorStatus,
  resolveManagedAccount,
  setAuthDisabled,
} from '@/lib/server/accounts';
import { assertDestructiveAccountActionAllowed } from '@/lib/server/accountClassification';
import type { ManagedAccountType } from '@/lib/accountTypes';
import { publicErrorMessage } from '@/lib/errors';

const ACCOUNT_TYPES: ManagedAccountType[] = [
  'dispatcher',
  'responder',
  'civilian',
  'command_center',
];

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    const accountType = body.accountType as ManagedAccountType;
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!uid || !ACCOUNT_TYPES.includes(accountType)) {
      return NextResponse.json({ error: 'uid and a valid accountType are required' }, { status: 400 });
    }

    const account = await resolveManagedAccount(uid, accountType);
    if (account.data.deleted === true) {
      return NextResponse.json(
        { error: 'Deleted accounts cannot be re-enabled. Create a new account instead.' },
        { status: 409 }
      );
    }
    await assertDestructiveAccountActionAllowed({
      uid,
      accountType,
      action: 'enable',
    });
    await setAuthDisabled(uid, false);

    const db = getAdminFirestore();
    if (account.collection === 'dispatchers') {
      await db.doc(`dispatchers/${uid}`).set(
        {
          active: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else if (account.collection === 'users') {
      await db.doc(`users/${uid}`).set(
        {
          disabled: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      await db.doc(`commandCenters/${uid}`).set(
        {
          disabled: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'account.enable',
      targetUid: uid,
      targetLabel: account.label,
      targetCollection: account.collection,
      reason: reason || null,
      metadata: { accountType },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const status = httpErrorStatus(error);
    const message =
      status < 500
        ? (error as Error).message
        : publicErrorMessage(error, 'Account could not be enabled. Refresh and try again.');
    return NextResponse.json({ error: message }, { status });
  }
}
