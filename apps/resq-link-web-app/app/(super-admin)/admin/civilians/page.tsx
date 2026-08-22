'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
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
import { formatDate, formatDateTime } from '@/lib/dates';
import { civilianAccountStatus, verificationLabel } from '@/lib/status';
import { routes } from '@/lib/routes';
import { useToast } from '@/components/ToastProvider';
import type { CivilianAccountRecord } from '@/lib/accountTypes';
import { Loader2 } from 'lucide-react';

export default function CiviliansPage() {
  const toast = useToast();
  const [verification, setVerification] = useState('all');
  const [status, setStatus] = useState('all');
  const extraParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (verification !== 'all') params.verification = verification;
    if (status !== 'all') params.status = status;
    return params;
  }, [verification, status]);
  const list = useAccountList<CivilianAccountRecord>('civilians', extraParams);
  const [selected, setSelected] = useState<CivilianAccountRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [disabling, setDisabling] = useState<CivilianAccountRecord | null>(null);
  const [enabling, setEnabling] = useState<CivilianAccountRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '', address: '' });

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
            Add Civilian
          </Button>
        }
      />

      <div className="mb-4">
        <TableFilters>
          <TableSearch
            label="Search civilians"
            placeholder="Search name, email or phone..."
            value={list.search}
            onChange={list.setSearch}
          />
          <FilterSelect
            label="Verification"
            value={verification}
            onChange={setVerification}
            options={[
              { value: 'all', label: 'All verification' },
              { value: 'verified', label: 'Verified' },
              { value: 'pending_kyc', label: 'Pending KYC' },
              { value: 'pending_email', label: 'Pending email' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
          <FilterSelect
            label="Account Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'disabled', label: 'Disabled' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
        </TableFilters>
      </div>

      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (row) => (
              <div>
                <p className="font-medium text-slate-900">{row.name || '—'}</p>
                <p className="text-xs text-slate-500">{row.email || '—'}</p>
              </div>
            ),
          },
          {
            key: 'verification',
            header: 'Verification',
            render: (row) => verificationLabel(row.verification),
          },
          {
            key: 'status',
            header: 'Account',
            render: (row) => <AccountStatusBadge status={civilianAccountStatus(row.status, row.disabled)} />,
          },
          {
            key: 'registered',
            header: 'Registered',
            render: (row) => formatDate(row.createdAt),
          },
          {
            key: 'actions',
            header: 'Actions',
            className: 'w-16',
            render: (row) => (
              <ActionMenu
                items={[
                  { label: 'View Details', onClick: () => setSelected(row) },
                  { label: 'View KYC status', onClick: () => setSelected(row) },
                  row.disabled
                    ? { label: 'Enable Account', onClick: () => setEnabling(row) }
                    : { label: 'Disable Account', onClick: () => setDisabling(row), tone: 'danger' },
                ]}
              />
            ),
          },
        ]}
        rows={list.items}
        loading={list.initialLoading}
        refreshing={list.refreshing}
        error={list.error}
        emptyTitle="No civilians found."
        emptyDescription="Try changing your filters or add a civilian."
        onRowClick={setSelected}
        onRetry={() => void list.reload()}
      />
      <TablePagination page={list.page} pageSize={list.pageSize} total={list.total} onPageChange={list.setPage} />

      <Drawer open={Boolean(selected)} title="Civilian Account" onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Account</h3>
              <DetailList>
                <DetailItem label="Name" value={selected.name} />
                <DetailItem label="Email" value={selected.email} />
                <DetailItem label="Phone" value={selected.phone} />
                <DetailItem
                  label="Account Status"
                  value={<AccountStatusBadge status={civilianAccountStatus(selected.status, selected.disabled)} />}
                />
                <DetailItem label="Created Date" value={formatDateTime(selected.createdAt)} />
              </DetailList>
            </section>
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Verification</h3>
              <DetailList>
                <DetailItem label="KYC Status" value={verificationLabel(selected.verification)} />
                <DetailItem label="Submitted Date" value={formatDateTime(selected.kycSubmittedAt)} />
                <DetailItem label="Reviewed Date" value={formatDateTime(selected.kycReviewedAt)} />
                <DetailItem label="Reviewed By" value={selected.kycReviewedBy} />
              </DetailList>
              {selected.verification === 'pending_kyc' ? (
                <Link href={routes.admin.kyc} className="mt-3 inline-block text-sm font-medium text-primary-600 hover:text-primary-700">
                  Open KYC Review
                </Link>
              ) : null}
            </section>
            <section className="border-t border-slate-200 pt-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Account Actions</h3>
              {selected.disabled ? (
                <button type="button" onClick={() => setEnabling(selected)} className="h-9 rounded-lg border border-slate-200 px-3 text-sm">
                  Enable Account
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setDisabling(selected)}
                  className="h-9 rounded-lg border border-red-200 px-3 text-sm text-red-700"
                >
                  Disable Account
                </button>
              )}
            </section>
          </div>
        ) : null}
      </Drawer>

      <Dialog open={createOpen} title="Add Civilian" onClose={() => !creating && setCreateOpen(false)} widthClassName="max-w-lg">
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setCreating(true);
            try {
              await adminFetch('/api/create-civilian', { method: 'POST', body: JSON.stringify(form) });
              toast.success('Civilian created successfully.');
              setCreateOpen(false);
              setForm({ email: '', password: '', fullName: '', phone: '', address: '' });
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
            <span className="mb-1 block text-sm font-medium text-slate-700">Full name</span>
            <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Phone</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Address</span>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" disabled={creating} onClick={() => setCreateOpen(false)} className="h-10 rounded-lg px-4 text-sm text-slate-600">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-4 text-sm font-medium text-white disabled:opacity-50">
              {creating ? <Loader2 size={16} className="animate-spin" /> : null}
              {creating ? 'Creating...' : 'Create Civilian'}
            </button>
          </div>
        </form>
      </Dialog>

      <DisableAccountDialog
        open={Boolean(disabling)}
        accountLabel={disabling?.name || disabling?.email || ''}
        accountKind="civilian"
        busy={busy}
        onClose={() => setDisabling(null)}
        onConfirm={async (reason) => {
          if (!disabling) return;
          await run('Civilian account disabled.', async () => {
            await adminFetch('/api/accounts/disable', {
              method: 'POST',
              body: JSON.stringify({ uid: disabling.id, accountType: 'civilian', reason }),
            });
            setDisabling(null);
            setSelected(null);
          });
        }}
      />
      <EnableAccountDialog
        open={Boolean(enabling)}
        accountLabel={enabling?.name || enabling?.email || ''}
        accountKind="civilian"
        busy={busy}
        onClose={() => setEnabling(null)}
        onConfirm={async () => {
          if (!enabling) return;
          await run('Civilian account enabled.', async () => {
            await adminFetch('/api/accounts/enable', {
              method: 'POST',
              body: JSON.stringify({ uid: enabling.id, accountType: 'civilian' }),
            });
            setEnabling(null);
          });
        }}
      />
    </>
  );
}
