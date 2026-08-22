'use client';

import { useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/data-table/DataTable';
import { TableSearch } from '@/components/data-table/TableSearch';
import { FilterSelect, TableFilters } from '@/components/data-table/TableFilters';
import { TablePagination } from '@/components/data-table/TablePagination';
import { AccountStatusBadge } from '@/components/accounts/AccountStatusBadge';
import { ActionMenu } from '@/components/accounts/ActionMenu';
import { DisableAccountDialog } from '@/components/accounts/DisableAccountDialog';
import { EnableAccountDialog } from '@/components/accounts/EnableAccountDialog';
import { DetailItem, DetailList } from '@/components/accounts/DetailList';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { useAccountList } from '@/hooks/useAccountList';
import { adminFetch } from '@/lib/adminFetch';
import { commandCenterStatus } from '@/lib/status';
import { useToast } from '@/components/ToastProvider';
import type { CommandCenterRecord } from '@/lib/accountTypes';

export default function CommandCentersPage() {
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const extraParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (status !== 'all') params.status = status;
    return params;
  }, [status]);
  const list = useAccountList<CommandCenterRecord>('command-centers', extraParams);
  const [selected, setSelected] = useState<CommandCenterRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [disabling, setDisabling] = useState<CommandCenterRecord | null>(null);
  const [enabling, setEnabling] = useState<CommandCenterRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', location: '' });
  const [editForm, setEditForm] = useState({ name: '', location: '' });

  const run = async (message: string, work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
      toast.success(message);
      list.invalidateType();
      await list.reload();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Add Command Center
          </Button>
        }
      />

      <div className="mb-4">
        <TableFilters>
          <TableSearch
            label="Search command centers"
            placeholder="Search command centers..."
            value={list.search}
            onChange={list.setSearch}
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
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
          { key: 'name', header: 'Name', render: (row) => <span className="font-medium text-slate-900">{row.name || '—'}</span> },
          { key: 'location', header: 'Location', render: (row) => row.location || '—' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <AccountStatusBadge status={commandCenterStatus(row.disabled)} />,
          },
          {
            key: 'actions',
            header: 'Actions',
            className: 'w-16',
            render: (row) => (
              <ActionMenu
                items={[
                  { label: 'View Details', onClick: () => setSelected(row) },
                  {
                    label: 'Edit',
                    onClick: () => {
                      setSelected(row);
                      setEditForm({ name: row.name, location: row.location });
                      setEditOpen(true);
                    },
                  },
                  row.disabled
                    ? { label: 'Enable', onClick: () => setEnabling(row) }
                    : { label: 'Disable', onClick: () => setDisabling(row), tone: 'danger' },
                ]}
              />
            ),
          },
        ]}
        rows={list.items}
        loading={list.initialLoading}
        refreshing={list.refreshing}
        error={list.error}
        emptyTitle="No command centers found."
        emptyDescription="Try changing your filters or add a command center."
        onRowClick={setSelected}
        onRetry={() => void list.reload()}
      />
      <TablePagination page={list.page} pageSize={list.pageSize} total={list.total} onPageChange={list.setPage} />

      <Drawer open={Boolean(selected) && !editOpen} title="Command Center" onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">General Information</h3>
              <DetailList>
                <DetailItem label="Name" value={selected.name} />
                <DetailItem label="Location" value={selected.location} />
                <DetailItem label="Contact" value={selected.email} />
                <DetailItem label="Status" value={<AccountStatusBadge status={commandCenterStatus(selected.disabled)} />} />
              </DetailList>
            </section>
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Associated Accounts</h3>
              <p className="text-sm text-slate-600">Login account: {selected.email || '—'}</p>
            </section>
            <section className="border-t border-slate-200 pt-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Administrative Actions</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditForm({ name: selected.name, location: selected.location });
                    setEditOpen(true);
                  }}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                >
                  Edit
                </button>
                {selected.disabled ? (
                  <button type="button" onClick={() => setEnabling(selected)} className="h-9 rounded-lg border border-slate-200 px-3 text-sm">
                    Enable
                  </button>
                ) : (
                  <button type="button" onClick={() => setDisabling(selected)} className="h-9 rounded-lg border border-red-200 px-3 text-sm text-red-700">
                    Soft Disable
                  </button>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </Drawer>

      <Dialog open={createOpen} title="Add Command Center" onClose={() => !creating && setCreateOpen(false)} widthClassName="max-w-lg">
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setCreating(true);
            try {
              await adminFetch('/api/create-command-center', { method: 'POST', body: JSON.stringify(form) });
              toast.success('Command center created successfully.');
              setCreateOpen(false);
              setForm({ email: '', password: '', name: '', location: '' });
              list.invalidateType();
              await list.reload();
            } catch (error) {
              toast.error((error as Error).message);
            } finally {
              setCreating(false);
            }
          }}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Location</span>
            <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" disabled={creating} onClick={() => setCreateOpen(false)} className="h-10 rounded-lg px-4 text-sm text-slate-600">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-4 text-sm font-medium text-white disabled:opacity-50">
              {creating ? <Loader2 size={16} className="animate-spin" /> : null}
              {creating ? 'Creating...' : 'Create Command Center'}
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog open={editOpen} title="Edit Command Center" onClose={() => !busy && setEditOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!selected) return;
            await run('Command center updated.', async () => {
              await adminFetch('/api/command-centers/update', {
                method: 'POST',
                body: JSON.stringify({ uid: selected.id, ...editForm }),
              });
              setEditOpen(false);
            });
          }}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
            <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Location</span>
            <input required value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" disabled={busy} onClick={() => setEditOpen(false)} className="h-10 rounded-lg px-4 text-sm text-slate-600">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-4 text-sm font-medium text-white disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              {busy ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </Dialog>

      <DisableAccountDialog
        open={Boolean(disabling)}
        accountLabel={disabling?.name || disabling?.email || ''}
        accountKind="command center"
        busy={busy}
        onClose={() => setDisabling(null)}
        onConfirm={async (reason) => {
          if (!disabling) return;
          await run('Command center disabled.', async () => {
            await adminFetch('/api/accounts/disable', {
              method: 'POST',
              body: JSON.stringify({ uid: disabling.id, accountType: 'command_center', reason }),
            });
            setDisabling(null);
            setSelected(null);
          });
        }}
      />
      <EnableAccountDialog
        open={Boolean(enabling)}
        accountLabel={enabling?.name || enabling?.email || ''}
        accountKind="command center"
        busy={busy}
        onClose={() => setEnabling(null)}
        onConfirm={async () => {
          if (!enabling) return;
          await run('Command center enabled.', async () => {
            await adminFetch('/api/accounts/enable', {
              method: 'POST',
              body: JSON.stringify({ uid: enabling.id, accountType: 'command_center' }),
            });
            setEnabling(null);
          });
        }}
      />
    </>
  );
}
