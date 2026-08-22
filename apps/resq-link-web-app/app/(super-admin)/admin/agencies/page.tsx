'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { adminFetch } from '@/lib/adminFetch';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAdminAgenciesList } from '@/hooks/useAgencies';
import { useToast } from '@/components/ToastProvider';
import {
  AGENCY_TYPE_OPTIONS,
  agencyTypeLabel,
  normalizeAgencyCode,
  type AgencyRecord,
  type AgencyType,
} from '@/lib/agencyTypes';
import { getStatusDisplay } from '@/lib/status';
import { routes } from '@/lib/routes';

const EMPTY_FORM = {
  name: '',
  code: '',
  type: 'fire_rescue' as AgencyType,
  description: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  isActive: true,
};

export default function AgenciesPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AgencyRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const debouncedSearch = useDebouncedValue(search);

  const listParams = useMemo(
    () => ({ search: debouncedSearch, type, status, page }),
    [debouncedSearch, page, status, type]
  );
  const list = useAdminAgenciesList(listParams);

  const typeOptions = useMemo(
    () => [{ value: 'all', label: 'All types' }, ...AGENCY_TYPE_OPTIONS.map((item) => ({ value: item.value, label: item.label }))],
    []
  );

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  };

  const openEdit = (agency: AgencyRecord) => {
    setSelected(agency);
    setForm({
      name: agency.name,
      code: agency.code,
      type: agency.type,
      description: agency.description,
      contactEmail: agency.contactEmail,
      contactPhone: agency.contactPhone,
      address: agency.address,
      isActive: agency.isActive,
    });
    setEditOpen(true);
  };

  const createAgency = async () => {
    setBusy(true);
    try {
      await adminFetch('/api/agencies', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          code: normalizeAgencyCode(form.code),
        }),
      });
      toast.success('Agency created.');
      setCreateOpen(false);
      list.invalidate();
      await list.reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveAgency = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const data = await adminFetch<{ item: AgencyRecord }>(`/api/agencies/${encodeURIComponent(selected.code)}`, {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          description: form.description,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          address: form.address,
          isActive: form.isActive,
        }),
      });
      toast.success('Agency updated.');
      setEditOpen(false);
      setSelected(data.item);
      list.invalidate();
      await list.reload();
    } catch (err) {
      toast.error((err as Error).message);
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
      toast.success(enable ? 'Agency enabled.' : 'Agency disabled.');
      setSelected(data.item);
      list.invalidate();
      await list.reload();
    } catch (err) {
      toast.error((err as Error).message);
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
        <TableFilters>
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
            render: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
          },
          { key: 'code', header: 'Code', render: (row) => row.code },
          { key: 'type', header: 'Type', render: (row) => agencyTypeLabel(row.type) },
          {
            key: 'personnel',
            header: 'Personnel',
            render: (row) => (row.personnel ? row.personnel.total : '—'),
          },
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
              <ActionMenu
                items={[
                  { label: 'View Details', onClick: () => setSelected(row) },
                  { label: 'Edit Agency', onClick: () => openEdit(row) },
                  row.isActive
                    ? { label: 'Disable Agency', onClick: () => void toggleAgency(row, false), tone: 'danger' }
                    : { label: 'Enable Agency', onClick: () => void toggleAgency(row, true) },
                ]}
              />
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
      <TablePagination page={page} pageSize={list.pageSize} total={list.total} onPageChange={setPage} />

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
              <DetailItem label="Description" value={selected.description || '—'} />
            </DetailList>

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Contact Information</h3>
              <DetailList>
                <DetailItem label="Email" value={selected.contactEmail || '—'} />
                <DetailItem label="Phone" value={selected.contactPhone || '—'} />
                <DetailItem label="Address" value={selected.address || '—'} />
              </DetailList>
            </section>

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Personnel Summary</h3>
              <DetailList>
                <DetailItem label="Dispatchers" value={selected.personnel?.dispatchers ?? '—'} />
                <DetailItem label="Responders" value={selected.personnel?.responders ?? '—'} />
                <DetailItem label="Total Personnel" value={selected.personnel?.total ?? '—'} />
              </DetailList>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`${routes.admin.dispatchers}?agency=${encodeURIComponent(selected.code)}`}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm text-slate-700 transition-colors duration-admin hover:bg-slate-50"
                >
                  View Dispatchers
                </Link>
                <Link
                  href={`${routes.admin.responders}?agency=${encodeURIComponent(selected.code)}`}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm text-slate-700 transition-colors duration-admin hover:bg-slate-50"
                >
                  View Responders
                </Link>
              </div>
            </section>

            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
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

      <Dialog open={editOpen} title="Edit Agency" onClose={() => !busy && setEditOpen(false)} widthClassName="max-w-lg">
        <AgencyForm
          form={form}
          setForm={setForm}
          codeEditable={false}
          busy={busy}
          onCancel={() => setEditOpen(false)}
          onSubmit={() => void saveAgency()}
          submitLabel="Save changes"
          busyLabel="Saving..."
        />
      </Dialog>
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
  setForm: (next: typeof EMPTY_FORM) => void;
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
        <span className="mb-1 block text-sm font-medium text-slate-700">Agency Name *</span>
        <input
          required
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Agency Code *</span>
        <input
          required
          disabled={!codeEditable}
          value={form.code}
          onChange={(event) => setForm({ ...form, code: normalizeAgencyCode(event.target.value) })}
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm uppercase disabled:bg-slate-50"
          placeholder="BFP"
        />
        {!codeEditable ? (
          <span className="mt-1 block text-xs text-slate-500">Code cannot change after creation.</span>
        ) : null}
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Agency Type *</span>
        <select
          required
          value={form.type}
          onChange={(event) => setForm({ ...form, type: event.target.value as AgencyType })}
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
        >
          {AGENCY_TYPE_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Description</span>
        <textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          className="min-h-[80px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            value={form.contactEmail}
            onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Phone</span>
          <input
            value={form.contactPhone}
            onChange={(event) => setForm({ ...form, contactPhone: event.target.value })}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Address</span>
        <input
          value={form.address}
          onChange={(event) => setForm({ ...form, address: event.target.value })}
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
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
