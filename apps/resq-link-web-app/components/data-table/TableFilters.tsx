'use client';

export function TableFilters({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
      {children}
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 min-w-[10rem] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm transition-colors duration-admin hover:border-slate-300 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
