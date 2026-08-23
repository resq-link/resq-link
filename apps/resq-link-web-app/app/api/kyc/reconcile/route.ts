import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { archiveOrphanedKycUserDocs, findStaleKycCounterRecords } from '@/lib/server/kycList';
import { publicErrorMessage } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const staleBefore = await findStaleKycCounterRecords();
    const archived = await archiveOrphanedKycUserDocs({ actorUid: auth.auth.uid });
    const staleAfter = await findStaleKycCounterRecords();

    return NextResponse.json({
      ok: true,
      staleBefore,
      staleAfter,
      archived,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to reconcile KYC records. Please try again.') },
      { status: 500 }
    );
  }
}
