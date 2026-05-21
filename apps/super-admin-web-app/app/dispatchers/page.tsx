'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getFirebaseAuth, getFirebaseFirestore, collection, getDocs } from '@packages/firebase';
import type { DispatcherRole } from '@packages/firebase';
import { Headset, Plus, Loader2 } from 'lucide-react';

const ROLES: { value: DispatcherRole; label: string }[] = [
  { value: 'BFP', label: 'Bureau of Fire Protection' },
  { value: 'PNP', label: 'Philippine National Police' },
  { value: 'MDRRMO', label: 'MDRRMO' },
  { value: 'AMBULANCE', label: 'Ambulance Service' },
  { value: 'PCG', label: 'Philippine Coast Guard' },
];

export default function DispatchersPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<DispatcherRole>('BFP');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dispatchers, setDispatchers] = useState<Array<{ id: string; email: string; role: string; active: boolean; designation: string }>>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(getFirebaseFirestore(), 'dispatchers'));
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              email: data.email || '',
              role: data.role || '',
              active: data.active !== false,
              designation: data.designation || '',
            };
          })
          .filter((account) => !account.designation.toLowerCase().includes('responder'));
        setDispatchers(list);
      } catch {
        setMessage({ type: 'error', text: 'Failed to load dispatchers' });
      } finally {
        setFetching(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      if (!token) throw new Error('Not signed in');
      const res = await fetch('/api/create-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, password, role }),
      });
      let data: { error?: string; uid?: string } = {};
      try {
        data = await res.json();
      } catch {
        if (!res.ok) throw new Error('Server error. Check the console for details.');
      }
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      if (!data.uid) throw new Error('Server did not return user id');
      setMessage({ type: 'success', text: `Dispatcher created: ${email}` });
      setDispatchers((prev) => [...prev, { id: data.uid!, email, role, active: true, designation: 'dispatcher' }]);
      setEmail('');
      setPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600/20 text-primary-400">
            <Headset size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Dispatchers</h1>
            <p className="text-slate-400">Create command-side dispatcher accounts for web coordination</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Plus size={20} /> Create Dispatcher
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-800 bg-slate-900 text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-800 bg-slate-900 text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as DispatcherRole)} className="w-full px-3 py-2 border border-slate-800 bg-slate-900 text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {message && <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{message.text}</p>}
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium disabled:opacity-50">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Create Dispatcher
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Existing Dispatchers</h2>
          {fetching ? (
            <p className="text-slate-400">Loading...</p>
          ) : (
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/80 text-slate-300">
                  <tr>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatchers.map((d) => (
                    <tr key={d.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 text-slate-200">{d.email}</td>
                      <td className="px-4 py-3 text-slate-400">{d.role}</td>
                      <td className="px-4 py-3"><span className={d.active ? 'text-green-400' : 'text-slate-500'}>{d.active ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
