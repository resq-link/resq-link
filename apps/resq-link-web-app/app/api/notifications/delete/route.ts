import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import { deleteAdminNotifications } from '@/lib/server/deleteEntity';
import { httpErrorStatus } from '@/lib/server/accounts';
import { publicErrorMessage } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((value: unknown): value is string => typeof value === 'string')
      : undefined;
    const clearRead = body.clearRead === true;
    const id = typeof body.id === 'string' ? body.id.trim() : '';

    const result = await deleteAdminNotifications({
      recipientUid: auth.auth.uid,
      ids: id ? [id] : ids,
      clearRead,
    });

    if (result.deletedCount > 0) {
      await recordAudit({
        actorUid: auth.auth.uid,
        actorEmail: auth.auth.email,
        action: 'notification.delete',
        targetCollection: 'adminNotifications',
        targetLabel: clearRead ? 'Cleared read notifications' : 'Deleted notification(s)',
        metadata: {
          deletionMethod: 'hard_delete',
          deletedCount: result.deletedCount,
          clearRead,
          ids: id ? [id] : ids || null,
        },
      });
    }

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error: unknown) {
    const status = httpErrorStatus(error);
    const message =
      status < 500
        ? (error as Error).message
        : publicErrorMessage(error, 'Unable to delete notification(s).');
    return NextResponse.json({ error: message }, { status });
  }
}
