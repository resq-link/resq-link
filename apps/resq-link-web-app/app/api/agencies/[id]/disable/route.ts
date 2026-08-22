import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminFirestore } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import { notifySuperAdmins } from '@/lib/server/adminNotifications';
import { mapAgencyDoc } from '@/lib/server/agencies';
import { publicErrorMessage } from '@/lib/errors';
import { routes } from '@/lib/routes';

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

    const current = mapAgencyDoc(code, snap.data() as Record<string, unknown>);
    if (!current.isActive) {
      return NextResponse.json({ success: true, item: current });
    }

    await ref.set(
      {
        isActive: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'agency.disable',
      targetUid: code,
      targetLabel: `${current.name} (${current.code})`,
      targetCollection: 'agencies',
    });

    await notifySuperAdmins({
      type: 'agency.disabled',
      title: 'Agency disabled',
      message: `${current.name} was disabled by Super Admin.`,
      targetUrl: routes.admin.agencies,
      targetId: code,
      excludeUid: auth.auth.uid,
    });

    return NextResponse.json({ success: true, item: { ...current, isActive: false } });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to disable agency.') },
      { status: 500 }
    );
  }
}
