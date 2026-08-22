'use client';

import { useEffect } from 'react';
import { Building2, Headset, Landmark, Radio, ShieldCheck, UserX, Users } from 'lucide-react';
import { StatCard, StatSection } from '@/components/dashboard/StatCard';
import { NeedsAttention } from '@/components/dashboard/NeedsAttention';
import { PersonnelByAgency } from '@/components/dashboard/PersonnelByAgency';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import {
  useDashboardActivity,
  useDashboardPersonnel,
  useDashboardStats,
} from '@/hooks/useDashboardData';
import { buildNeedsAttention } from '@/lib/needsAttention';
import { routes } from '@/lib/routes';

export default function DashboardPage() {
  const {
    data: stats,
    error: statsError,
    loading: statsLoading,
    reload: reloadStats,
  } = useDashboardStats();
  const { data: personnel, loading: personnelLoading } = useDashboardPersonnel();
  const { data: activity, loading: activityLoading } = useDashboardActivity();

  const attention = stats ? buildNeedsAttention(stats) : [];
  const personnelByAgency = personnel?.personnelByAgency ?? [];
  const recentActivity = activity?.recentActivity ?? [];
  const showStatsPlaceholder = statsLoading && stats === undefined;

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (stats) console.info('[admin-dashboard] stats rendered');
  }, [stats]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (personnel) console.info('[admin-dashboard] personnel loaded');
  }, [personnel]);

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
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.045)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_35%,transparent_75%)]" />
        <div className="absolute left-1/4 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary-400/[0.06] blur-3xl" />
        <div className="absolute right-0 top-10 h-48 w-48 rounded-full bg-primary-500/[0.05] blur-3xl" />
      </div>

      {statsError ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{statsError}</p>
          <button
            type="button"
            onClick={() => void reloadStats()}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="space-y-6">
        <StatSection title="People">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              icon={Users}
              loading={showStatsPlaceholder}
              href={routes.admin.civilians}
              value={stats?.civilians.total}
              label="Civilians"
              hint={stats ? `+${stats.civilians.thisMonth} registered this month` : undefined}
            />
            <StatCard
              icon={Radio}
              loading={showStatsPlaceholder}
              href={routes.admin.responders}
              value={stats?.responders.total}
              label="Responders"
              hint={stats ? `${stats.responders.active} active` : undefined}
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

        <StatSection title="Organization & Review">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Building2}
              loading={showStatsPlaceholder}
              href={routes.admin.commandCenters}
              value={stats?.commandCenters.total}
              label="Command Centers"
              hint={stats ? `${stats.commandCenters.active} active` : undefined}
            />
            <StatCard
              icon={Landmark}
              loading={showStatsPlaceholder}
              href={routes.admin.agencies}
              value={stats?.agencies.active}
              label="Active Agencies"
              hint={stats ? `${stats.agencies.total} total` : undefined}
            />
            <StatCard
              icon={ShieldCheck}
              loading={showStatsPlaceholder}
              href={routes.admin.kyc}
              value={stats?.pendingKyc}
              label="Pending KYC"
              hint={stats ? 'Needs review' : undefined}
            />
            <StatCard
              icon={UserX}
              loading={showStatsPlaceholder}
              href={`${routes.admin.dispatchers}?status=disabled`}
              tone="warning"
              value={stats?.disabledAccounts}
              label="Disabled Accounts"
              hint={stats ? 'Across platform accounts' : undefined}
            />
          </div>
        </StatSection>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <NeedsAttention items={attention} loading={showStatsPlaceholder} />
          </div>
          <PersonnelByAgency
            rows={personnelByAgency}
            loading={personnelLoading && personnelByAgency.length === 0}
          />
        </div>

        <RecentActivity
          items={recentActivity}
          loading={activityLoading && recentActivity.length === 0}
        />
      </div>
    </div>
  );
}
