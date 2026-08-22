import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { listManagedAccounts } from '@/lib/server/accountList';
import { publicErrorMessage } from '@/lib/errors';
import type { AccountListType } from '@/lib/accountTypes';

export const dynamic = 'force-dynamic';

const LIST_TYPES: AccountListType[] = ['dispatchers', 'responders', 'civilians', 'command-centers'];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as AccountListType;
    if (!LIST_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid account type' }, { status: 400 });
    }

    const result = await listManagedAccounts({
      type,
      search: searchParams.get('search') || '',
      agency: searchParams.get('agency') || '',
      status: searchParams.get('status') || '',
      verification: searchParams.get('verification') || '',
      page: Number(searchParams.get('page') || '1'),
      pageSize: Number(searchParams.get('pageSize') || '25'),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to load accounts. Please try again.') },
      { status: 500 }
    );
  }
}
