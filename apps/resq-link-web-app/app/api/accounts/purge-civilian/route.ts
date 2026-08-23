import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import { softDeleteManagedAccount } from '@/lib/server/deleteEntity';
import { httpErrorStatus } from '@/lib/server/accounts';
import { publicErrorMessage } from '@/lib/errors';

/**
 * Purge a civilian by email when the account is hidden (soft-deleted) or Auth-only.
 * Super Admin only. Used to recover emails blocked by orphaned Auth users.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    let uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    if (!uid) {
      const userRecord = await getAdminAuth().getUserByEmail(email);
      uid = userRecord.uid;
    }

    const result = await softDeleteManagedAccount({
      uid,
      accountType: 'civilian',
      actorUid: auth.auth.uid,
      reason: reason || 'Purge civilian by email',
    });

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'account.delete',
      targetUid: uid,
      targetLabel: result.label,
      targetCollection: result.collection,
      reason: reason || 'Purge civilian by email',
      metadata: {
        accountType: 'civilian',
        deletionMethod: result.method,
        email,
        purgeByEmail: true,
        cleanup: result.cleanup || null,
        warnings: result.warnings || null,
      },
    });

    return NextResponse.json({
      success: true,
      uid,
      email,
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
        : publicErrorMessage(error, 'Unable to purge civilian account. Refresh and try again.');
    return NextResponse.json({ error: message }, { status });
  }
}
