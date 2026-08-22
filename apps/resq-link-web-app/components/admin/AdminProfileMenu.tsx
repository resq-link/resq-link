'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { LogOut, Settings } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { routes } from '@/lib/routes';

const MENU_WIDTH = 208;
const SIDE_OFFSET = 8;
const VIEWPORT_PADDING = 8;

function initialsFromEmail(email: string | null | undefined): string {
  // Prefer a stable Super Admin mark in the top bar.
  if (!email) return 'SA';
  const local = email.split('@')[0] || '';
  if (/admin|super/i.test(local)) return 'SA';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase().slice(0, 2) || 'SA';
  }
  return local.slice(0, 2).toUpperCase() || 'SA';
}

export function AdminProfileMenu() {
  const { user, signOut } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const initials = initialsFromEmail(user?.email);

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
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const rect = trigger.getBoundingClientRect();
      const height = menu.offsetHeight || 160;
      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING - SIDE_OFFSET;
      const openUp = spaceBelow < height && rect.top > spaceBelow;
      let top = openUp ? rect.top - SIDE_OFFSET - height : rect.bottom + SIDE_OFFSET;
      top = Math.max(VIEWPORT_PADDING, Math.min(top, window.innerHeight - height - VIEWPORT_PADDING));
      let left = rect.right - MENU_WIDTH;
      left = Math.max(VIEWPORT_PADDING, Math.min(left, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING));
      setCoords({ top, left });
    };
    place();
    const frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
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

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Account menu"
            style={{
              position: 'fixed',
              top: coords?.top ?? 0,
              left: coords?.left ?? 0,
              width: MENU_WIDTH,
              visibility: coords ? 'visible' : 'hidden',
              zIndex: 55,
            }}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-admin-panel animate-admin-menu-in"
          >
            <div className="border-b border-slate-100 px-3 py-2.5">
              <p className="text-xs font-medium text-slate-500">Signed in as</p>
              <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{user?.email || 'Super Admin'}</p>
            </div>
            <Link
              href={routes.admin.settings}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition-colors duration-admin hover:bg-primary-50/60"
            >
              <Settings size={15} aria-hidden="true" className="text-slate-400" />
              Settings
            </Link>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-700 transition-colors duration-admin hover:bg-red-50"
            >
              <LogOut size={15} aria-hidden="true" />
              Sign Out
            </button>
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
        aria-controls={open ? menuId : undefined}
        aria-label="Open account menu"
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-[11px] font-semibold tracking-wide text-white shadow-sm ring-2 ring-primary-100 transition-all duration-admin hover:bg-primary-600 hover:ring-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2"
      >
        {initials}
      </button>
      {menu}
    </div>
  );
}
