import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { countPersonnelByAgencyCode } from '@/lib/server/agencies';
import { publicErrorMessage } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const counts = await countPersonnelByAgencyCode();
    return NextResponse.json({ counts });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to load agency personnel counts.') },
      { status: 500 }
    );
  }
}
