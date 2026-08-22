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
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition-colors duration-admin hover:border-slate-300 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
    </label>
  );
}
