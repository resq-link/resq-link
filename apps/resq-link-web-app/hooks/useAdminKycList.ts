'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { useDebouncedValue } from './useDebouncedValue';
import { buildAdminQueryKey, invalidateAdminQueries, useAdminQuery } from './useAdminQuery';
import type { KycListItem } from '@/lib/accountTypes';

type KycTab = 'pending' | 'approved' | 'rejected';

type KycListResponse = {
  items: KycListItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: { pending: number; approved: number; rejected: number };
};

export function useAdminKycList() {
  const [tab, setTab] = useState<KycTab>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tab]);

  const queryKey = buildAdminQueryKey('admin:kyc', { tab, search: debouncedSearch, page });

  const fetchList = useCallback(async () => {
    const params = new URLSearchParams({
      tab,
      search: debouncedSearch,
      page: String(page),
      pageSize: '25',
    });
    return adminFetch<KycListResponse>(`/api/kyc/list?${params.toString()}`);
  }, [debouncedSearch, page, tab]);

  const { data, error, initialLoading, refreshing, reload } = useAdminQuery(queryKey, fetchList);

  const fetchApplicantMedia = useCallback(async (uid: string) => {
    const response = await adminFetch<{ item: KycListItem }>(`/api/kyc/list?uid=${encodeURIComponent(uid)}`);
    return response.item;
  }, []);

  return {
    tab,
    setTab,
    search,
    setSearch,
    page,
    setPage,
    items: data?.items ?? [],
    counts: data?.counts ?? { pending: 0, approved: 0, rejected: 0 },
    total: data?.total ?? 0,
    pageSize: data?.pageSize ?? 25,
    initialLoading,
    refreshing,
    error,
    reload,
    fetchApplicantMedia,
    invalidate: () => invalidateAdminQueries('admin:kyc:'),
  };
}

export function prefetchKycList() {
  void adminFetch<KycListResponse>('/api/kyc/list?tab=pending&page=1&pageSize=25').catch(() => undefined);
}
