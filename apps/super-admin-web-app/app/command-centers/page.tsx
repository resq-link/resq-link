'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { auth } from '@packages/firebase';
import { firestore, collection, getDocs } from '@packages/firebase';
import { Building2, Plus, Loader2 } from 'lucide-react';

export default function CommandCentersPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [centers, setCenters] = useState<Array<{ id: string; email: string; name: string; location: string }>>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'commandCenters'));
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            email: data.email || '',
            name: data.name || '',
            location: data.location || '',
          };
        });
        setCenters(list);
      } catch (e) {
        setMessage({ type: 'error', text: 'Failed to load command centers' });
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
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not signed in');
      const res = await fetch('/api/create-command-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, password, name, location }),
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
      setMessage({ type: 'success', text: `Command center created: ${name}` });
      setEmail('');
      setPassword('');
      setName('');
      setLocation('');
      setCenters((prev) => [...prev, { id: newUid, email, name, location }]);
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
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Command Centers</h1>
            <p className="text-slate-400">Create and manage command center accounts</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Plus size={20} /> Create Command Center
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
              <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Manila Command Center"
                className="w-full px-3 py-2 border border-slate-800 bg-slate-900 text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Manila, Philippines"
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
              Create Command Center
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Existing Command Centers</h2>
          {fetching ? (
            <p className="text-slate-400">Loading...</p>
          ) : (
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/80 text-slate-300">
                  <tr>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {centers.map((c) => (
                    <tr key={c.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 text-slate-200">{c.email}</td>
                      <td className="px-4 py-3 text-slate-200">{c.name}</td>
                      <td className="px-4 py-3 text-slate-400">{c.location}</td>
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
