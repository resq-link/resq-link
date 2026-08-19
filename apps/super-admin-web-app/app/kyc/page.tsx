'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getFirebaseAuth, getFirebaseFirestore, collection, getDocs } from '@packages/firebase';
import { ShieldCheck, Loader2, X } from 'lucide-react';

type KycStatus = 'pending_kyc_review' | 'active' | 'rejected';
type TabKey = 'pending' | 'approved' | 'rejected';

interface KycUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  govIdType?: string;
  govIdFrontUrl?: string;
  status?: string;
  kycRejectionReason?: string;
  kycSubmittedAt?: { toDate?: () => Date } | null;
}

const TABS: { key: TabKey; label: string; status: KycStatus }[] = [
  { key: 'pending', label: 'Pending', status: 'pending_kyc_review' },
  { key: 'approved', label: 'Approved', status: 'active' },
  { key: 'rejected', label: 'Rejected', status: 'rejected' },
];

function formatDate(value: KycUser['kycSubmittedAt']) {
  try {
    const date = value?.toDate?.();
    if (!date) return '—';
    return date.toLocaleString();
  } catch {
    return '—';
  }
}

export default function KycPage() {
  const [tab, setTab] = useState<TabKey>('pending');
  const [users, setUsers] = useState<KycUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rejectUid, setRejectUid] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const load = async () => {
    setFetching(true);
    try {
      const snap = await getDocs(collection(getFirebaseFirestore(), 'users'));
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || '—',
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          govIdType: data.govIdType,
          govIdFrontUrl: data.govIdFrontUrl,
          status: data.status,
          kycRejectionReason: data.kycRejectionReason,
          kycSubmittedAt: data.kycSubmittedAt,
        };
      });
      setUsers(list);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load KYC submissions' });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const status = TABS.find((item) => item.key === tab)?.status;
    return users.filter((user) => {
      if (tab === 'approved') {
        return user.status === 'active' && Boolean(user.govIdFrontUrl || user.govIdType);
      }
      return user.status === status;
    });
  }, [users, tab]);

  const callKycApi = async (path: string, body: Record<string, string>) => {
    const token = await getFirebaseAuth().currentUser?.getIdToken();
    if (!token) throw new Error('Not signed in');
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    let data: { error?: string } = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (!res.ok) throw new Error(data.error || 'Request failed');
  };

  const handleApprove = async (uid: string) => {
    setBusyUid(uid);
    setMessage(null);
    try {
      await callKycApi('/api/kyc/approve', { uid });
      setUsers((prev) => prev.map((user) => (user.id === uid ? { ...user, status: 'active' } : user)));
      setMessage({ type: 'success', text: 'KYC approved. Account is now active.' });
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setBusyUid(null);
    }
  };

  const handleReject = async () => {
    if (!rejectUid) return;
    setBusyUid(rejectUid);
    setMessage(null);
    try {
      await callKycApi('/api/kyc/reject', { uid: rejectUid, reason: rejectReason });
      setUsers((prev) =>
        prev.map((user) =>
          user.id === rejectUid
            ? { ...user, status: 'rejected', kycRejectionReason: rejectReason }
            : user
        )
      );
      setMessage({ type: 'success', text: 'KYC rejected.' });
      setRejectUid(null);
      setRejectReason('');
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600/20 text-primary-400">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">KYC Review</h1>
            <p className="text-slate-400">Review civilian identity documents and activate accounts</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === item.key
                  ? 'bg-primary-600/90 text-white'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {message && (
          <p className={`text-sm mb-4 ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {message.text}
          </p>
        )}

        {fetching ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((user) => (
              <div key={user.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="grid gap-6 md:grid-cols-[160px_1fr_auto]">
                  <button
                    type="button"
                    onClick={() => user.govIdFrontUrl && setPreviewUrl(user.govIdFrontUrl)}
                    className="h-36 w-full overflow-hidden rounded-lg bg-slate-800 border border-slate-700"
                  >
                    {user.govIdFrontUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.govIdFrontUrl}
                        alt={`${user.name} government ID`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-sm">No ID</div>
                    )}
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">{user.name}</h2>
                    <p className="text-sm text-slate-400 mt-1">{user.email || '—'}</p>
                    <p className="text-sm text-slate-400">{user.phone || '—'}</p>
                    <p className="text-sm text-slate-400 mt-2">{user.address || 'No address'}</p>
                    <p className="text-sm text-slate-300 mt-2">
                      ID type: {user.govIdType || '—'} · Submitted: {formatDate(user.kycSubmittedAt)}
                    </p>
                    {user.kycRejectionReason ? (
                      <p className="text-sm text-red-300 mt-2">Reason: {user.kycRejectionReason}</p>
                    ) : null}
                  </div>
                  {tab === 'pending' ? (
                    <div className="flex flex-col gap-2 justify-center">
                      <button
                        type="button"
                        disabled={busyUid === user.id}
                        onClick={() => handleApprove(user.id)}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
                      >
                        {busyUid === user.id ? <Loader2 size={16} className="animate-spin" /> : 'Approve'}
                      </button>
                      <button
                        type="button"
                        disabled={busyUid === user.id}
                        onClick={() => {
                          setRejectUid(user.id);
                          setRejectReason('');
                        }}
                        className="px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="rounded-lg border border-slate-800 px-4 py-10 text-center text-slate-500">
                No {tab} KYC records
              </div>
            )}
          </div>
        )}
      </div>

      {previewUrl ? (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-slate-800"
            aria-label="Close preview"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Government ID" className="max-h-[90vh] max-w-full rounded-lg" />
        </div>
      ) : null}

      {rejectUid ? (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-3">Reject KYC</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectUid(null)}
                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-2 rounded-lg bg-red-600 text-white"
              >
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ProtectedRoute>
  );
}
