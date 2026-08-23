'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function Drawer({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        aria-label="Close details"
        className="absolute inset-0 bg-admin-overlay/50 transition-opacity duration-admin dark:bg-admin-overlay/65"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="relative flex h-full w-full max-w-lg animate-admin-panel-in flex-col border-l border-admin-border bg-admin-surface text-admin-fg shadow-admin-panel"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-admin-border/90 bg-admin-surface/95 px-5 py-4 backdrop-blur-sm">
          <h2 id="drawer-title" className="text-lg font-semibold text-admin-fg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-admin-fg-subtle transition-colors duration-admin hover:bg-admin-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/25"
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </div>,
    document.body
  );
}
