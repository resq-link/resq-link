'use client';

import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { TableSearch } from '@/components/data-table/TableSearch';
import { FilterSelect, TableFilters } from '@/components/data-table/TableFilters';
import { TablePagination } from '@/components/data-table/TablePagination';
import { Drawer } from '@/components/ui/Drawer';
import { DetailItem, DetailList } from '@/components/accounts/DetailList';
import { AUDIT_ACTION_LABELS, auditActionLabel } from '@/lib/auditActions';
import { formatDateTime } from '@/lib/dates';
import { useAdminAuditLogs } from '@/hooks/useAdminAuditLogs';
import type { AuditLogRecord } from '@/lib/accountTypes';

const TARGET_TYPES = [
  { value: 'all', label: 'All targets' },
  { value: 'dispatchers', label: 'Dispatchers' },
  { value: 'users', label: 'Civilians' },
  { value: 'commandCenters', label: 'Command Centers' },
  { value: 'agencies', label: 'Agencies' },
  { value: 'admins', label: 'Administrators' },
];

export default function AuditPage() {
  const logs = useAdminAuditLogs();
  const [selected, setSelected] = useState<AuditLogRecord | null>(null);

  const actionOptions = useMemo(
    () => [{ value: 'all', label: 'All actions' }, ...Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label }))],
    []
  );

  const changes =
    selected?.metadata && typeof selected.metadata.changes === 'object' && selected.metadata.changes
      ? (selected.metadata.changes as Record<string, { from?: unknown; to?: unknown }>)
      : null;

  return (
    <>
      <div className="mb-4">
        <TableFilters>
          <TableSearch label="Search activity" placeholder="Search activity..." value={logs.search} onChange={logs.setSearch} />
          <FilterSelect label="Action" value={logs.action} onChange={logs.setAction} options={actionOptions} />
          <FilterSelect label="Target Type" value={logs.targetType} onChange={logs.setTargetType} options={TARGET_TYPES} />
        </TableFilters>
      </div>

      <DataTable
        columns={[
          { key: 'time', header: 'Time', render: (row) => formatDateTime(row.createdAt) },
          { key: 'admin', header: 'Administrator', render: (row) => row.actorEmail || row.actorUid },
          { key: 'action', header: 'Action', render: (row) => auditActionLabel(row.action) },
          { key: 'target', header: 'Target', render: (row) => row.targetLabel || row.targetUid || '—' },
        ]}
        rows={logs.items}
        loading={logs.initialLoading}
        refreshing={logs.refreshing}
        error={logs.error}
        emptyTitle="No audit activity found for this period."
        emptyDescription="Privileged account actions will appear here."
        onRowClick={setSelected}
        onRetry={() => void logs.reload()}
      />
      <TablePagination page={logs.page} pageSize={logs.pageSize} total={logs.total} onPageChange={logs.setPage} />

      <Drawer open={Boolean(selected)} title="Activity Details" onClose={() => setSelected(null)}>
        {selected ? (
          <DetailList>
            <DetailItem label="Action" value={auditActionLabel(selected.action)} />
            <DetailItem label="Performed By" value={selected.actorEmail || selected.actorUid} />
            <DetailItem label="Target" value={selected.targetLabel || selected.targetUid} />
            <DetailItem label="Date" value={formatDateTime(selected.createdAt)} />
            <DetailItem label="Reason" value={selected.reason} />
            {changes ? (
              <DetailItem
                label="Changes"
                value={
                  <ul className="space-y-1">
                    {Object.entries(changes).map(([field, value]) => (
                      <li key={field}>
                        <span className="font-medium capitalize">{field}</span>
                        {': '}
                        {String(value.from ?? '—')} → {String(value.to ?? '—')}
                      </li>
                    ))}
                  </ul>
                }
              />
            ) : null}
          </DetailList>
        ) : null}
      </Drawer>
    </>
  );
}
