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
    <section className="flex h-full flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-admin-card animate-admin-fade-in">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
          <AlertTriangle size={14} aria-hidden="true" />
        </span>
        <h2 className="text-sm font-semibold text-slate-900">Needs Attention</h2>
      </div>

      {loading ? (
        <div className="mt-4">
          <InlineLoader label="Checking items..." />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5 flex flex-1 flex-col items-start justify-center rounded-lg border border-dashed border-emerald-200/80 bg-emerald-50/40 px-4 py-5">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={16} aria-hidden="true" />
            <p className="text-sm font-medium">All caught up</p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-emerald-800/70">
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
                  className="group flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 transition-all duration-admin hover:border-primary-200 hover:bg-primary-50/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                    {isKyc ? (
                      <p className="mt-0.5 text-xs font-medium text-primary-600 transition-colors duration-admin group-hover:text-primary-700">
                        Review KYC →
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-slate-500">Review now</p>
                    )}
                  </div>
                  <ChevronRight
                    size={14}
                    className="shrink-0 text-slate-300 transition-colors duration-admin group-hover:text-primary-500"
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
