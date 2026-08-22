'use client';

import type { StatusDisplay } from '@/lib/status';

export function AccountStatusBadge({ status }: { status: StatusDisplay }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors duration-admin ${status.className}`}
    >
      <span aria-hidden="true" className="text-[0.65rem] leading-none">
        {status.symbol}
      </span>
      {status.label}
    </span>
  );
}
