import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { countKycBuckets, getKycApplicant, listKycSubmissions } from '@/lib/server/kycList';
import { publicErrorMessage } from '@/lib/errors';
import type { KycTab } from '@/lib/server/kycList';

export const dynamic = 'force-dynamic';

function readTab(value: string | null): KycTab {
  if (value === 'approved' || value === 'rejected') return value;
  return 'pending';
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const uid = (searchParams.get('uid') || '').trim();
    if (uid) {
      const item = await getKycApplicant(uid);
      if (!item) {
        return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
      }
      return NextResponse.json({ item });
    }

    const [list, counts] = await Promise.all([
      listKycSubmissions({
        tab: readTab(searchParams.get('tab')),
        search: searchParams.get('search') || '',
        page: Number(searchParams.get('page') || '1'),
        pageSize: Number(searchParams.get('pageSize') || '25'),
        includeMedia: searchParams.get('includeMedia') === '1',
      }),
      countKycBuckets(),
    ]);

    return NextResponse.json({ ...list, counts });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to load KYC submissions. Please try again.') },
      { status: 500 }
    );
  }
}
