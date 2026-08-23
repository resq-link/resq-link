'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Landmark,
  Loader2,
  Radio,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { DeleteConfirmationDialog } from '@/components/admin/DeleteConfirmationDialog';
import { adminFetch } from '@/lib/adminFetch';
import { formatTimeOfDay, notificationDayLabel } from '@/lib/dates';
import { useAdminNotifications, type NotificationFilterKey } from '@/hooks/useAdminNotifications';
import type { AdminNotificationRecord, AdminNotificationType } from '@/lib/adminNotifications';
import { routes } from '@/lib/routes';
import { useToast } from '@/components/ToastProvider';

const FILTERS: { key: NotificationFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'kyc', label: 'KYC' },
  { key: 'operational', label: 'Operational' },
  { key: 'system', label: 'System' },
];

function iconForType(type: AdminNotificationType) {
  switch (type) {
    case 'kyc.submitted':
    case 'kyc.approved':
    case 'kyc.rejected':
    case 'kyc.resubmitted':
      return ShieldCheck;
    case 'incident.reported':
    case 'incident.escalated':
    case 'incident.reassigned':
    case 'incident.attention':
    case 'dispatch.failed':
    case 'push.delivery_failed':
      return Radio;
    case 'account.reset_password':
    case 'system.security':
    case 'system.failure':
    case 'system.notice':
      return Landmark;
    default:
      return Bell;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState<NotificationFilterKey>('all');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<AdminNotificationRecord | null>(null);
  const [clearReadOpen, setClearReadOpen] = useState(false);
  const notifications = useAdminNotifications(filter, 60);

  const grouped = notifications.items.reduce<Map<string, AdminNotificationRecord[]>>((map, item) => {
    const label = notificationDayLabel(item.createdAt);
    const list = map.get(label) || [];
    list.push(item);
    map.set(label, list);
    return map;
  }, new Map());

  const markAllRead = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await adminFetch('/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ all: true }),
      });
      notifications.invalidate();
      await notifications.reload();
      toast.success('All notifications marked as read.');
    } catch (err) {
      toast.error((err as Error).message || 'Unable to update notifications.');
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
        toast.success('Notification marked as read.');
      } catch {
        toast.error('Unable to update notifications.');
      }
    }
    router.push(item.targetUrl || routes.admin.dashboard);
  };

  return (
    <>
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={busy || notifications.initialLoading || notifications.items.every((item) => !item.read)}
              onClick={() => setClearReadOpen(true)}
            >
              <Trash2 size={16} />
              Clear read
            </Button>
            <Button type="button" variant="secondary" disabled={busy || notifications.initialLoading} onClick={() => void markAllRead()}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
              Mark all as read
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-admin-border/80 bg-admin-surface/80 p-1 shadow-sm">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-admin ${
              filter === item.key
                ? 'bg-primary-500/15 text-primary-700 ring-1 ring-inset ring-primary-400/25 dark:text-primary-300'
                : 'text-admin-fg-muted hover:bg-admin-muted'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notifications.error && notifications.items.length === 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800/50 dark:bg-red-950/40">
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Unable to load notifications.</p>
            <p className="mt-0.5 text-sm text-red-700 dark:text-red-300">{notifications.error}</p>
          </div>
          <button
            type="button"
            onClick={() => void notifications.reload()}
            className="rounded-lg border border-red-200 bg-admin-surface px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 dark:border-red-800/50 dark:text-red-200 dark:hover:bg-red-950/60"
          >
            Retry
          </button>
        </div>
      ) : null}

      <section className="rounded-xl border border-admin-border/90 bg-admin-surface shadow-admin-card">
        {notifications.refreshing && notifications.items.length > 0 ? (
          <div className="flex items-center justify-end gap-2 border-b border-admin-border bg-admin-muted/70 px-4 py-1.5 text-[11px] text-admin-fg-subtle">
            <Loader2 size={12} className="animate-spin text-primary-500" />
            Refreshing...
          </div>
        ) : null}

        {notifications.error && notifications.items.length === 0 ? null : notifications.initialLoading &&
          notifications.items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-admin-fg-subtle">
            <Loader2 size={16} className="animate-spin text-primary-500" />
            Loading notifications
          </div>
        ) : notifications.items.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15 text-primary-600 ring-1 ring-primary-500/25 dark:text-primary-300">
              <Bell size={18} aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-admin-fg">
              {filter === 'unread'
                ? 'No unread notifications.'
                : filter === 'all'
                  ? 'No notifications.'
                  : `No ${filter} notifications.`}
            </p>
            <p className="mt-1 text-sm text-admin-fg-subtle">
              {filter === 'unread'
                ? "You're all caught up."
                : 'KYC review, operational alerts, and system warnings appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-admin-border">
            {[...grouped.entries()].map(([day, dayItems]) => (
              <div key={day}>
                <div className="sticky top-0 z-[1] border-b border-admin-border bg-admin-muted/95 px-4 py-2 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-admin-fg-subtle">{day}</p>
                </div>
                <ul>
                  {dayItems.map((item) => {
                    const Icon = iconForType(item.type);
                    return (
                      <li key={item.id} className="group relative">
                        <button
                          type="button"
                          onClick={() => void openItem(item)}
                          className={`flex w-full gap-3 px-4 py-3.5 pr-14 text-left transition-colors duration-admin hover:bg-admin-hover ${
                            item.read ? 'bg-admin-surface' : 'bg-primary-500/10'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              item.read
                                ? 'bg-admin-hover text-admin-fg-subtle'
                                : 'bg-primary-500/15 text-primary-600 ring-1 ring-primary-500/25 dark:text-primary-300'
                            }`}
                          >
                            <Icon size={16} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-3">
                              <span
                                className={`text-sm ${
                                  item.read ? 'font-medium text-admin-fg' : 'font-semibold text-admin-fg'
                                }`}
                              >
                                {item.title}
                              </span>
                              <span className="shrink-0 text-[11px] text-admin-fg-subtle">
                                {formatTimeOfDay(item.createdAt)}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-sm text-admin-fg-subtle">{item.message}</span>
                            <span className="mt-2 flex items-center gap-2 text-[11px]">
                              {!item.read ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/15 px-2 py-0.5 font-medium text-primary-700 ring-1 ring-inset ring-primary-500/25 dark:text-primary-300">
                                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                                  Unread
                                </span>
                              ) : (
                                <span className="text-admin-fg-subtle">Read</span>
                              )}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label="Delete notification"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleting(item);
                          }}
                          className="absolute right-3 top-3 rounded-lg p-2 text-admin-fg-subtle opacity-0 transition-all duration-admin hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100 dark:hover:text-red-400"
                        >
                          <Trash2 size={14} />
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

      <DeleteConfirmationDialog
        open={Boolean(deleting)}
        title="Delete notification?"
        entityName={deleting?.title}
        description="This removes the notification from your inbox only. Underlying account or KYC records are not affected."
        confirmLabel="Delete Notification"
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          setBusy(true);
          try {
            await adminFetch('/api/notifications/delete', {
              method: 'POST',
              body: JSON.stringify({ id: deleting.id }),
            });
            toast.success('Notification deleted.');
            setDeleting(null);
            notifications.invalidate();
            await notifications.reload();
          } catch (error) {
            toast.error((error as Error).message || 'Unable to update notifications.');
          } finally {
            setBusy(false);
          }
        }}
      />

      <DeleteConfirmationDialog
        open={clearReadOpen}
        title="Clear read notifications?"
        description="This permanently removes read notifications from your inbox. Unread notifications are kept."
        confirmLabel="Clear Read"
        busy={busy}
        onClose={() => setClearReadOpen(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            const result = await adminFetch<{ deletedCount: number }>('/api/notifications/delete', {
              method: 'POST',
              body: JSON.stringify({ clearRead: true }),
            });
            toast.success(
              result.deletedCount > 0 ? 'Read notifications cleared.' : 'No read notifications to clear.'
            );
            setClearReadOpen(false);
            notifications.invalidate();
            await notifications.reload();
          } catch (error) {
            toast.error((error as Error).message || 'Unable to update notifications.');
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}
