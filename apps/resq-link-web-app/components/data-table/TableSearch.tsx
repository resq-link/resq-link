'use client';

import { Search } from 'lucide-react';

export function TableSearch({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="relative block min-w-[16rem] flex-1">
      <span className="sr-only">{label}</span>
      <Search
        size={15}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-fg-subtle"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-admin-border bg-admin-surface pl-9 pr-3 text-sm text-admin-fg placeholder:text-admin-fg-subtle shadow-sm transition-colors duration-admin hover:border-admin-border focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
    </label>
  );
}
