'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { ResetPasswordDialog } from '@/components/accounts/ResetPasswordDialog';
import { StaffEditDrawer } from '@/components/accounts/StaffEditDrawer';
import { CreateStaffDialog } from '@/components/accounts/CreateStaffDialog';
import { DetailItem, DetailList } from '@/components/accounts/DetailList';
import { Drawer } from '@/components/ui/Drawer';
import { useAccountList } from '@/hooks/useAccountList';
import { useAgencies } from '@/hooks/useAgencies';
import { useAdminTeams } from '@/hooks/useAdminTeams';
import { adminFetch } from '@/lib/adminFetch';
import { agencyDisplay, agencyLabel } from '@/lib/agencies';
import { formatDateTime } from '@/lib/dates';
import { staffAccountStatus } from '@/lib/status';
import { useToast } from '@/components/ToastProvider';
import type { StaffAccountRecord } from '@/lib/accountTypes';

type Kind = 'dispatcher' | 'responder';

export function StaffAccountsPage({ kind }: { kind: Kind }) {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [agency, setAgency] = useState(() => searchParams.get('agency')?.trim().toUpperCase() || 'all');
  const [status, setStatus] = useState(() => {
    const fromQuery = searchParams.get('status')?.trim().toLowerCase();
    return fromQuery === 'active' || fromQuery === 'disabled' ? fromQuery : 'all';
  });
  const { options: agencyOptions } = useAgencies();
  const activeAgencyOptions = useMemo(
    () => agencyOptions.filter((item) => item.isActive),
    [agencyOptions]
  );
  const extraParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (agency !== 'all') params.agency = agency;
    if (status !== 'all') params.status = status;
    return params;
  }, [agency, status]);
  const list = useAccountList<StaffAccountRecord>(kind === 'dispatcher' ? 'dispatchers' : 'responders', extraParams);
  const { teams } = useAdminTeams();
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<StaffAccountRecord | null>(null);
  const [editing, setEditing] = useState<StaffAccountRecord | null>(null);
  const [disabling, setDisabling] = useState<StaffAccountRecord | null>(null);
  const [enabling, setEnabling] = useState<StaffAccountRecord | null>(null);
  const [resetting, setResetting] = useState<StaffAccountRecord | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fromAgency = searchParams.get('agency')?.trim().toUpperCase();
    if (fromAgency) setAgency(fromAgency);
    const fromStatus = searchParams.get('status')?.trim().toLowerCase();
    if (fromStatus === 'active' || fromStatus === 'disabled' || fromStatus === 'all') {
      setStatus(fromStatus);
    }
  }, [searchParams]);

  const noun = kind === 'dispatcher' ? 'dispatcher' : 'responder';
  const title = kind === 'dispatcher' ? 'Dispatchers' : 'Responders';

  const agencyFilterOptions = useMemo(() => {
    const codes = new Map(agencyOptions.map((item) => [item.code, item]));
    if (agency !== 'all' && !codes.has(agency)) {
      codes.set(agency, { value: agency, code: agency, label: agency, isActive: false });
    }
    return [
      { value: 'all', label: 'All agencies' },
      ...[...codes.values()].map((item) => ({ value: item.code, label: item.code })),
    ];
  }, [agencyOptions, agency]);

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
            Add {title.slice(0, -1)}
          </Button>
        }
      />

      <div className="mb-4">
        <TableFilters>
          <TableSearch
            label={`Search ${noun}s`}
            placeholder={`Search ${noun}s...`}
            value={list.search}
            onChange={list.setSearch}
          />
          <FilterSelect label="Agency" value={agency} onChange={setAgency} options={agencyFilterOptions} />
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
          {
            key: 'name',
            header: 'Name',
            render: (row) => (
              <div>
                <p className="font-medium text-slate-900">{row.fullName || '—'}</p>
                <p className="text-xs text-slate-500">{row.email}</p>
              </div>
            ),
          },
          { key: 'agency', header: 'Agency', render: (row) => agencyLabel(row.agency, agencyOptions) },
          { key: 'team', header: 'Team', render: (row) => row.teamLabel || '—' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <AccountStatusBadge status={staffAccountStatus(row.active)} />,
          },
          {
            key: 'updated',
            header: 'Last Updated',
            render: (row) => formatDateTime(row.updatedAt || row.createdAt),
          },
          {
            key: 'actions',
            header: 'Actions',
            className: 'w-16',
            render: (row) => (
              <ActionMenu
                items={[
                  { label: 'View Details', onClick: () => setSelected(row) },
                  { label: 'Edit Account', onClick: () => setEditing(row) },
                  { label: 'Change Agency', onClick: () => setEditing(row) },
                  { label: 'Change Team', onClick: () => setEditing(row) },
                  { label: 'Reset Password', onClick: () => setResetting(row) },
                  row.active
                    ? { label: 'Disable Account', onClick: () => setDisabling(row), tone: 'danger' }
                    : { label: 'Enable Account', onClick: () => setEnabling(row) },
                ]}
              />
            ),
          },
        ]}
        rows={list.items}
        loading={list.initialLoading}
        refreshing={list.refreshing}
        error={list.error}
        emptyTitle={`No ${noun}s found.`}
        emptyDescription={`Try changing your filters or add a ${noun}.`}
        onRowClick={setSelected}
        onRetry={() => void list.reload()}
      />
      <TablePagination page={list.page} pageSize={list.pageSize} total={list.total} onPageChange={list.setPage} />

      <Drawer open={Boolean(selected)} title={kind === 'dispatcher' ? 'Dispatcher Account' : 'Responder Account'} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Account</h3>
              <DetailList>
                <DetailItem label="Name" value={selected.fullName} />
                <DetailItem label="Email" value={selected.email} />
                <DetailItem label="Agency" value={agencyDisplay(selected.agency, agencyOptions)} />
                <DetailItem label="Designation" value={selected.designation || noun} />
                <DetailItem label="Team" value={selected.teamLabel} />
                <DetailItem label="Account Status" value={<AccountStatusBadge status={staffAccountStatus(selected.active)} />} />
                <DetailItem label="Created" value={formatDateTime(selected.createdAt)} />
                <DetailItem label="Last Updated" value={formatDateTime(selected.updatedAt)} />
              </DetailList>
            </section>
            <section className="border-t border-slate-200 pt-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Account Actions</h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setEditing(selected)} className="h-9 rounded-lg border border-slate-200 px-3 text-sm">
                  Edit Account
                </button>
                <button type="button" onClick={() => setResetting(selected)} className="h-9 rounded-lg border border-slate-200 px-3 text-sm">
                  Reset Password
                </button>
                {selected.active ? (
                  <button type="button" onClick={() => setDisabling(selected)} className="h-9 rounded-lg border border-red-200 px-3 text-sm text-red-700">
                    Disable Account
                  </button>
                ) : (
                  <button type="button" onClick={() => setEnabling(selected)} className="h-9 rounded-lg border border-slate-200 px-3 text-sm">
                    Enable Account
                  </button>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </Drawer>

      <CreateStaffDialog
        open={createOpen}
        kind={kind}
        teams={teams}
        agencies={activeAgencyOptions}
        busy={creating}
        onClose={() => setCreateOpen(false)}
        onCreate={async (input) => {
          setCreating(true);
          try {
            await adminFetch(kind === 'dispatcher' ? '/api/create-dispatcher' : '/api/create-responder', {
              method: 'POST',
              body: JSON.stringify(input),
            });
            toast.success(`${title.slice(0, -1)} created successfully.`);
            setCreateOpen(false);
            list.invalidateType();
            await list.reload();
          } catch (error) {
            toast.error((error as Error).message);
          } finally {
            setCreating(false);
          }
        }}
      />

      <StaffEditDrawer
        open={Boolean(editing)}
        staff={editing}
        teams={teams}
        agencies={agencyOptions}
        busy={busy}
        onClose={() => setEditing(null)}
        onSave={async (input) => {
          if (!editing) return;
          await run(`${title.slice(0, -1)} updated.`, async () => {
            await adminFetch('/api/accounts/update-staff', {
              method: 'POST',
              body: JSON.stringify({ uid: editing.id, accountType: kind, ...input }),
            });
            setEditing(null);
            setSelected((current) => (current?.id === editing.id ? { ...current, ...input, teamLabel: input.teamLabel } : current));
          });
        }}
      />

      <DisableAccountDialog
        open={Boolean(disabling)}
        accountLabel={disabling?.fullName || disabling?.email || ''}
        accountKind={noun}
        busy={busy}
        onClose={() => setDisabling(null)}
        onConfirm={async (reason) => {
          if (!disabling) return;
          await run(`${title.slice(0, -1)} account disabled.`, async () => {
            await adminFetch('/api/accounts/disable', {
              method: 'POST',
              body: JSON.stringify({ uid: disabling.id, accountType: kind, reason }),
            });
            setDisabling(null);
            setSelected(null);
          });
        }}
      />

      <EnableAccountDialog
        open={Boolean(enabling)}
        accountLabel={enabling?.fullName || enabling?.email || ''}
        accountKind={noun}
        busy={busy}
        onClose={() => setEnabling(null)}
        onConfirm={async () => {
          if (!enabling) return;
          await run(`${title.slice(0, -1)} account enabled.`, async () => {
            await adminFetch('/api/accounts/enable', {
              method: 'POST',
              body: JSON.stringify({ uid: enabling.id, accountType: kind }),
            });
            setEnabling(null);
          });
        }}
      />

      <ResetPasswordDialog
        open={Boolean(resetting)}
        accountLabel={resetting?.fullName || resetting?.email || ''}
        busy={busy}
        onClose={() => setResetting(null)}
        onConfirm={async (password) => {
          if (!resetting) return;
          await run('Password reset successfully.', async () => {
            await adminFetch('/api/accounts/reset-password', {
              method: 'POST',
              body: JSON.stringify({ uid: resetting.id, accountType: kind, password }),
            });
            setResetting(null);
          });
        }}
      />
    </>
  );
}
