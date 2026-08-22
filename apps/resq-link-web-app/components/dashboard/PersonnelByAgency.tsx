'use client';

import Link from 'next/link';
import { ChevronRight, Landmark } from 'lucide-react';
import InlineLoader from '@/components/InlineLoader';
import { routes } from '@/lib/routes';

export function PersonnelByAgency({
  rows,
  loading = false,
}: {
  rows: Array<{ code: string; name: string; total: number }>;
  loading?: boolean;
}) {
  const max = Math.max(...rows.map((row) => row.total), 1);

  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-admin-card animate-admin-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600 ring-1 ring-primary-100">
            <Landmark size={14} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Personnel by Agency</h2>
            <p className="text-xs text-slate-500">Staff distribution across agencies</p>
          </div>
        </div>
        <Link
          href={routes.admin.agencies}
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary-600 transition-colors duration-admin hover:text-primary-700"
        >
          View agencies
          <ChevronRight size={12} aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <div className="mt-5">
          <InlineLoader label="Loading distribution..." />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-5 flex flex-1 flex-col items-start justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-5">
          <p className="text-sm font-medium text-slate-600">No personnel assigned yet</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Agency staffing will appear here once dispatchers or responders are assigned.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3.5">
          {rows.map((row) => {
            const pct = Math.max(8, Math.round((row.total / max) * 100));
            return (
              <li key={row.code}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{row.code}</p>
                    {row.name && row.name !== row.code ? (
                      <p className="truncate text-[11px] text-slate-500">{row.name}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700">
                    {row.total}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-primary-500/80 transition-[width] duration-500 ease-out motion-reduce:transition-none"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
