'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Building2,
  CheckCheck,
  Headset,
  Landmark,
  Loader2,
  Radio,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { adminFetch } from '@/lib/adminFetch';
import { formatTimeOfDay, notificationDayLabel } from '@/lib/dates';
import { useAdminNotifications, type NotificationFilterKey } from '@/hooks/useAdminNotifications';
import type { AdminNotificationRecord, AdminNotificationType } from '@/lib/adminNotifications';
import { routes } from '@/lib/routes';

const FILTERS: { key: NotificationFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'kyc', label: 'KYC' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'system', label: 'System' },
];

function iconForType(type: AdminNotificationType) {
  switch (type) {
    case 'kyc.submitted':
      return ShieldCheck;
    case 'account.created.dispatcher':
      return Headset;
    case 'account.created.responder':
      return Radio;
    case 'account.created.civilian':
      return Users;
    case 'account.created.command_center':
    case 'command_center.updated':
      return Building2;
    case 'agency.created':
    case 'agency.updated':
    case 'agency.disabled':
    case 'agency.enabled':
      return Landmark;
    default:
      return UserRound;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<NotificationFilterKey>('all');
  const [busy, setBusy] = useState(false);
  const notifications = useAdminNotifications(filter, 60);

  const grouped = notifications.items.reduce<Map<string, AdminNotificationRecord[]>>((map, item) => {
    const label = notificationDayLabel(item.createdAt);
    const list = map.get(label) || [];
    list.push(item);
    map.set(label, list);
    return map;
  }, new Map());

  const markAllRead = async () => {
    setBusy(true);
    try {
      await adminFetch('/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ all: true }),
      });
      notifications.invalidate();
      await notifications.reload();
    } catch (err) {
      notifications.reload();
    } finally {
      setBusy(false);
    }
  };

  const openItem = async (item: AdminNotificationRecord) => {
    if (!item.read) {
      try {
        await adminFetch('/api/notifications/mark-read', {
          method: 'POST',
          body: JSON.stringify({ id: item.id }),
        });
        notifications.invalidate();
        void notifications.reload();
      } catch {
        // Still navigate.
      }
    }
    router.push(item.targetUrl || routes.admin.dashboard);
  };

  return (
    <>
      <PageHeader
        actions={
          <Button type="button" variant="secondary" disabled={busy || notifications.initialLoading} onClick={() => void markAllRead()}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
            Mark all as read
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-slate-200/80 bg-white/80 p-1 shadow-sm">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-admin ${
              filter === item.key
                ? 'bg-primary-500/15 text-primary-700 ring-1 ring-inset ring-primary-400/25'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notifications.error ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm text-red-700">{notifications.error}</p>
          <button
            type="button"
            onClick={() => void notifications.reload()}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200/90 bg-white shadow-admin-card">
        {notifications.refreshing && notifications.items.length > 0 ? (
          <div className="flex items-center justify-end gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-1.5 text-[11px] text-slate-500">
            <Loader2 size={12} className="animate-spin text-primary-500" />
            Refreshing...
          </div>
        ) : null}

        {notifications.initialLoading && notifications.items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin text-primary-500" />
            Loading notifications
          </div>
        ) : notifications.items.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
              <Bell size={18} aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-slate-800">
              {filter === 'unread'
                ? 'No unread notifications.'
                : filter === 'all'
                  ? 'No notifications.'
                  : `No ${filter} notifications.`}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {filter === 'unread'
                ? "You're all caught up."
                : 'Administrative account and verification activity will appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {[...grouped.entries()].map(([day, dayItems]) => (
              <div key={day}>
                <div className="sticky top-0 z-[1] border-b border-slate-100 bg-slate-50/95 px-4 py-2 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{day}</p>
                </div>
                <ul>
                  {dayItems.map((item) => {
                    const Icon = iconForType(item.type);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => void openItem(item)}
                          className={`flex w-full gap-3 px-4 py-3.5 text-left transition-colors duration-admin hover:bg-primary-50/40 ${
                            item.read ? 'bg-white' : 'bg-primary-50/35'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              item.read
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-primary-100 text-primary-700 ring-1 ring-primary-200'
                            }`}
                          >
                            <Icon size={16} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-3">
                              <span
                                className={`text-sm ${
                                  item.read ? 'font-medium text-slate-800' : 'font-semibold text-slate-900'
                                }`}
                              >
                                {item.title}
                              </span>
                              <span className="shrink-0 text-[11px] text-slate-400">
                                {formatTimeOfDay(item.createdAt)}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-sm text-slate-500">{item.message}</span>
                            <span className="mt-2 flex items-center gap-2 text-[11px]">
                              {!item.read ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2 py-0.5 font-medium text-primary-700 ring-1 ring-inset ring-primary-200">
                                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                                  Unread
                                </span>
                              ) : (
                                <span className="text-slate-400">Read</span>
                              )}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
