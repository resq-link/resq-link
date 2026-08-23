'use client';

import { useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
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
import { StaffEditDialog } from '@/components/accounts/StaffEditDialog';
import { CreateStaffDialog } from '@/components/accounts/CreateStaffDialog';
import { DetailItem, DetailList } from '@/components/accounts/DetailList';
import { DeleteConfirmationDialog } from '@/components/admin/DeleteConfirmationDialog';
import { TableExportMenu } from '@/components/admin/TableExportMenu';
import { Drawer } from '@/components/ui/Drawer';
import { useAccountList } from '@/hooks/useAccountList';
import { useAgencies } from '@/hooks/useAgencies';
import { useAdminTeams } from '@/hooks/useAdminTeams';
import { adminFetch } from '@/lib/adminFetch';
import { agencyDisplay, agencyLabel } from '@/lib/agencies';
import { formatDateTime } from '@/lib/dates';
import { staffAccountStatus } from '@/lib/status';
import { useToast } from '@/components/ToastProvider';
import { fetchAllFilteredPages, type AdminExportColumn } from '@/lib/adminExport';
import type { ManagedAccountType, PaginatedResponse, StaffAccountRecord } from '@/lib/accountTypes';

type Kind = 'dispatcher' | 'responder';

export function StaffAccountsPage({ kind }: { kind: Kind }) {
  const toast = useToast();
  const searchParams = useSearchParams();
  const isResponder = kind === 'responder';
  const apiAccountType: ManagedAccountType = isResponder ? 'responder' : 'command_center';

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
    if (isResponder && agency !== 'all') params.agency = agency;
    if (status !== 'all') params.status = status;
    return params;
  }, [agency, isResponder, status]);
  const list = useAccountList<StaffAccountRecord>(kind === 'dispatcher' ? 'dispatchers' : 'responders', extraParams);
  const { teams } = useAdminTeams();
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<StaffAccountRecord | null>(null);
  const [editing, setEditing] = useState<StaffAccountRecord | null>(null);
  const [disabling, setDisabling] = useState<StaffAccountRecord | null>(null);
  const [enabling, setEnabling] = useState<StaffAccountRecord | null>(null);
  const [deleting, setDeleting] = useState<StaffAccountRecord | null>(null);
  const [resetting, setResetting] = useState<StaffAccountRecord | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isResponder) return;
    const fromAgency = searchParams.get('agency')?.trim().toUpperCase();
    if (fromAgency) setAgency(fromAgency);
    const fromStatus = searchParams.get('status')?.trim().toLowerCase();
    if (fromStatus === 'active' || fromStatus === 'disabled' || fromStatus === 'all') {
      setStatus(fromStatus);
    }
  }, [isResponder, searchParams]);

  const noun = isResponder ? 'responder' : 'dispatcher';
  const title = isResponder ? 'Responders' : 'Dispatchers';
  const listType = kind === 'dispatcher' ? 'dispatchers' : 'responders';

  const exportColumns = useMemo<AdminExportColumn<StaffAccountRecord>[]>(() => {
    const cols: AdminExportColumn<StaffAccountRecord>[] = [
      {
        header: 'Name',
        accessor: (row) => row.fullName || '—',
      },
      {
        header: 'Email',
        accessor: (row) => row.email || '—',
      },
    ];
    if (isResponder) {
      cols.push({
        header: 'Agency',
        accessor: (row) => agencyLabel(row.agency, agencyOptions),
      });
    }
    cols.push(
      {
        header: 'Status',
        accessor: (row) => staffAccountStatus(row.active).label,
      },
      {
        header: 'Last Updated',
        accessor: (row) => formatDateTime(row.updatedAt || row.createdAt),
      }
    );
    return cols;
  }, [agencyOptions, isResponder]);

  const exportFilters = useMemo(() => {
    const parts: string[] = [];
    if (list.appliedSearch.trim()) parts.push(`Search: ${list.appliedSearch.trim()}`);
    if (isResponder && agency !== 'all') parts.push(`Agency: ${agency}`);
    if (status !== 'all') parts.push(`Status: ${status}`);
    return parts;
  }, [agency, isResponder, list.appliedSearch, status]);

  const getExportRows = useCallback(async () => {
    return fetchAllFilteredPages<StaffAccountRecord>({
      pageSize: 50,
      fetchPage: async (page, pageSize) => {
        const params = new URLSearchParams({
          type: listType,
          search: list.appliedSearch,
          page: String(page),
          pageSize: String(pageSize),
          ...extraParams,
        });
        const data = await adminFetch<PaginatedResponse<StaffAccountRecord>>(
          `/api/accounts/list?${params.toString()}`
        );
        return { items: data.items, total: data.total };
      },
    });
  }, [extraParams, list.appliedSearch, listType]);

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

  const run = async (message: string, work: () => Promise<void>, errorFallback?: string) => {
    setBusy(true);
    try {
      await work();
      toast.success(message);
      list.invalidateType();
      await list.reload();
    } catch (error) {
      toast.error((error as Error).message || errorFallback || `Unable to update ${noun}.`);
    } finally {
      setBusy(false);
    }
  };

  const columns: Array<{
    key: string;
    header: string;
    className?: string;
    render: (row: StaffAccountRecord) => ReactNode;
  }> = [
    {
      key: 'name',
      header: 'Name / Email',
      render: (row) => (
        <div>
          <p className="font-medium text-admin-fg">{row.fullName || '—'}</p>
          <p className="text-xs text-admin-fg-subtle">{row.email}</p>
        </div>
      ),
    },
    ...(isResponder
      ? [
          {
            key: 'agency',
            header: 'Agency',
            render: (row: StaffAccountRecord) => agencyLabel(row.agency, agencyOptions),
          },
        ]
      : []),
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
        <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          <ActionMenu
            items={[
              { label: 'View Details', onClick: () => setSelected(row) },
              { label: `Edit ${title.slice(0, -1)}`, onClick: () => setEditing(row) },
              ...(isResponder
                ? [
                    { label: 'Change Agency', onClick: () => setEditing(row) },
                    { label: 'Change Team', onClick: () => setEditing(row) },
                  ]
                : []),
              { label: 'Reset Password', onClick: () => setResetting(row) },
              row.active
                ? { label: 'Disable Account', onClick: () => setDisabling(row), tone: 'danger' as const }
                : { label: 'Enable Account', onClick: () => setEnabling(row) },
              {
                label: `Delete ${title.slice(0, -1)}`,
                onClick: () => setDeleting(row),
                tone: 'danger' as const,
              },
            ]}
          />
        </div>
      ),
    },
  ];

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
        <TableFilters
          actions={
            <TableExportMenu
              title={title}
              fileSlug={title}
              columns={exportColumns}
              getRows={getExportRows}
              filtersSummary={exportFilters}
            />
          }
        >
          <TableSearch
            label={`Search ${noun}s`}
            placeholder={`Search ${noun}s...`}
            value={list.search}
            onChange={list.setSearch}
          />
          {isResponder ? (
            <FilterSelect label="Agency" value={agency} onChange={setAgency} options={agencyFilterOptions} />
          ) : null}
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
        columns={columns}
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

      <Drawer
        open={Boolean(selected)}
        title={isResponder ? 'Responder Account' : 'Dispatcher Account'}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-admin-fg-subtle">Account</h3>
              <DetailList>
                <DetailItem label="Name" value={selected.fullName} />
                <DetailItem label="Email" value={selected.email} />
                {isResponder ? (
                  <>
                    <DetailItem label="Agency" value={agencyDisplay(selected.agency, agencyOptions)} />
                    <DetailItem label="Team" value={selected.teamLabel} />
                  </>
                ) : null}
                <DetailItem
                  label="Account Status"
                  value={<AccountStatusBadge status={staffAccountStatus(selected.active)} />}
                />
                <DetailItem label="Created" value={formatDateTime(selected.createdAt)} />
                <DetailItem label="Last Updated" value={formatDateTime(selected.updatedAt)} />
              </DetailList>
            </section>
            <section className="border-t border-admin-border pt-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-admin-fg-subtle">Account Actions</h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setEditing(selected)} className="h-9 rounded-lg border border-admin-border px-3 text-sm">
                  Edit {title.slice(0, -1)}
                </button>
                <button type="button" onClick={() => setResetting(selected)} className="h-9 rounded-lg border border-admin-border px-3 text-sm">
                  Reset Password
                </button>
                {selected.active ? (
                  <button type="button" onClick={() => setDisabling(selected)} className="h-9 rounded-lg border border-red-200 px-3 text-sm text-red-700">
                    Disable Account
                  </button>
                ) : (
                  <button type="button" onClick={() => setEnabling(selected)} className="h-9 rounded-lg border border-admin-border px-3 text-sm">
                    Enable Account
                  </button>
                )}
                <button type="button" onClick={() => setDeleting(selected)} className="h-9 rounded-lg border border-red-200 px-3 text-sm text-red-700">
                  Delete {title.slice(0, -1)}
                </button>
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
            await adminFetch(isResponder ? '/api/create-responder' : '/api/create-dispatcher', {
              method: 'POST',
              body: JSON.stringify(input),
            });
            toast.success(
              isResponder
                ? 'Responder account created successfully.'
                : 'Dispatcher account created successfully.'
            );
            setCreateOpen(false);
            list.invalidateType();
            await list.reload();
          } catch (error) {
            toast.error(
              (error as Error).message ||
                (isResponder ? 'Unable to create responder.' : 'Unable to create dispatcher.')
            );
          } finally {
            setCreating(false);
          }
        }}
      />

      <StaffEditDialog
        open={Boolean(editing)}
        kind={kind}
        staff={editing}
        teams={teams}
        agencies={agencyOptions}
        busy={busy}
        onClose={() => setEditing(null)}
        onSave={async (input) => {
          if (!editing) return;
          const agencyChanged =
            isResponder &&
            Boolean(input.agency) &&
            input.agency.toUpperCase() !== String(editing.agency || '').toUpperCase();
          const successMessage = isResponder
            ? agencyChanged
              ? 'Responder agency updated successfully.'
              : 'Responder updated successfully.'
            : 'Dispatcher updated successfully.';
          await run(
            successMessage,
            async () => {
              if (isResponder) {
                await adminFetch('/api/accounts/update-staff', {
                  method: 'POST',
                  body: JSON.stringify({ uid: editing.id, accountType: 'responder', ...input }),
                });
                // Update details drawer only if that account is already open — do not open it.
                setSelected((current) =>
                  current?.id === editing.id
                    ? { ...current, ...input, teamLabel: input.teamLabel ?? current.teamLabel }
                    : current
                );
              } else {
                await adminFetch('/api/command-centers/update', {
                  method: 'POST',
                  body: JSON.stringify({
                    uid: editing.id,
                    name: input.fullName,
                  }),
                });
                setSelected((current) =>
                  current?.id === editing.id ? { ...current, fullName: input.fullName } : current
                );
              }
              setEditing(null);
            },
            isResponder ? 'Unable to update responder.' : 'Unable to update dispatcher.'
          );
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
          await run(
            isResponder ? 'Responder disabled successfully.' : 'Dispatcher disabled successfully.',
            async () => {
              await adminFetch('/api/accounts/disable', {
                method: 'POST',
                body: JSON.stringify({ uid: disabling.id, accountType: apiAccountType, reason }),
              });
              setDisabling(null);
              setSelected(null);
            },
            isResponder ? 'Unable to disable responder.' : 'Unable to disable dispatcher.'
          );
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
          await run(
            isResponder ? 'Responder enabled successfully.' : 'Dispatcher enabled successfully.',
            async () => {
              await adminFetch('/api/accounts/enable', {
                method: 'POST',
                body: JSON.stringify({ uid: enabling.id, accountType: apiAccountType }),
              });
              setEnabling(null);
            },
            isResponder ? 'Unable to enable responder.' : 'Unable to enable dispatcher.'
          );
        }}
      />

      <ResetPasswordDialog
        open={Boolean(resetting)}
        accountLabel={resetting?.fullName || resetting?.email || ''}
        busy={busy}
        onClose={() => setResetting(null)}
        onConfirm={async (password) => {
          if (!resetting) return;
          await run(
            'Password reset successfully.',
            async () => {
              await adminFetch('/api/accounts/reset-password', {
                method: 'POST',
                body: JSON.stringify({ uid: resetting.id, accountType: apiAccountType, password }),
              });
              setResetting(null);
            },
            'Unable to reset password.'
          );
        }}
      />

      <DeleteConfirmationDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.fullName || deleting?.email || title.slice(0, -1)}?`}
        entityName={deleting?.fullName || undefined}
        email={deleting?.email || undefined}
        accountTypeLabel={isResponder ? 'Responder' : 'Dispatcher'}
        blocked={Boolean(
          deleting?.email &&
            ['command@rescue.ph', 'superadmin@spup.com'].includes(deleting.email.toLowerCase())
        )}
        blockedMessage="This is a protected operational account and cannot be deleted from Super Admin."
        description={`This removes the ${noun} from active RESQ-LINK administration. Incident history stays intact. The account will no longer be able to sign in. This cannot be undone from the console.`}
        confirmLabel={`Delete ${title.slice(0, -1)}`}
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={async (reason) => {
          if (!deleting) return;
          await run(
            isResponder ? 'Responder deleted successfully.' : 'Dispatcher deleted successfully.',
            async () => {
              await adminFetch('/api/accounts/delete', {
                method: 'POST',
                body: JSON.stringify({ uid: deleting.id, accountType: apiAccountType, reason }),
              });
              setDeleting(null);
              setSelected(null);
            },
            isResponder ? 'Unable to delete responder.' : 'Unable to delete dispatcher.'
          );
        }}
      />
    </>
  );
}
