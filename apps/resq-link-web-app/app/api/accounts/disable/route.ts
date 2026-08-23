import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminFirestore } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import {
  assertNotSuperAdmin,
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
    if (!reason) {
      return NextResponse.json({ error: 'A reason is required to disable an account' }, { status: 400 });
    }

    await assertNotSuperAdmin(uid);
    const gate = await assertDestructiveAccountActionAllowed({
      uid,
      accountType,
      action: 'disable',
    });
    const account = await resolveManagedAccount(uid, accountType);

    try {
      await setAuthDisabled(uid, true);
    } catch (error: unknown) {
      if (httpErrorStatus(error) !== 404) throw error;
    }

    const db = getAdminFirestore();
    if (account.collection === 'dispatchers') {
      await db.doc(`dispatchers/${uid}`).set(
        {
          active: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else if (account.collection === 'users') {
      await db.doc(`users/${uid}`).set(
        {
          disabled: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      await db.doc(`commandCenters/${uid}`).set(
        {
          disabled: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'account.disable',
      targetUid: uid,
      targetLabel: account.label,
      targetCollection: account.collection,
      reason,
      metadata: {
        accountType,
        previousActive: true,
        detectedRole: gate.detectedRole,
        email: gate.email,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const status = httpErrorStatus(error);
    const message =
      status < 500
        ? (error as Error).message
        : publicErrorMessage(
            error,
            'Account could not be disabled. The account may have changed. Refresh and try again.'
          );
    return NextResponse.json({ error: message }, { status });
  }
}
