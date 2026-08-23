'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
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
import { DeleteConfirmationDialog } from '@/components/admin/DeleteConfirmationDialog';
import { TableExportMenu } from '@/components/admin/TableExportMenu';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { useAccountList } from '@/hooks/useAccountList';
import { adminFetch } from '@/lib/adminFetch';
import { formatDate, formatDateTime } from '@/lib/dates';
import { civilianAccountStatus, verificationLabel } from '@/lib/status';
import { routes } from '@/lib/routes';
import { useToast } from '@/components/ToastProvider';
import { fetchAllFilteredPages, type AdminExportColumn } from '@/lib/adminExport';
import type { CivilianAccountRecord, PaginatedResponse } from '@/lib/accountTypes';

const CIVILIAN_EXPORT_COLUMNS: AdminExportColumn<CivilianAccountRecord>[] = [
  { header: 'Name', accessor: (row) => row.name || '—' },
  { header: 'Email', accessor: (row) => row.email || '—' },
  { header: 'Verification', accessor: (row) => verificationLabel(row.verification) },
  {
    header: 'Account Status',
    accessor: (row) => civilianAccountStatus(row.status, row.disabled).label,
  },
  { header: 'Registered', accessor: (row) => formatDate(row.createdAt) },
];

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
  const [deleting, setDeleting] = useState<CivilianAccountRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '', address: '' });

  const exportFilters = useMemo(() => {
    const parts: string[] = [];
    if (list.appliedSearch.trim()) parts.push(`Search: ${list.appliedSearch.trim()}`);
    if (verification !== 'all') parts.push(`Verification: ${verification}`);
    if (status !== 'all') parts.push(`Status: ${status}`);
    return parts;
  }, [list.appliedSearch, status, verification]);

  const getExportRows = useCallback(async () => {
    return fetchAllFilteredPages<CivilianAccountRecord>({
      pageSize: 50,
      fetchPage: async (page, pageSize) => {
        const params = new URLSearchParams({
          type: 'civilians',
          search: list.appliedSearch,
          page: String(page),
          pageSize: String(pageSize),
          ...extraParams,
        });
        const data = await adminFetch<PaginatedResponse<CivilianAccountRecord>>(
          `/api/accounts/list?${params.toString()}`
        );
        return { items: data.items, total: data.total };
      },
    });
  }, [extraParams, list.appliedSearch]);

  const run = async (message: string, work: () => Promise<void>, errorFallback = 'Unable to update civilian.') => {
    setBusy(true);
    try {
      await work();
      toast.success(message);
      list.invalidateType();
      await list.reload();
    } catch (error) {
      toast.error((error as Error).message || errorFallback);
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
        <TableFilters
          actions={
            <TableExportMenu
              title="Civilians"
              fileSlug="Civilians"
              columns={CIVILIAN_EXPORT_COLUMNS}
              getRows={getExportRows}
              filtersSummary={exportFilters}
            />
          }
        >
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
                <p className="font-medium text-admin-fg">{row.name || '—'}</p>
                <p className="text-xs text-admin-fg-subtle">{row.email || '—'}</p>
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
                items={
                  row.role !== 'civilian'
                    ? [{ label: 'View Details', onClick: () => setSelected(row) }]
                    : [
                        { label: 'View Details', onClick: () => setSelected(row) },
                        { label: 'View KYC status', onClick: () => setSelected(row) },
                        row.disabled
                          ? { label: 'Enable Account', onClick: () => setEnabling(row) }
                          : { label: 'Disable Account', onClick: () => setDisabling(row), tone: 'danger' },
                        { label: 'Delete Civilian', onClick: () => setDeleting(row), tone: 'danger' },
                      ]
                }
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
        onRowClick={(row) => {
          if (row.role !== 'civilian') {
            toast.warning('This account cannot be managed as a civilian.');
          }
          setSelected(row);
        }}
        onRetry={() => void list.reload()}
      />
      <TablePagination page={list.page} pageSize={list.pageSize} total={list.total} onPageChange={list.setPage} />

      <Drawer open={Boolean(selected)} title="Civilian Account" onClose={() => setSelected(null)}>
        {selected ? (
          selected.role !== 'civilian' ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                <p className="font-semibold">Account type mismatch</p>
                <p className="mt-2">
                  This account is registered as{' '}
                  <span className="font-medium">{selected.role || 'Unknown / Requires Review'}</span> and
                  cannot be managed as a Civilian.
                </p>
                <p className="mt-2 text-amber-900/80">Email: {selected.email || '—'}</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          ) : (
          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-admin-fg-subtle">Account</h3>
              <DetailList>
                <DetailItem label="Name" value={selected.name} />
                <DetailItem label="Email" value={selected.email} />
                <DetailItem label="Phone" value={selected.phone} />
                <DetailItem label="Role" value="Civilian" />
                <DetailItem
                  label="Account Status"
                  value={<AccountStatusBadge status={civilianAccountStatus(selected.status, selected.disabled)} />}
                />
                <DetailItem label="Created Date" value={formatDateTime(selected.createdAt)} />
              </DetailList>
            </section>
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-admin-fg-subtle">Verification</h3>
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
            <section className="border-t border-admin-border pt-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-admin-fg-subtle">Account Actions</h3>
              <div className="flex flex-wrap gap-2">
                {selected.disabled ? (
                  <button type="button" onClick={() => setEnabling(selected)} className="h-9 rounded-lg border border-admin-border px-3 text-sm">
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
                <button
                  type="button"
                  onClick={() => setDeleting(selected)}
                  className="h-9 rounded-lg border border-red-200 px-3 text-sm text-red-700"
                >
                  Delete Civilian
                </button>
              </div>
            </section>
          </div>
          )
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
              toast.success('Civilian account created successfully.');
              setCreateOpen(false);
              setForm({ email: '', password: '', fullName: '', phone: '', address: '' });
              list.invalidateType();
              await list.reload();
            } catch (error) {
              toast.error((error as Error).message || 'Unable to create civilian.');
            } finally {
              setCreating(false);
            }
          }}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Full name</span>
            <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Email</span>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Password</span>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Phone</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Address</span>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" disabled={creating} onClick={() => setCreateOpen(false)} className="h-10 rounded-lg px-4 text-sm text-admin-fg-muted">
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
          await run('Civilian disabled successfully.', async () => {
            await adminFetch('/api/accounts/disable', {
              method: 'POST',
              body: JSON.stringify({ uid: disabling.id, accountType: 'civilian', reason }),
            });
            setDisabling(null);
            setSelected(null);
          }, 'Unable to disable civilian.');
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
          await run('Civilian enabled successfully.', async () => {
            await adminFetch('/api/accounts/enable', {
              method: 'POST',
              body: JSON.stringify({ uid: enabling.id, accountType: 'civilian' }),
            });
            setEnabling(null);
          }, 'Unable to enable civilian.');
        }}
      />

      <DeleteConfirmationDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.name || deleting?.email || 'Civilian'}?`}
        entityName={deleting?.name || undefined}
        email={deleting?.email || undefined}
        accountTypeLabel={deleting?.role === 'civilian' ? 'Civilian' : deleting?.role || 'Unknown'}
        blocked={Boolean(deleting && deleting.role !== 'civilian')}
        blockedMessage="This account cannot be managed as a civilian."
        description="This removes the civilian from active administration. Submitted incidents and reports remain in operational history. The account will no longer be able to sign in."
        confirmLabel="Delete Civilian"
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={async (reason) => {
          if (!deleting) return;
          if (deleting.role !== 'civilian') {
            toast.warning('This account cannot be managed as a civilian.');
            setDeleting(null);
            return;
          }
          await run('Civilian deleted successfully.', async () => {
            await adminFetch('/api/accounts/delete', {
              method: 'POST',
              body: JSON.stringify({ uid: deleting.id, accountType: 'civilian', reason }),
            });
            setDeleting(null);
            setSelected(null);
          }, 'Unable to delete civilian.');
        }}
      />
    </>
  );
}
