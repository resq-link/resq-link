'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

export interface AdminActionMenuItem {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}

const MENU_WIDTH = 192;
const SIDE_OFFSET = 4;
const VIEWPORT_PADDING = 8;

type MenuCoords = {
  top: number;
  left: number;
  maxHeight?: number;
};

function getMenuCoords(trigger: DOMRect, menuHeight: number): MenuCoords {
  const spaceBelow = window.innerHeight - trigger.bottom - VIEWPORT_PADDING - SIDE_OFFSET;
  const spaceAbove = trigger.top - VIEWPORT_PADDING - SIDE_OFFSET;
  const openUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;

  let top: number;
  let maxHeight: number | undefined;

  if (openUpward) {
    const height = Math.min(menuHeight, Math.max(spaceAbove, 0));
    top = trigger.top - SIDE_OFFSET - height;
    if (height < menuHeight) maxHeight = height;
  } else {
    const height = Math.min(menuHeight, Math.max(spaceBelow, 120));
    top = trigger.bottom + SIDE_OFFSET;
    if (height < menuHeight) maxHeight = height;
  }

  top = Math.max(VIEWPORT_PADDING, Math.min(top, window.innerHeight - VIEWPORT_PADDING - 48));

  // align="end": right edges of trigger and menu line up
  let left = trigger.right - MENU_WIDTH;
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING)
  );

  return { top, left, maxHeight };
}

/**
 * Portaled Super Admin row actions menu.
 * Renders into document.body so DataTable overflow wrappers cannot clip it.
 */
export function AdminActionMenu({
  items,
  label = 'Actions',
}: {
  items: AdminActionMenuItem[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

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
      setCoords(getMenuCoords(trigger.getBoundingClientRect(), menu.offsetHeight));
    };

    place();
    // Re-measure after fonts/layout settle so collision math uses real height
    const frame = requestAnimationFrame(() => {
      place();
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, items]);

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
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (!menuRef.current) return;
      const items = Array.from(menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
      if (items.length === 0) return;
      const currentIndex = items.findIndex((item) => item === document.activeElement);
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        items[(currentIndex + 1) % items.length]?.focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length]?.focus();
      } else if (event.key === 'Home') {
        event.preventDefault();
        items[0]?.focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        items[items.length - 1]?.focus();
      }
    };

    const onScrollOrResize = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) {
        setOpen(false);
        return;
      }
      setCoords(getMenuCoords(trigger.getBoundingClientRect(), menu.offsetHeight));
    };

    const onScrollClose = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    window.addEventListener('mousedown', onPointerDown, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollClose, true);

    return () => {
      window.removeEventListener('mousedown', onPointerDown, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollClose, true);
    };
  }, [open]);

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            style={{
              top: coords?.top ?? -9999,
              left: coords?.left ?? -9999,
              width: MENU_WIDTH,
              maxHeight: coords?.maxHeight,
              visibility: coords ? 'visible' : 'hidden',
              pointerEvents: coords ? 'auto' : 'none',
            }}
            className="fixed z-[60] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-admin-panel animate-admin-menu-in"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                  item.onClick();
                }}
                className={`block w-full px-3 py-2 text-left text-sm transition-colors duration-admin ${
                  item.tone === 'danger' ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-primary-50/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="rounded-lg p-2 text-slate-500 transition-colors duration-admin hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/25"
      >
        <MoreHorizontal size={16} />
      </button>
      {menu}
    </div>
  );
}
