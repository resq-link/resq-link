'use client';

import { useEffect, useRef, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import {
  ensureAdminQuery,
  getAdminQuerySnapshot,
  subscribeAdminQuery,
} from '@/lib/adminQueryCache';
import type { DashboardStats, PersonnelByAgencyRow } from '@/lib/accountTypes';

export const DASHBOARD_STATS_STALE_MS = 30_000;
export const DASHBOARD_STATS_KEY = 'admin:dashboard:stats';
export const DASHBOARD_PERSONNEL_KEY = 'admin:dashboard:personnel';
export const DASHBOARD_ACTIVITY_KEY = 'admin:dashboard:activity';

export type DashboardActivityItem = {
  id: string;
  action: string;
  actorEmail: string | null;
  targetLabel: string | null;
  createdAt: string | null;
};

export type DashboardPersonnelPayload = {
  personnelByAgency: PersonnelByAgencyRow[];
};

export type DashboardActivityPayload = {
  recentActivity: DashboardActivityItem[];
};

export async function fetchDashboardStats(): Promise<DashboardStats> {
  if (process.env.NODE_ENV === 'development') {
    console.info('[admin-dashboard] stats request started');
  }
  const started = Date.now();
  const stats = await adminFetch<DashboardStats>('/api/admin/dashboard/stats');
  if (process.env.NODE_ENV === 'development') {
    console.info(`[admin-dashboard] stats request completed ${Date.now() - started}ms`);
  }
  return stats;
}

export async function fetchDashboardPersonnel(): Promise<DashboardPersonnelPayload> {
  return adminFetch<DashboardPersonnelPayload>('/api/stats/overview?section=personnel');
}

export async function fetchDashboardActivity(): Promise<DashboardActivityPayload> {
  return adminFetch<DashboardActivityPayload>('/api/stats/overview?section=activity');
}

export function prefetchDashboardStats() {
  void ensureAdminQuery(DASHBOARD_STATS_KEY, fetchDashboardStats, DASHBOARD_STATS_STALE_MS).catch(
    () => undefined
  );
}

function useCachedQuery<T>(key: string, fetcher: () => Promise<T>, staleTimeMs: number) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeAdminQuery(key, () => setVersion((value) => value + 1));
    void ensureAdminQuery(key, () => fetcherRef.current(), staleTimeMs).catch(() => undefined);
    setVersion((value) => value + 1);
    return unsubscribe;
  }, [key, staleTimeMs]);

  const snapshot = getAdminQuerySnapshot<T>(key);
  return {
    data: snapshot.data,
    error: snapshot.error,
    loading: snapshot.data === undefined && !snapshot.error,
    isRefreshing: snapshot.isRefreshing,
    reload: () =>
      ensureAdminQuery(key, () => fetcherRef.current(), staleTimeMs, true).catch(() => undefined),
  };
}

export function useDashboardStats() {
  return useCachedQuery(DASHBOARD_STATS_KEY, fetchDashboardStats, DASHBOARD_STATS_STALE_MS);
}

export function useDashboardPersonnel() {
  return useCachedQuery(DASHBOARD_PERSONNEL_KEY, fetchDashboardPersonnel, DASHBOARD_STATS_STALE_MS);
}

export function useDashboardActivity() {
  return useCachedQuery(DASHBOARD_ACTIVITY_KEY, fetchDashboardActivity, DASHBOARD_STATS_STALE_MS);
}
