'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import InlineLoader from '@/components/InlineLoader';
import type { NeedsAttentionItem } from '@/lib/accountTypes';

export function NeedsAttention({
  items,
  loading = false,
}: {
  items: NeedsAttentionItem[];
  loading?: boolean;
}) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-admin-border/90 bg-admin-surface p-5 shadow-admin-card animate-admin-fade-in">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25">
          <AlertTriangle size={14} aria-hidden="true" />
        </span>
        <h2 className="text-sm font-semibold text-admin-fg">Needs Attention</h2>
      </div>

      {loading ? (
        <div className="mt-4">
          <InlineLoader label="Checking items..." />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5 flex flex-1 flex-col items-start justify-center rounded-lg border border-dashed border-emerald-200/80 bg-emerald-50/40 px-4 py-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={16} aria-hidden="true" />
            <p className="text-sm font-medium">All caught up</p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-emerald-800/70 dark:text-emerald-200/70">
            Nothing requires administrative attention.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => {
            const isKyc = item.id === 'pending-kyc';
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-admin-border bg-admin-muted/60 px-3 py-2.5 transition-all duration-admin hover:border-primary-500/35 hover:bg-primary-500/10"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-admin-fg">{item.label}</p>
                    {isKyc ? (
                      <p className="mt-0.5 text-xs font-medium text-primary-600 transition-colors duration-admin group-hover:text-primary-700 dark:text-primary-400 dark:group-hover:text-primary-300">
                        Review KYC →
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-admin-fg-subtle">Review now</p>
                    )}
                  </div>
                  <ChevronRight
                    size={14}
                    className="shrink-0 text-admin-fg-subtle/60 transition-colors duration-admin group-hover:text-primary-500"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
