'use client';

import type { ReactNode } from 'react';

export function DetailList({ children }: { children: ReactNode }) {
  return <dl className="space-y-3 text-sm">{children}</dl>;
}

export function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-admin-fg-subtle">{label}</dt>
      <dd className="mt-1 text-admin-fg">{value || '—'}</dd>
    </div>
  );
}
