'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { EmptyState } from './EmptyState';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  refreshing,
  error,
  emptyTitle,
  emptyDescription,
  onRowClick,
  onRetry,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  loading?: boolean;
  refreshing?: boolean;
  error?: string | null;
  emptyTitle: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  onRetry?: () => void;
}) {
  const showInitialLoader = Boolean(loading) && rows.length === 0 && !error;

  return (
    <div className="overflow-hidden rounded-xl border border-admin-border/90 bg-admin-surface shadow-admin-card">
      {refreshing && rows.length > 0 ? (
        <div className="flex items-center justify-end gap-2 border-b border-admin-border bg-admin-muted/70 px-4 py-1.5 text-[11px] text-admin-fg-subtle">
          <Loader2 size={12} className="animate-spin text-primary-500" />
          Refreshing...
        </div>
      ) : null}

      {error ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-lg border border-admin-border bg-admin-surface px-3 py-1.5 text-sm font-medium text-admin-fg-muted hover:bg-admin-muted"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : showInitialLoader ? (
        <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-admin-fg-subtle">
          <Loader2 size={16} className="animate-spin text-primary-500" />
          Loading...
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-[1] border-b border-admin-border/80 bg-admin-muted/95 backdrop-blur-sm">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-admin-fg-subtle ${column.className || ''}`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`transition-colors duration-admin ${
                    onRowClick ? 'cursor-pointer hover:bg-admin-hover' : 'hover:bg-admin-muted/80'
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-admin-fg-muted ${column.className || ''}`}
                      onClick={
                        column.key === 'actions'
                          ? (event) => event.stopPropagation()
                          : undefined
                      }
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
