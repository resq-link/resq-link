'use client';

import { adminFetch } from '@/lib/adminFetch';
import { ensureAdminQuery } from '@/lib/adminQueryCache';
import { buildAdminQueryKey } from './useAdminQuery';
import { prefetchAgencyDirectory } from './useAgencies';

const STALE_MS = 30_000;

export function prefetchAdminTables() {
  const accountTypes = ['dispatchers', 'responders', 'civilians'] as const;
  for (const type of accountTypes) {
    const key = buildAdminQueryKey(`admin:accounts:${type}`, {
      search: '',
      page: 1,
      pageSize: 25,
    });
    void ensureAdminQuery(
      key,
      () => adminFetch(`/api/accounts/list?type=${type}&search=&page=1&pageSize=25`),
      STALE_MS
    ).catch(() => undefined);
  }

  void ensureAdminQuery(
    buildAdminQueryKey('admin:kyc', { tab: 'pending', search: '', page: 1 }),
    () => adminFetch('/api/kyc/list?tab=pending&page=1&pageSize=25'),
    STALE_MS
  ).catch(() => undefined);

  prefetchAgencyDirectory();
}
