'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ensureAdminQuery,
  getAdminQuerySnapshot,
  invalidateAdminQueryPrefix,
  subscribeAdminQuery,
} from '@/lib/adminQueryCache';

export const ADMIN_QUERY_STALE_MS = 30_000;

export function buildAdminQueryKey(namespace: string, params: Record<string, unknown>): string {
  const sorted = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  return `${namespace}:${JSON.stringify(sorted)}`;
}

export function invalidateAdminQueries(prefix: string) {
  invalidateAdminQueryPrefix(prefix);
}

export function useAdminQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  staleTimeMs = ADMIN_QUERY_STALE_MS,
  enabled = true
) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = subscribeAdminQuery(key, () => setVersion((value) => value + 1));
    void ensureAdminQuery(key, () => fetcherRef.current(), staleTimeMs).catch(() => undefined);
    setVersion((value) => value + 1);
    return unsubscribe;
  }, [enabled, key, staleTimeMs]);

  const snapshot = getAdminQuerySnapshot<T>(key);
  const initialLoading = enabled && snapshot.data === undefined && !snapshot.error;
  const refreshing = enabled && snapshot.isRefreshing;

  return {
    data: snapshot.data,
    error: snapshot.error,
    initialLoading,
    refreshing,
    reload: () =>
      ensureAdminQuery(key, () => fetcherRef.current(), staleTimeMs, true).catch(() => undefined),
  };
}
