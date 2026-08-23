import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAdminEvent } from '@/lib/server/adminEvents';
import { httpErrorStatus, resolveManagedAccount } from '@/lib/server/accounts';
import { assertDestructiveAccountActionAllowed } from '@/lib/server/accountClassification';
import type { ManagedAccountType } from '@/lib/accountTypes';
import { publicErrorMessage } from '@/lib/errors';
import { routes } from '@/lib/routes';

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
    const password = typeof body.password === 'string' ? body.password : '';

    if (!uid || !ACCOUNT_TYPES.includes(accountType)) {
      return NextResponse.json({ error: 'uid and a valid accountType are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const account = await resolveManagedAccount(uid, accountType);
    await assertDestructiveAccountActionAllowed({
      uid,
      accountType,
      action: 'reset_password',
    });
    await getAdminAuth().updateUser(uid, { password });

    const targetUrl =
      accountType === 'dispatcher'
        ? routes.admin.dispatchers
        : accountType === 'responder'
          ? routes.admin.responders
          : accountType === 'civilian'
            ? routes.admin.civilians
            : routes.admin.dashboard;

    await recordAdminEvent({
      audit: {
        actorUid: auth.auth.uid,
        actorEmail: auth.auth.email,
        action: 'account.reset_password',
        targetUid: uid,
        targetLabel: account.label,
        targetCollection: account.collection,
        metadata: { accountType },
      },
      notification: {
        type: 'account.reset_password',
        title: 'Password reset',
        message: `Password was reset for ${account.label}.`,
        targetUrl,
        targetId: uid,
        metadata: { accountType },
        eventKey: `account.reset_password:${uid}:${Date.now()}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const status = httpErrorStatus(error);
    const message =
      status < 500
        ? (error as Error).message
        : publicErrorMessage(error, 'Password could not be reset. Please try again.');
    return NextResponse.json({ error: message }, { status });
  }
}
