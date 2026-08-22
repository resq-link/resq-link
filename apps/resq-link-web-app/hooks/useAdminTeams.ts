'use client';

import { useCallback } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { buildAdminQueryKey, useAdminQuery } from './useAdminQuery';

type TeamOption = { code: string; label: string };

async function fetchTeams() {
  const data = await adminFetch<{ items: TeamOption[] }>('/api/teams/list');
  return data.items;
}

export function useAdminTeams() {
  const key = buildAdminQueryKey('admin:teams', {});
  const fetcher = useCallback(fetchTeams, []);
  const { data, initialLoading, reload } = useAdminQuery(key, fetcher, 60_000);
  return {
    teams: data ?? [],
    loading: initialLoading,
    reload,
  };
}

export function prefetchAdminTeams() {
  void fetchTeams().catch(() => undefined);
}
