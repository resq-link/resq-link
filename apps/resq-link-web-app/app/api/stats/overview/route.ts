import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { publicErrorMessage } from '@/lib/errors';
import { buildNeedsAttention } from '@/lib/needsAttention';
import { loadDashboardStats, loadRecentActivity } from '@/lib/server/dashboardStats';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const section = new URL(request.url).searchParams.get('section') || 'all';

    if (section === 'activity') {
      const recentActivity = await loadRecentActivity(8);
      return NextResponse.json({ recentActivity });
    }

    if (section === 'stats' || section === 'core') {
      const stats = await loadDashboardStats();
      return NextResponse.json({ stats, attention: buildNeedsAttention(stats) });
    }

    const [stats, recentActivity] = await Promise.all([
      loadDashboardStats(),
      loadRecentActivity(8),
    ]);
    return NextResponse.json({
      stats,
      attention: buildNeedsAttention(stats),
      recentActivity,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to load platform overview. Please try again.') },
      { status: 500 }
    );
  }
}
