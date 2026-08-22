import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { listAuditLogs } from '@/lib/server/auditList';
import { publicErrorMessage } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const result = await listAuditLogs({
      search: searchParams.get('search') || '',
      action: searchParams.get('action') || '',
      targetType: searchParams.get('targetType') || '',
      page: Number(searchParams.get('page') || '1'),
      pageSize: Number(searchParams.get('pageSize') || '25'),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to load audit logs. Please try again.') },
      { status: 500 }
    );
  }
}
