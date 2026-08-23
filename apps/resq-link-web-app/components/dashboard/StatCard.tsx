'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

export function StatCard({
  value,
  label,
  hint,
  icon: Icon,
  loading = false,
  href,
  tone = 'default',
}: {
  value?: number | string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  loading?: boolean;
  href?: string;
  tone?: 'default' | 'warning';
}) {
  const interactive = Boolean(href);
  const toneClasses =
    tone === 'warning'
      ? 'border-amber-200/80 hover:border-amber-300/90 hover:shadow-admin-card-hover dark:border-amber-500/30 dark:hover:border-amber-500/45'
      : 'border-admin-border/90 hover:border-primary-200/80 hover:shadow-admin-card-hover dark:hover:border-primary-500/35';

  const iconTone =
    tone === 'warning'
      ? 'bg-amber-50 text-amber-700 ring-amber-100 group-hover:bg-amber-100/80 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25 dark:group-hover:bg-amber-500/20'
      : 'bg-primary-50 text-primary-600 ring-primary-100 group-hover:bg-primary-100/80 dark:bg-primary-500/15 dark:text-primary-300 dark:ring-primary-500/25 dark:group-hover:bg-primary-500/20';

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors duration-admin ${iconTone}`}
          >
            <Icon size={15} aria-hidden="true" strokeWidth={2} />
          </span>
          <p className="truncate text-sm font-medium text-admin-fg-muted">{label}</p>
        </div>
        {interactive ? (
          <ChevronRight
            size={14}
            className="mt-0.5 shrink-0 text-admin-fg-subtle/60 transition-colors duration-admin group-hover:text-primary-500"
            aria-hidden="true"
          />
        ) : null}
      </div>

      <div className="mt-4">
        <div className="flex h-8 items-center overflow-hidden">
          {loading ? (
            <span
              className="block h-5 w-10 shrink-0 rounded bg-admin-hover animate-pulse"
              aria-hidden="true"
            />
          ) : (
            <p
              className={`text-[1.875rem] font-semibold leading-8 tracking-tight tabular-nums ${
                tone === 'warning' && Number(value) > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-admin-fg'
              }`}
            >
              {value}
            </p>
          )}
        </div>
        <div className="mt-2 flex h-4 items-center overflow-hidden">
          {hint ? <p className="truncate text-xs leading-4 text-admin-fg-subtle">{hint}</p> : null}
        </div>
        {loading ? <span className="sr-only">Loading {label}</span> : null}
      </div>
    </>
  );

  const className = [
    'group relative block h-full rounded-xl border bg-admin-surface p-4 shadow-admin-card',
    'transition-[transform,box-shadow,border-color] duration-admin ease-out',
    'motion-safe:hover:-translate-y-0.5',
    toneClasses,
    interactive ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-1' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (href) {
    return (
      <Link href={href} className={className} aria-label={`Open ${label}`}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

export function StatSection({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-admin-fg-subtle">
        {title}
      </h2>
      {children}
    </section>
  );
}
