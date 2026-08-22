'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { useDebouncedValue } from './useDebouncedValue';
import { buildAdminQueryKey, invalidateAdminQueries, useAdminQuery } from './useAdminQuery';
import type { AuditLogRecord, PaginatedResponse } from '@/lib/accountTypes';

export function useAdminAuditLogs() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [targetType, setTargetType] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, action, targetType]);

  const queryKey = buildAdminQueryKey('admin:audit', {
    search: debouncedSearch,
    action,
    targetType,
    page,
  });

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams({
      search: debouncedSearch,
      page: String(page),
      pageSize: '25',
      ...(action !== 'all' ? { action } : {}),
      ...(targetType !== 'all' ? { targetType } : {}),
    });
    return adminFetch<PaginatedResponse<AuditLogRecord>>(`/api/audit?${params.toString()}`);
  }, [action, debouncedSearch, page, targetType]);

  const { data, error, initialLoading, refreshing, reload } = useAdminQuery(queryKey, fetchLogs);

  return {
    search,
    setSearch,
    action,
    setAction,
    targetType,
    setTargetType,
    page,
    setPage,
    items: data?.items ?? [],
    total: data?.total ?? 0,
    pageSize: data?.pageSize ?? 25,
    initialLoading,
    refreshing,
    error,
    reload,
    invalidate: () => invalidateAdminQueries('admin:audit:'),
  };
}
