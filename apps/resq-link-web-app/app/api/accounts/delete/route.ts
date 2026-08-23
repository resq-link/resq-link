import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import { softDeleteManagedAccount } from '@/lib/server/deleteEntity';
import { httpErrorStatus } from '@/lib/server/accounts';
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

    const result = await softDeleteManagedAccount({
      uid,
      accountType,
      actorUid: auth.auth.uid,
      reason,
    });

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'account.delete',
      targetUid: uid,
      targetLabel: result.label,
      targetCollection: result.collection,
      reason: reason || null,
      metadata: {
        accountType,
        deletionMethod: result.method,
        previousActive: result.previousActive,
        email: result.email || null,
        cleanup: result.cleanup || null,
        warnings: result.warnings || null,
      },
    });

    return NextResponse.json({
      success: true,
      deletionMethod: result.method,
      label: result.label,
      warnings: result.warnings || [],
      cleanup: result.cleanup || null,
    });
  } catch (error: unknown) {
    const status = httpErrorStatus(error);
    const message =
      status < 500
        ? (error as Error).message
        : publicErrorMessage(error, 'Unable to delete account. Refresh and try again.');
    return NextResponse.json({ error: message }, { status });
  }
}
