'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { useDebouncedValue } from './useDebouncedValue';
import { buildAdminQueryKey, invalidateAdminQueries, useAdminQuery } from './useAdminQuery';
import type { AccountListType, PaginatedResponse } from '@/lib/accountTypes';

export function useAccountList<T>(type: AccountListType, extraParams?: Record<string, string>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const extraKey = JSON.stringify(extraParams ?? {});

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, extraKey]);

  const queryKey = useMemo(() => {
    const extras = extraKey ? (JSON.parse(extraKey) as Record<string, string>) : {};
    return buildAdminQueryKey(`admin:accounts:${type}`, {
      search: debouncedSearch,
      page,
      pageSize: 25,
      ...extras,
    });
  }, [type, debouncedSearch, page, extraKey]);

  const fetchPage = useCallback(async () => {
    const extras = extraKey ? (JSON.parse(extraKey) as Record<string, string>) : {};
    const params = new URLSearchParams({
      type,
      search: debouncedSearch,
      page: String(page),
      pageSize: '25',
      ...extras,
    });
    return adminFetch<PaginatedResponse<T>>(`/api/accounts/list?${params.toString()}`);
  }, [type, debouncedSearch, page, extraKey]);

  const { data, error, initialLoading, refreshing, reload } = useAdminQuery(queryKey, fetchPage);

  const invalidateType = useCallback(() => {
    invalidateAdminQueries(`admin:accounts:${type}:`);
  }, [type]);

  return {
    search,
    setSearch,
    page,
    setPage,
    items: data?.items ?? [],
    total: data?.total ?? 0,
    pageSize: data?.pageSize ?? 25,
    initialLoading,
    refreshing,
    loading: initialLoading,
    error,
    reload,
    invalidateType,
  };
}
