'use client';

import { useCallback, useMemo } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import type { AgencyOption, AgencyRecord } from '@/lib/agencyTypes';
import { AGENCIES } from '@/lib/agencies';
import { ensureAdminQuery, setAdminQueryData } from '@/lib/adminQueryCache';
import { buildAdminQueryKey, invalidateAdminQueries, useAdminQuery } from './useAdminQuery';

const DIRECTORY_KEY = buildAdminQueryKey('admin:agencies:directory', { activeOnly: false, counts: 0 });

type AgencyListPayload = {
  items: AgencyRecord[];
  total: number;
  pageSize: number;
};

async function fetchAgencyDirectory(activeOnly: boolean) {
  const params = new URLSearchParams({
    page: '1',
    pageSize: '100',
    counts: '0',
    ...(activeOnly ? { activeOnly: '1' } : {}),
  });
  const data = await adminFetch<{ items: AgencyRecord[] }>(`/api/agencies?${params.toString()}`);
  return data.items;
}

export function useAgencies(options?: { activeOnly?: boolean }) {
  const activeOnly = Boolean(options?.activeOnly);
  const key = buildAdminQueryKey('admin:agencies:directory', { activeOnly, counts: 0 });
  const fetcher = useCallback(() => fetchAgencyDirectory(activeOnly), [activeOnly]);
  const { data, error, initialLoading, reload } = useAdminQuery(key, fetcher);

  const optionsList: AgencyOption[] = useMemo(() => {
    if (data && data.length > 0) {
      return data.map((agency) => ({
        value: agency.code,
        code: agency.code,
        label: agency.name,
        isActive: agency.isActive,
      }));
    }
    return activeOnly ? AGENCIES.filter((agency) => agency.isActive) : AGENCIES;
  }, [activeOnly, data]);

  return {
    agencies: data ?? [],
    options: optionsList,
    loading: initialLoading,
    error,
    reload,
  };
}

export function prefetchAgencyDirectory() {
  void ensureAdminQuery(DIRECTORY_KEY, () => fetchAgencyDirectory(false), 60_000).catch(() => undefined);
}

export function invalidateAgencyQueries() {
  invalidateAdminQueries('admin:agencies:');
}

export function useAdminAgenciesList(params: {
  search: string;
  type: string;
  status: string;
  page: number;
}) {
  const listKey = buildAdminQueryKey('admin:agencies:list', params);

  const fetchList = useCallback(async () => {
    const query = new URLSearchParams({
      search: params.search,
      type: params.type,
      status: params.status,
      page: String(params.page),
      pageSize: '25',
      counts: '0',
    });
    return adminFetch<AgencyListPayload>(`/api/agencies?${query.toString()}`);
  }, [params.page, params.search, params.status, params.type]);

  const listQuery = useAdminQuery(listKey, fetchList);

  const patchItem = useCallback(
    (item: AgencyRecord) => {
      const current = listQuery.data;
      if (!current) return;
      const items = current.items.map((row) =>
        row.id === item.id || row.code === item.code ? item : row
      );
      setAdminQueryData<AgencyListPayload>(listKey, { ...current, items });
    },
    [listKey, listQuery.data]
  );

  const refresh = useCallback(async () => {
    // Mark related agency queries stale without wiping listeners/rows, then refetch.
    invalidateAgencyQueries();
    await listQuery.reload();
  }, [listQuery]);

  return {
    items: listQuery.data?.items ?? [],
    total: listQuery.data?.total ?? 0,
    pageSize: listQuery.data?.pageSize ?? 25,
    initialLoading: listQuery.initialLoading,
    refreshing: listQuery.refreshing,
    error: listQuery.error,
    /** Returns the in-flight promise so callers can `await list.reload()`. */
    reload: () => listQuery.reload(),
    invalidate: invalidateAgencyQueries,
    patchItem,
    refresh,
  };
}
