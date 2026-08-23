'use client';

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/data-table/DataTable';
import { TableSearch } from '@/components/data-table/TableSearch';
import { FilterSelect, TableFilters } from '@/components/data-table/TableFilters';
import { TablePagination } from '@/components/data-table/TablePagination';
import { ActionMenu } from '@/components/accounts/ActionMenu';
import { AccountStatusBadge } from '@/components/accounts/AccountStatusBadge';
import { DetailItem, DetailList } from '@/components/accounts/DetailList';
import { DeleteConfirmationDialog } from '@/components/admin/DeleteConfirmationDialog';
import { TableExportMenu } from '@/components/admin/TableExportMenu';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { adminFetch } from '@/lib/adminFetch';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAdminAgenciesList } from '@/hooks/useAgencies';
import { useToast } from '@/components/ToastProvider';
import { fetchAllFilteredPages, type AdminExportColumn } from '@/lib/adminExport';
import {
  AGENCY_TYPE_OPTIONS,
  agencyTypeLabel,
  finalizeAgencyCode,
  normalizeAgencyCode,
  type AgencyRecord,
  type AgencyType,
} from '@/lib/agencyTypes';
import { getStatusDisplay } from '@/lib/status';

const AGENCY_EXPORT_COLUMNS: AdminExportColumn<AgencyRecord>[] = [
  { header: 'Agency', accessor: (row) => row.name || '—' },
  { header: 'Code', accessor: (row) => row.code || '—' },
  { header: 'Type', accessor: (row) => agencyTypeLabel(row.type) },
  {
    header: 'Status',
    accessor: (row) => getStatusDisplay(row.isActive ? 'active' : 'disabled').label,
  },
];

const EMPTY_FORM = {
  name: '',
  code: '',
  type: 'fire_rescue' as AgencyType,
  contactPhone: '',
  isActive: true,
};

