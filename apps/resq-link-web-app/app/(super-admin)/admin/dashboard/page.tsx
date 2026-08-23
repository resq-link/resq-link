'use client';

import { useEffect } from 'react';
import { Headset, Landmark, ShieldCheck, Users } from 'lucide-react';
import { StatCard, StatSection } from '@/components/dashboard/StatCard';
import { NeedsAttention } from '@/components/dashboard/NeedsAttention';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { useDashboardActivity, useDashboardStats } from '@/hooks/useDashboardData';
import { buildNeedsAttention } from '@/lib/needsAttention';
import { routes } from '@/lib/routes';

export default function DashboardPage() {
  const {
    data: stats,
    error: statsError,
    loading: statsLoading,
    reload: reloadStats,
  } = useDashboardStats();
  const { data: activity, loading: activityLoading } = useDashboardActivity();

  const attention = stats ? buildNeedsAttention(stats) : [];
  const recentActivity = activity?.recentActivity ?? [];
  const showStatsPlaceholder = statsLoading && stats === undefined;

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (stats) console.info('[admin-dashboard] stats rendered');
  }, [stats]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (activity) console.info('[admin-dashboard] activity loaded');
  }, [activity]);

  return (
    <div className="relative isolate">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-6 -z-10 h-[28rem] overflow-hidden"
      >
        <div className="absolute left-1/4 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary-400/[0.06] blur-3xl" />
        <div className="absolute right-0 top-10 h-48 w-48 rounded-full bg-primary-500/[0.05] blur-3xl" />
      </div>

      {statsError ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-200">
          <p>{statsError}</p>
          <button
            type="button"
            onClick={() => void reloadStats()}
            className="rounded-lg border border-red-200 bg-admin-surface px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 dark:border-red-800/50 dark:text-red-200 dark:hover:bg-red-950/60"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="space-y-6">
        <StatSection title="Operations">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Users}
              loading={showStatsPlaceholder}
              href={routes.admin.civilians}
              value={stats?.civilians.total}
              label="Civilian Users"
              hint={stats ? `+${stats.civilians.thisMonth} registered this month` : undefined}
            />
            <StatCard
              icon={Landmark}
              loading={showStatsPlaceholder}
              href={routes.admin.agencies}
              value={stats?.agencies.active}
              label="Response Agencies"
              hint={stats ? `${stats.agencies.total} total` : undefined}
            />
            <StatCard
              icon={ShieldCheck}
              loading={showStatsPlaceholder}
              href={routes.admin.kyc}
              value={stats?.pendingKyc}
              label="KYC Pending"
              hint={stats ? 'Needs review' : undefined}
            />
            <StatCard
              icon={Headset}
              loading={showStatsPlaceholder}
              href={routes.admin.dispatchers}
              value={stats?.dispatchers.total}
              label="Dispatchers"
              hint={stats ? `${stats.dispatchers.active} active` : undefined}
            />
          </div>
        </StatSection>

        <NeedsAttention items={attention} loading={showStatsPlaceholder} />

        <RecentActivity
          items={recentActivity}
          loading={activityLoading && recentActivity.length === 0}
        />
      </div>
    </div>
  );
}
