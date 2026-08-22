'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Building2,
  Headset,
  Landmark,
  Loader2,
  Radio,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { adminFetch } from '@/lib/adminFetch';
import { formatRelativeTime } from '@/lib/dates';
import { routes } from '@/lib/routes';
import type { AdminNotificationRecord, AdminNotificationType } from '@/lib/adminNotifications';

const PANEL_WIDTH = 360;
const SIDE_OFFSET = 8;
const VIEWPORT_PADDING = 8;
const POLL_MS = 45000;

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

export function AdminNotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<AdminNotificationRecord[]>([]);
  const [coords, setCoords] = useState<{ top: number; left: number; maxHeight?: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const refreshUnread = useCallback(async () => {
    try {
      const data = await adminFetch<{ items: AdminNotificationRecord[]; unreadCount: number }>(
        '/api/notifications?preview=1&limit=5'
      );
      setUnreadCount(data.unreadCount);
      if (!open) setItems(data.items);
    } catch {
      // Keep last known state; avoid noisy UI on background poll failures.
    } finally {
      setLoading(false);
    }
  }, [open]);

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const data = await adminFetch<{ items: AdminNotificationRecord[]; unreadCount: number }>(
        '/api/notifications?preview=1&limit=5'
      );
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      setItems([]);
    } finally {
      setPreviewLoading(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void refreshUnread();
    const timer = window.setInterval(() => {
      void refreshUnread();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [refreshUnread]);

  useEffect(() => {
    if (open) void loadPreview();
  }, [open, loadPreview]);

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
  }, [open, items, previewLoading]);

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
      setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      // Navigation still proceeds.
    }
  };

  const openNotification = async (item: AdminNotificationRecord) => {
    if (!item.read) await markRead(item.id);
    setOpen(false);
    router.push(item.targetUrl || routes.admin.notifications);
  };

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

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
            className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-admin-panel animate-admin-menu-in"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <Link
                href={routes.admin.notifications}
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-primary-600 transition-colors duration-admin hover:text-primary-700"
              >
                View all
              </Link>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {previewLoading && items.length === 0 ? (
                <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin text-primary-500" />
                  Loading
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">No new notifications.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const Icon = iconForType(item.type);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => void openNotification(item)}
                          className={`flex w-full gap-3 px-4 py-3 text-left transition-colors duration-admin hover:bg-primary-50/50 ${
                            item.read ? 'bg-white' : 'bg-primary-50/40'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              item.read
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-primary-100 text-primary-700 ring-1 ring-primary-200'
                            }`}
                          >
                            <Icon size={15} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start gap-2">
                              <span
                                className={`block truncate text-sm ${
                                  item.read ? 'font-medium text-slate-800' : 'font-semibold text-slate-900'
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
                            <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{item.message}</span>
                            <span className="mt-1 block text-[11px] text-slate-400">
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

            <div className="border-t border-slate-100 p-2">
              <Link
                href={routes.admin.notifications}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-primary-600 transition-colors duration-admin hover:bg-primary-50"
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
        className="relative rounded-lg p-2 text-slate-600 transition-colors duration-admin hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
      >
        <Bell size={18} aria-hidden="true" />
        {loading ? (
          <span className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-slate-300" aria-hidden="true" />
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