export default function AgenciesPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AgencyRecord | null>(null);
  /** Agency being edited in the modal — kept separate from `selected` so Edit does not open the drawer. */
  const [editing, setEditing] = useState<AgencyRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState<AgencyRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const debouncedSearch = useDebouncedValue(search);

  const listParams = useMemo(
    () => ({ search: debouncedSearch, type, status, page }),
    [debouncedSearch, page, status, type]
  );
  const list = useAdminAgenciesList(listParams);

  const exportFilters = useMemo(() => {
    const parts: string[] = [];
    if (debouncedSearch.trim()) parts.push(`Search: ${debouncedSearch.trim()}`);
    if (type !== 'all') parts.push(`Type: ${agencyTypeLabel(type)}`);
    if (status !== 'all') parts.push(`Status: ${status}`);
    return parts;
  }, [debouncedSearch, status, type]);

  const getExportRows = useCallback(async () => {
    return fetchAllFilteredPages<AgencyRecord>({
      pageSize: 100,
      fetchPage: async (exportPage, pageSize) => {
        const query = new URLSearchParams({
          search: debouncedSearch,
          type,
          status,
          page: String(exportPage),
          pageSize: String(pageSize),
          counts: '0',
        });
        const data = await adminFetch<{ items: AgencyRecord[]; total: number }>(
          `/api/agencies?${query.toString()}`
        );
        return { items: data.items, total: data.total };
      },
    });
  }, [debouncedSearch, status, type]);

  const typeOptions = useMemo(
    () => [{ value: 'all', label: 'All types' }, ...AGENCY_TYPE_OPTIONS.map((item) => ({ value: item.value, label: item.label }))],
    []
  );

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  };

  const openEdit = (agency: AgencyRecord) => {
    setEditing(agency);
    setForm({
      name: agency.name,
      code: agency.code,
      type: agency.type,
      contactPhone: agency.contactPhone,
      isActive: agency.isActive,
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (busy) return;
    setEditOpen(false);
    setEditing(null);
  };

  const createAgency = async () => {
    setBusy(true);
    try {
      await adminFetch('/api/agencies', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          code: finalizeAgencyCode(form.code),
          type: form.type,
          contactPhone: form.contactPhone,
          isActive: form.isActive,
        }),
      });
      toast.success('Agency created successfully.');
      setCreateOpen(false);
      await list.refresh();
    } catch (err) {
      toast.error((err as Error).message || 'Unable to create agency.');
    } finally {
      setBusy(false);
    }
  };

  const saveAgency = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const data = await adminFetch<{ item: AgencyRecord }>(`/api/agencies/${encodeURIComponent(editing.code)}`, {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          contactPhone: form.contactPhone,
          isActive: form.isActive,
        }),
      });
      toast.success('Agency updated successfully.');
      setEditOpen(false);
      setEditing(null);
      // Refresh drawer contents only if that agency was already open — do not open the drawer.
      setSelected((current) => (current?.code === data.item.code ? data.item : current));
      list.patchItem(data.item);
      await list.refresh();
    } catch (err) {
      toast.error((err as Error).message || 'Unable to update agency.');
      console.error('[agencies] update failed', err);
    } finally {
      setBusy(false);
    }
  };

  const toggleAgency = async (agency: AgencyRecord, enable: boolean) => {
    setBusy(true);
    try {
      const path = enable ? 'enable' : 'disable';
      const data = await adminFetch<{ item: AgencyRecord }>(
        `/api/agencies/${encodeURIComponent(agency.code)}/${path}`,
        { method: 'POST', body: '{}' }
      );
      toast.success(enable ? 'Agency enabled successfully.' : 'Agency disabled successfully.');
      setSelected((current) => (current?.code === data.item.code ? data.item : current));
      list.patchItem(data.item);
      await list.refresh();
    } catch (err) {
      toast.error(
        (err as Error).message || (enable ? 'Unable to enable agency.' : 'Unable to disable agency.')
      );
      console.error('[agencies] toggle failed', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus size={16} />
            Add Agency
          </Button>
        }
      />

      <div className="mb-4">
        <TableFilters
          actions={
            <TableExportMenu
              title="Agencies"
              fileSlug="Agencies"
              columns={AGENCY_EXPORT_COLUMNS}
              getRows={getExportRows}
              filtersSummary={exportFilters}
            />
          }
        >
          <TableSearch
            label="Search agencies"
            placeholder="Search agencies..."
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          <FilterSelect
            label="Type"
            value={type}
            onChange={(value) => {
              setType(value);
              setPage(1);
            }}
            options={typeOptions}
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'disabled', label: 'Disabled' },
            ]}
          />
        </TableFilters>
      </div>

      <DataTable
        columns={[
          {
            key: 'agency',
            header: 'Agency',
            render: (row) => <span className="font-medium text-admin-fg">{row.name}</span>,
          },
          { key: 'code', header: 'Code', render: (row) => row.code },
          { key: 'type', header: 'Type', render: (row) => agencyTypeLabel(row.type) },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <AccountStatusBadge status={getStatusDisplay(row.isActive ? 'active' : 'disabled')} />,
          },
          {
            key: 'actions',
            header: 'Actions',
            className: 'w-16',
            render: (row) => (
              <div
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <ActionMenu
                  items={[
                    { label: 'View Details', onClick: () => setSelected(row) },
                    { label: 'Edit Agency', onClick: () => openEdit(row) },
                    row.isActive
                      ? { label: 'Disable Agency', onClick: () => void toggleAgency(row, false), tone: 'danger' }
                      : { label: 'Enable Agency', onClick: () => void toggleAgency(row, true) },
                    { label: 'Delete Agency', onClick: () => setDeleting(row), tone: 'danger' },
                  ]}
                />
              </div>
            ),
          },
        ]}
        rows={list.items}
        loading={list.initialLoading}
        refreshing={list.refreshing}
        error={list.error}
        emptyTitle="No agencies found."
        emptyDescription="Try changing filters or add an agency."
        onRowClick={setSelected}
        onRetry={() => void list.reload()}
      />
      {/* Avoid "Showing 0–0 of 0" while the first fetch is still unresolved. */}
      {!list.initialLoading ? (
        <TablePagination page={page} pageSize={list.pageSize} total={list.total} onPageChange={setPage} />
      ) : null}

      <Drawer open={Boolean(selected)} title={selected?.name || 'Agency'} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-6">
            <DetailList>
              <DetailItem label="Agency Code" value={selected.code} />
              <DetailItem label="Type" value={agencyTypeLabel(selected.type)} />
              <DetailItem
                label="Status"
                value={<AccountStatusBadge status={getStatusDisplay(selected.isActive ? 'active' : 'disabled')} />}
              />
              <DetailItem label="Phone" value={selected.contactPhone || '—'} />
            </DetailList>

            <div className="flex flex-wrap gap-2 border-t border-admin-border pt-4">
              <Button type="button" variant="secondary" onClick={() => openEdit(selected)}>
                Edit Agency
              </Button>
              {selected.isActive ? (
                <Button type="button" variant="danger" disabled={busy} onClick={() => void toggleAgency(selected, false)}>
                  Disable Agency
                </Button>
              ) : (
                <Button type="button" disabled={busy} onClick={() => void toggleAgency(selected, true)}>
                  Enable Agency
                </Button>
              )}
              <Button type="button" variant="danger" disabled={busy} onClick={() => setDeleting(selected)}>
                Delete Agency
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>

      <Dialog open={createOpen} title="Add Agency" onClose={() => !busy && setCreateOpen(false)} widthClassName="max-w-lg">
        <AgencyForm
          form={form}
          setForm={setForm}
          codeEditable
          busy={busy}
          onCancel={() => setCreateOpen(false)}
          onSubmit={() => void createAgency()}
          submitLabel="Create Agency"
          busyLabel="Creating..."
        />
      </Dialog>

      <Dialog open={editOpen} title="Edit Agency" onClose={closeEdit} widthClassName="max-w-lg">
        <AgencyForm
          form={form}
          setForm={setForm}
          codeEditable={false}
          busy={busy}
          onCancel={closeEdit}
          onSubmit={() => void saveAgency()}
          submitLabel="Save changes"
          busyLabel="Saving..."
        />
      </Dialog>

      <DeleteConfirmationDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.name || 'Agency'}?`}
        entityName={deleting ? `${deleting.code}` : undefined}
        description="Agencies with assigned staff accounts cannot be deleted. Reassign or remove those accounts first. Deleted agencies are removed from active management and cannot be assigned to new incidents or staff."
        confirmLabel="Delete Agency"
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={async (reason) => {
          if (!deleting) return;
          setBusy(true);
          try {
            await adminFetch(`/api/agencies/${encodeURIComponent(deleting.code)}/delete`, {
              method: 'POST',
              body: JSON.stringify({ reason }),
            });
            toast.success('Agency deleted successfully.');
            setDeleting(null);
            setSelected(null);
            await list.refresh();
          } catch (err) {
            toast.error((err as Error).message || 'Unable to delete agency.');
            console.error('[agencies] delete failed', err);
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

function AgencyForm({
  form,
  setForm,
  codeEditable,
  busy,
  onCancel,
  onSubmit,
  submitLabel,
  busyLabel = 'Saving...',
}: {
  form: typeof EMPTY_FORM;
  setForm: Dispatch<SetStateAction<typeof EMPTY_FORM>>;
  codeEditable: boolean;
  busy: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  busyLabel?: string;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Agency Name *</span>
        <input
          required
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Agency Code *</span>
        <input
          required
          disabled={!codeEditable}
          value={form.code}
          onChange={(event) =>
            setForm((current) => ({ ...current, code: normalizeAgencyCode(event.target.value) }))
          }
          className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm uppercase disabled:bg-admin-muted"
          placeholder="BFP"
        />
        {!codeEditable ? (
          <span className="mt-1 block text-xs text-admin-fg-subtle">Code cannot change after creation.</span>
        ) : null}
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Agency Type *</span>
        <select
          required
          value={form.type}
          onChange={(event) =>
            setForm((current) => ({ ...current, type: event.target.value as AgencyType }))
          }
          className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm"
        >
          {AGENCY_TYPE_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Phone</span>
        <input
          value={form.contactPhone}
          onChange={(event) =>
            setForm((current) => ({ ...current, contactPhone: event.target.value }))
          }
          className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm"
          placeholder="Optional"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-admin-fg-muted">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) =>
            setForm((current) => ({ ...current, isActive: event.target.checked }))
          }
        />
        Active
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy ? busyLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
