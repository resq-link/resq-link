'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { DataTable } from '@/components/data-table/DataTable';
import { TableSearch } from '@/components/data-table/TableSearch';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { adminFetch } from '@/lib/adminFetch';
import { formatDateTime } from '@/lib/dates';
import { useAdminKycList } from '@/hooks/useAdminKycList';
import { useToast } from '@/components/ToastProvider';
import type { KycListItem } from '@/lib/accountTypes';

const TABS = [
  { key: 'pending' as const, label: 'Pending' },
  { key: 'approved' as const, label: 'Approved' },
  { key: 'rejected' as const, label: 'Rejected' },
];

export default function KycPage() {
  const toast = useToast();
  const list = useAdminKycList();
  const { fetchApplicantMedia } = list;
  const [selected, setSelected] = useState<KycListItem | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selected) {
      setSelectedMedia(null);
      return;
    }
    if (selected.govIdFrontUrl) {
      setSelectedMedia(selected.govIdFrontUrl);
      return;
    }
    setMediaLoading(true);
    void fetchApplicantMedia(selected.id)
      .then((item) => setSelectedMedia(item.govIdFrontUrl || null))
      .catch(() => setSelectedMedia(null))
      .finally(() => setMediaLoading(false));
  }, [fetchApplicantMedia, selected]);

  const emptyCopy =
    list.tab === 'pending'
      ? { title: 'No pending KYC applications.', description: 'All current submissions have been reviewed.' }
      : list.tab === 'approved'
        ? { title: 'No approved KYC records.', description: 'Approved applicants will appear here.' }
        : { title: 'No rejected KYC records.', description: 'Rejected applications will appear here.' };

  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {(['pending', 'approved', 'rejected'] as const).map((key) => (
          <div key={key} className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-admin-card">
            {list.initialLoading && list.items.length === 0 ? (
              <span className="mt-1 inline-block h-8 w-12 animate-pulse rounded-md bg-slate-200/90" aria-hidden="true" />
            ) : (
              <p className="text-2xl font-semibold tabular-nums text-slate-900">{list.counts[key]}</p>
            )}
            <p className="mt-1 text-sm capitalize text-slate-500">{key}</p>
            <span
              aria-hidden="true"
              className={`mt-3 block h-0.5 w-8 rounded-full ${
                key === 'pending' ? 'bg-amber-400/80' : key === 'approved' ? 'bg-primary-500/70' : 'bg-red-400/80'
              }`}
            />
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm" role="tablist" aria-label="KYC status">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={list.tab === item.key}
              onClick={() => list.setTab(item.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-admin ${
                list.tab === item.key
                  ? 'bg-primary-500/15 text-primary-700 ring-1 ring-inset ring-primary-400/25'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <TableSearch label="Search applicant" placeholder="Search applicant..." value={list.search} onChange={list.setSearch} />
      </div>

      {list.error ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm text-red-700">{list.error}</p>
          <button
            type="button"
            onClick={() => void list.reload()}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      <DataTable
        columns={[
          { key: 'applicant', header: 'Applicant', render: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
          { key: 'submitted', header: 'Submitted', render: (row) => formatDateTime(row.kycSubmittedAt) },
          { key: 'status', header: 'Status', render: () => list.tab.charAt(0).toUpperCase() + list.tab.slice(1) },
          {
            key: 'action',
            header: 'Action',
            render: (row) => (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelected(row);
                  setNotes('');
                }}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Review
              </button>
            ),
          },
        ]}
        rows={list.items}
        loading={list.initialLoading}
        refreshing={list.refreshing}
        emptyTitle={emptyCopy.title}
        emptyDescription={emptyCopy.description}
        onRowClick={(row) => {
          setSelected(row);
          setNotes('');
        }}
      />

      <Drawer open={Boolean(selected)} title="Applicant Verification" onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Applicant Information</h3>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-slate-500">Name</dt><dd className="text-slate-900">{selected.name}</dd></div>
                <div><dt className="text-slate-500">Email</dt><dd className="text-slate-900">{selected.email || '—'}</dd></div>
                <div><dt className="text-slate-500">Phone</dt><dd className="text-slate-900">{selected.phone || '—'}</dd></div>
                <div><dt className="text-slate-500">Submission date</dt><dd className="text-slate-900">{formatDateTime(selected.kycSubmittedAt)}</dd></div>
              </dl>
            </section>
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted Identification</h3>
              <p className="mb-2 text-sm text-slate-600">ID type: {selected.govIdType || '—'}</p>
              <button
                type="button"
                onClick={() => selectedMedia && setPreviewUrl(selectedMedia)}
                className="h-40 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
              >
                {mediaLoading ? (
                  <span className="flex h-full items-center justify-center text-sm text-slate-500">Loading ID...</span>
                ) : selectedMedia ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedMedia} alt={`${selected.name} government ID`} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-sm text-slate-500">No ID</span>
                )}
              </button>
              {selectedMedia ? (
                <p className="mt-2 text-xs text-slate-500">Select the image to view it enlarged.</p>
              ) : null}
            </section>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Review Notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-[96px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            {selected.status === 'pending_kyc_review' ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectOpen(true)}
                  className="h-10 flex-1 rounded-lg border border-red-200 text-sm font-medium text-red-700"
                >
                  Reject Application
                </button>
                <button
                  type="button"
                  onClick={() => setApproveOpen(true)}
                  className="h-10 flex-1 rounded-lg bg-primary-500 text-sm font-medium text-white"
                >
                  Approve Applicant
                </button>
              </div>
            ) : selected.kycRejectionReason ? (
              <p className="text-sm text-red-700">Reason: {selected.kycRejectionReason}</p>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      {previewUrl ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6">
          <button type="button" onClick={() => setPreviewUrl(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" aria-label="Close preview">
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Government ID" className="max-h-[90vh] max-w-full rounded-lg" />
        </div>
      ) : null}

      <Dialog open={approveOpen} title="Approve applicant?" onClose={() => !busy && setApproveOpen(false)}>
        <p className="text-sm text-slate-600">
          {selected?.name} will be marked verified and can use the civilian app.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => setApproveOpen(false)} className="h-10 rounded-lg px-4 text-sm text-slate-600">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!selected) return;
              setBusy(true);
              try {
                await adminFetch('/api/kyc/approve', { method: 'POST', body: JSON.stringify({ uid: selected.id, notes }) });
                toast.success('KYC application approved.');
                setApproveOpen(false);
                setSelected(null);
                list.invalidate();
                await list.reload();
              } catch (err) {
                toast.error((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {busy ? 'Approving...' : 'Approve Applicant'}
          </button>
        </div>
      </Dialog>

      <Dialog open={rejectOpen} title="Reject application?" onClose={() => !busy && setRejectOpen(false)}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Reason</span>
          <textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            className="min-h-[96px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => setRejectOpen(false)} className="h-10 rounded-lg px-4 text-sm text-slate-600">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!selected) return;
              setBusy(true);
              try {
                await adminFetch('/api/kyc/reject', {
                  method: 'POST',
                  body: JSON.stringify({ uid: selected.id, reason: rejectReason, notes }),
                });
                toast.success('KYC application rejected.');
                setRejectOpen(false);
                setRejectReason('');
                setSelected(null);
                list.invalidate();
                await list.reload();
              } catch (err) {
                toast.error((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {busy ? 'Rejecting...' : 'Reject Application'}
          </button>
        </div>
      </Dialog>
    </>
  );
}
