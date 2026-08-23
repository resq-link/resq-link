'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Landmark,
  Loader2,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { adminFetch } from '@/lib/adminFetch';
import { formatRelativeTime } from '@/lib/dates';
import { routes } from '@/lib/routes';
import { useAdminNotificationPreview } from '@/hooks/useAdminNotifications';
import type { AdminNotificationRecord, AdminNotificationType } from '@/lib/adminNotifications';

const PANEL_WIDTH = 360;
const SIDE_OFFSET = 8;
const VIEWPORT_PADDING = 8;

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

export function AdminNotificationBell() {
  const router = useRouter();
  const preview = useAdminNotificationPreview();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; maxHeight?: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const items = preview.items;
  const unreadCount = preview.unreadCount;
  const loading = preview.initialLoading;
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const place = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
      let left = rect.right - width;
      left = Math.max(VIEWPORT_PADDING, Math.min(left, window.innerWidth - width - VIEWPORT_PADDING));

      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING - SIDE_OFFSET;
      const preferredHeight = Math.min(panel.scrollHeight, 420);
      const openUp = spaceBelow < preferredHeight && rect.top > spaceBelow;
      let top = openUp ? rect.top - SIDE_OFFSET - preferredHeight : rect.bottom + SIDE_OFFSET;
      top = Math.max(VIEWPORT_PADDING, Math.min(top, window.innerHeight - VIEWPORT_PADDING - 120));
      const maxHeight = Math.min(
        420,
        openUp ? rect.top - VIEWPORT_PADDING - SIDE_OFFSET : window.innerHeight - top - VIEWPORT_PADDING
      );

      setCoords({ top, left, maxHeight });
    };
    place();
    const frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [open, items, loading]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const markRead = async (id: string) => {
    try {
      await adminFetch('/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
    } catch {
      // Navigation still proceeds; realtime listener will reconcile.
    }
  };

  const openNotification = async (item: AdminNotificationRecord) => {
    if (!item.read) await markRead(item.id);
    setOpen(false);
    router.push(item.targetUrl || routes.admin.notifications);
  };

  const panel =
    open && mounted
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="menu"
            aria-label="Notifications"
            style={{
              position: 'fixed',
              top: coords?.top ?? 0,
              left: coords?.left ?? 0,
              width: Math.min(PANEL_WIDTH, typeof window !== 'undefined' ? window.innerWidth - 16 : PANEL_WIDTH),
              maxHeight: coords?.maxHeight,
              visibility: coords ? 'visible' : 'hidden',
              zIndex: 55,
            }}
            className="flex flex-col overflow-hidden rounded-xl border border-admin-border bg-admin-surface shadow-admin-panel animate-admin-menu-in"
          >
            <div className="flex items-center justify-between border-b border-admin-border px-4 py-3">
              <p className="text-sm font-semibold text-admin-fg">Notifications</p>
              <Link
                href={routes.admin.notifications}
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-primary-600 transition-colors duration-admin hover:text-primary-700"
              >
                View all
              </Link>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-admin-fg-subtle">
                  <Loader2 size={16} className="animate-spin text-primary-500" />
                  Loading
                </div>
              ) : preview.error && items.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-red-600">{preview.error}</div>
              ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-admin-fg-subtle">No new notifications.</div>
              ) : (
                <ul className="divide-y divide-admin-border">
                  {items.map((item) => {
                    const Icon = iconForType(item.type);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => void openNotification(item)}
                          className={`flex w-full gap-3 px-4 py-3 text-left transition-colors duration-admin hover:bg-admin-hover ${
                            item.read ? 'bg-admin-surface' : 'bg-primary-500/10'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              item.read
                                ? 'bg-admin-hover text-admin-fg-subtle'
                                : 'bg-primary-500/15 text-primary-600 ring-1 ring-primary-500/25 dark:text-primary-300'
                            }`}
                          >
                            <Icon size={15} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start gap-2">
                              <span
                                className={`block truncate text-sm ${
                                  item.read ? 'font-medium text-admin-fg' : 'font-semibold text-admin-fg'
                                }`}
                              >
                                {item.title}
                              </span>
                              {!item.read ? (
                                <span
                                  aria-label="Unread"
                                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500"
                                />
                              ) : null}
                            </span>
                            <span className="mt-0.5 line-clamp-2 block text-xs text-admin-fg-subtle">{item.message}</span>
                            <span className="mt-1 block text-[11px] text-admin-fg-subtle">
                              {formatRelativeTime(item.createdAt)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-admin-border p-2">
              <Link
                href={routes.admin.notifications}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-primary-600 transition-colors duration-admin hover:bg-admin-hover dark:text-primary-400"
              >
                View all notifications
              </Link>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-lg p-2 text-admin-fg-muted transition-colors duration-admin hover:bg-admin-hover hover:text-admin-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
      >
        <Bell size={18} aria-hidden="true" />
        {loading ? (
          <span className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-admin-fg-subtle/50" aria-hidden="true" />
        ) : unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-semibold leading-none text-white">
            {badgeLabel}
          </span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}
