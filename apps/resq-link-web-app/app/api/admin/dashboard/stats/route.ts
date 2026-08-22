import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { loadDashboardStats } from '@/lib/server/dashboardStats';
import { publicErrorMessage } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const started = Date.now();
  try {
    const hasToken = Boolean(request.headers.get('authorization')?.startsWith('Bearer '));
    if (!hasToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const countsStarted = Date.now();
    const stats = await loadDashboardStats();

    if (process.env.NODE_ENV === 'development') {
      console.info(
        `[admin-dashboard] GET /api/admin/dashboard/stats auth ${countsStarted - started}ms counts ${Date.now() - countsStarted}ms total ${Date.now() - started}ms`
      );
    }

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to load dashboard statistics. Please try again.') },
      { status: 500 }
    );
  }
}
