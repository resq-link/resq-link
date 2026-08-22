import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import { publicErrorMessage } from '@/lib/errors';

/**
 * Records a password-change audit after the client completes Firebase Auth reauth + updatePassword.
 * Does not accept or store passwords.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'admin.password.change',
      targetUid: auth.auth.uid,
      targetLabel: auth.auth.email || 'Super Administrator',
      targetCollection: 'admins',
      metadata: { method: 'firebase_auth_client' },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to record password change.') },
      { status: 500 }
    );
  }
}
