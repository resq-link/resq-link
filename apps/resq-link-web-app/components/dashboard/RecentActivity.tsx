'use client';

import Link from 'next/link';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import InlineLoader from '@/components/InlineLoader';
import { auditActionLabel } from '@/lib/auditActions';
import { formatRelativeTime } from '@/lib/dates';
import { routes } from '@/lib/routes';

export function RecentActivity({
  items,
  loading = false,
}: {
  items: Array<{
    id: string;
    action: string;
    actorEmail: string | null;
    targetLabel: string | null;
    createdAt: string | null;
  }>;
  loading?: boolean;
}) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-admin-card animate-admin-fade-in">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Recent Administrative Activity</h2>
        <Link
          href={routes.admin.audit}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 transition-colors duration-admin hover:text-primary-700"
        >
          View all
          <ChevronRight size={12} aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <div className="mt-4">
          <InlineLoader label="Loading activity..." />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5 flex flex-1 flex-col items-start justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-5">
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle2 size={16} className="text-primary-500" aria-hidden="true" />
            <p className="text-sm font-medium">No recent activity</p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            Administrative actions will appear here when changes are made.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-0">
          {items.map((item, index) => (
            <li key={item.id} className="relative flex gap-3 py-2.5 first:pt-1 last:pb-0">
              {index < items.length - 1 ? (
                <span aria-hidden="true" className="absolute bottom-0 left-[3.5px] top-5 w-px bg-slate-200" />
              ) : null}
              <span
                aria-hidden="true"
                className="relative z-[1] mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500 ring-4 ring-primary-50"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{auditActionLabel(item.action)}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  <span className="text-slate-600">{item.targetLabel || 'System'}</span>
                  <span className="mx-1 text-slate-300">·</span>
                  {formatRelativeTime(item.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
