import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import { softDeleteAgency } from '@/lib/server/deleteEntity';
import { httpErrorStatus } from '@/lib/server/accounts';
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
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    const result = await softDeleteAgency({
      code,
      actorUid: auth.auth.uid,
      reason,
    });

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'agency.delete',
      targetUid: result.code,
      targetLabel: `${result.name} (${result.code})`,
      targetCollection: 'agencies',
      reason: reason || null,
      metadata: {
        deletionMethod: result.method,
        wasSeeded: result.wasSeeded,
      },
    });

    return NextResponse.json({
      success: true,
      deletionMethod: result.method,
      code: result.code,
      name: result.name,
    });
  } catch (error: unknown) {
    const status = httpErrorStatus(error);
    const message =
      status < 500
        ? (error as Error).message
        : publicErrorMessage(error, 'Unable to delete agency.');
    return NextResponse.json({ error: message }, { status });
  }
}
