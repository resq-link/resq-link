'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getFirebaseAuth, getFirebaseFirestore, collection, getDocs, query, where } from '@packages/firebase';
import { Users, Plus, Loader2 } from 'lucide-react';

export default function CiviliansPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [civilians, setCivilians] = useState<Array<{ id: string; email?: string; name?: string; phone?: string; role?: string }>>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const usersRef = collection(getFirebaseFirestore(), 'users');
        const q = query(usersRef, where('role', '==', 'civilian'));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            email: data.email,
            name: data.name,
            phone: data.phone,
            role: data.role,
          };
        });
        setCivilians(list);
      } catch (e) {
        try {
          const snap = await getDocs(collection(getFirebaseFirestore(), 'users'));
          const list = snap.docs.map((d) => {
            const data = d.data();
            return { id: d.id, email: data.email, name: data.name, phone: data.phone, role: data.role };
          });
          setCivilians(list);
        } catch {
          setMessage({ type: 'error', text: 'Failed to load civilians' });
        }
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
      const res = await fetch('/api/create-civilian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, password, fullName, phone, address }),
      });
      let data: { error?: string; uid?: string } = {};
      try {
        data = await res.json();
      } catch {
        if (!res.ok) throw new Error('Server error. Check the console for details.');
      }
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      const newUid = data.uid;
      if (!newUid) throw new Error('Server did not return user id');
      setMessage({ type: 'success', text: `Civilian created: ${email}` });
      setEmail('');
      setPassword('');
      setFullName('');
      setPhone('');
      setAddress('');
      setCivilians((prev) => [
        ...prev,
        { id: newUid, email, name: fullName, phone, role: 'civilian' },
      ]);
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
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Civilians</h1>
            <p className="text-slate-400">Create and manage civilian user accounts</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Plus size={20} /> Create Civilian
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-800 bg-slate-900 text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-800 bg-slate-900 text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-800 bg-slate-900 text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Phone (optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-800 bg-slate-900 text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Address (optional)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-800 bg-slate-900 text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {message && (
              <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {message.text}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Create Civilian
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Existing Civilians</h2>
          {fetching ? (
            <p className="text-slate-400">Loading...</p>
          ) : (
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/80 text-slate-300">
                  <tr>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {civilians.map((c) => (
                    <tr key={c.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 text-slate-200">{c.email || '-'}</td>
                      <td className="px-4 py-3 text-slate-200">{c.name || '-'}</td>
                      <td className="px-4 py-3 text-slate-400">{c.phone || '-'}</td>
                    </tr>
                  ))}
                  {civilians.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        No civilian accounts yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
