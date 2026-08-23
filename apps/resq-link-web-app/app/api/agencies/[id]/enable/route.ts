import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminFirestore } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import { mapAgencyDoc } from '@/lib/server/agencies';
import { publicErrorMessage } from '@/lib/errors';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const code = decodeURIComponent(id).trim().toUpperCase();
    const ref = getAdminFirestore().doc(`agencies/${code}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }
    if (snap.data()?.deleted === true) {
      return NextResponse.json(
        { error: 'Deleted agencies cannot be re-enabled. Create a new agency instead.' },
        { status: 409 }
      );
    }

    const current = mapAgencyDoc(code, snap.data() as Record<string, unknown>);
    if (current.isActive) {
      return NextResponse.json({ success: true, item: current });
    }

    await ref.set(
      {
        isActive: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'agency.enable',
      targetUid: code,
      targetLabel: `${current.name} (${current.code})`,
      targetCollection: 'agencies',
    });

    return NextResponse.json({ success: true, item: { ...current, isActive: true } });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to enable agency.') },
      { status: 500 }
    );
  }
}
