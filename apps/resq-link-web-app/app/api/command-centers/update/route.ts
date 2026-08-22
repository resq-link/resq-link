import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminFirestore } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import { notifySuperAdmins } from '@/lib/server/adminNotifications';
import { asString, httpErrorStatus, resolveManagedAccount } from '@/lib/server/accounts';
import { publicErrorMessage } from '@/lib/errors';
import { routes } from '@/lib/routes';

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    if (!uid) {
      return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    }

    const account = await resolveManagedAccount(uid, 'command_center');
    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    const name = optionalString(body.name);
    const location = optionalString(body.location);
    if (name) {
      changes.name = { from: asString(account.data.name), to: name };
      updates.name = name;
    }
    if (location) {
      changes.location = { from: asString(account.data.location), to: location };
      updates.location = location;
    }

    if (!name && !location) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await getAdminFirestore().doc(`commandCenters/${uid}`).set(updates, { merge: true });

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'command_center.update',
      targetUid: uid,
      targetLabel: name || account.label,
      targetCollection: 'commandCenters',
      metadata: { changes },
    });

    await notifySuperAdmins({
      type: 'command_center.updated',
      title: 'Command center updated',
      message: `${name || account.label} was updated.`,
      targetUrl: routes.admin.commandCenters,
      targetId: uid,
      excludeUid: auth.auth.uid,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const status = httpErrorStatus(error);
    const message =
      status < 500
        ? (error as Error).message
        : publicErrorMessage(error, 'Command center could not be updated. Please try again.');
    return NextResponse.json({ error: message }, { status });
  }
}
