'use client';

import { useCallback } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { buildAdminQueryKey, invalidateAdminQueries, useAdminQuery } from './useAdminQuery';
import type { AdminNotificationCategory, AdminNotificationRecord } from '@/lib/adminNotifications';

export type NotificationFilterKey = 'all' | 'unread' | AdminNotificationCategory;

type NotificationResponse = {
  items: AdminNotificationRecord[];
  unreadCount: number;
};

export function useAdminNotifications(filter: NotificationFilterKey, limit = 60) {
  const queryKey = buildAdminQueryKey('admin:notifications', { filter, limit });

  const fetchNotifications = useCallback(async () => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (filter === 'unread') params.set('unread', '1');
    if (filter === 'kyc' || filter === 'accounts' || filter === 'system') {
      params.set('category', filter);
    }
    return adminFetch<NotificationResponse>(`/api/notifications?${params.toString()}`);
  }, [filter, limit]);

  const { data, error, initialLoading, refreshing, reload } = useAdminQuery(queryKey, fetchNotifications);

  return {
    items: data?.items ?? [],
    unreadCount: data?.unreadCount ?? 0,
    initialLoading,
    refreshing,
    error,
    reload,
    invalidate: () => invalidateAdminQueries('admin:notifications:'),
  };
}

export function useAdminNotificationPreview() {
  return useAdminNotifications('all', 5);
}
