'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Lock, ShieldCheck, UserCog } from 'lucide-react';
import {
  EmailAuthProvider,
  getFirebaseAuth,
  reauthenticateWithCredential,
  updatePassword,
} from '@packages/firebase';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { adminFetch } from '@/lib/adminFetch';
import { formatDateTime } from '@/lib/dates';
import { useToast } from '@/components/ToastProvider';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

type SettingsSection = 'account' | 'security';

interface SettingsProfile {
  uid: string;
  email: string | null;
  displayName: string;
  role: string;
  lastSignInAt: string | null;
  createdAt: string | null;
  emailEditable: boolean;
}

function initialsFromName(name: string, email: string | null): string {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase().slice(0, 2);
    }
    if (/super\s*admin/i.test(trimmed)) return 'SA';
    return trimmed.slice(0, 2).toUpperCase();
  }
  if (!email) return 'SA';
  const local = email.split('@')[0] || '';
  if (/admin|super/i.test(local)) return 'SA';
  return local.slice(0, 2).toUpperCase() || 'SA';
}

const SECTIONS: { id: SettingsSection; label: string; icon: typeof UserCog }[] = [
  { id: 'account', label: 'Account', icon: UserCog },
  { id: 'security', label: 'Security', icon: Lock },
];

export default function SettingsPage() {
  const toast = useToast();
  const { user } = useAdminAuth();
  const [section, setSection] = useState<SettingsSection>('account');
  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await adminFetch<SettingsProfile>('/api/settings/me');
      setProfile(data);
      setDisplayName(data.displayName || '');
    } catch (err) {
      setLoadError((err as Error).message || 'Unable to load account settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (!profile) return false;
    return displayName.trim() !== (profile.displayName || '').trim();
  }, [displayName, profile]);

  const initials = initialsFromName(
    displayName || profile?.displayName || '',
    profile?.email || user?.email || null
  );

  const saveProfile = async () => {
    const nextName = displayName.trim();
    if (!nextName) {
      toast.error('Display name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const result = await adminFetch<{ displayName: string }>('/api/settings/profile', {
        method: 'POST',
        body: JSON.stringify({ displayName: nextName }),
      });
      setProfile((current) => (current ? { ...current, displayName: result.displayName } : current));
      setDisplayName(result.displayName);
      toast.success('Account information updated successfully.');
      try {
        await getFirebaseAuth().currentUser?.reload();
      } catch {
        // Non-blocking.
      }
    } catch (err) {
      toast.error((err as Error).message || 'Unable to update account information.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPasswordError(null);
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    const currentUser = getFirebaseAuth().currentUser;
    const email = currentUser?.email || profile?.email;
    if (!currentUser || !email) {
      setPasswordError('You must be signed in to change your password.');
      return;
    }

    setPasswordBusy(true);
    try {
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      await adminFetch('/api/settings/password-changed', { method: 'POST', body: '{}' });
      toast.success('Password updated successfully.');
      setPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const code = (err as { code?: string }).code || '';
      if (code.includes('wrong-password') || code.includes('invalid-credential')) {
        setPasswordError('Current password is incorrect.');
      } else if (code.includes('weak-password')) {
        setPasswordError('Password does not meet requirements.');
      } else if (code.includes('too-many-requests')) {
        setPasswordError('Too many attempts. Please try again later.');
      } else {
        setPasswordError('Unable to change password. Please try again.');
      }
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-slate-200/80 bg-white/80 p-1 shadow-sm">
        {SECTIONS.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-admin ${
                active
                  ? 'bg-primary-500/15 text-primary-700 ring-1 ring-inset ring-primary-400/25'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>

      {loadError ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      {section === 'account' ? (
        <section className="animate-admin-fade-in overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-admin-card">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500 text-sm font-semibold tracking-wide text-white shadow-sm ring-4 ring-primary-50">
                  {initials}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-slate-900">
                    {displayName.trim() || 'Super Administrator'}
                  </h2>
                  <p className="truncate text-sm text-slate-500">{profile?.email || user?.email || '—'}</p>
                </div>
              </div>
              <p className="text-sm text-slate-500">Manage your Super Administrator profile information.</p>
            </div>
          </div>

          {loading && !profile ? (
            <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin text-primary-500" />
              Loading account...
            </div>
          ) : (
            <div className="px-5 py-5 sm:px-6">
              <div className="grid gap-5 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Display Name</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors duration-admin focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Super Administrator"
                    maxLength={80}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Email Address</span>
                  <input
                    value={profile?.email || ''}
                    readOnly
                    disabled
                    className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600"
                  />
                  <span className="mt-1.5 block text-xs text-slate-500">
                    Managed by authentication and cannot be changed here.
                  </span>
                </label>

                <div>
                  <p className="mb-1.5 text-sm font-medium text-slate-700">Role</p>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-sm text-slate-800">{profile?.role || 'Super Administrator'}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Managed by RESQ-LINK</p>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-sm font-medium text-slate-700">User ID</p>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="break-all font-mono text-xs text-slate-700">{profile?.uid || '—'}</p>
                    <p className="mt-0.5 text-xs text-slate-500">System-generated identifier</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
                <Button type="button" disabled={!dirty || saving} onClick={() => void saveProfile()}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {section === 'security' ? (
        <section className="animate-admin-fade-in overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-admin-card">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">Security</h2>
            <p className="mt-1 text-sm text-slate-500">Protect your Super Administrator account.</p>
          </div>

          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 ring-1 ring-primary-100">
                  <Lock size={16} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">Password</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Change your password using your current credentials.
                  </p>
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={() => setPasswordOpen(true)}>
                Change Password
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <ShieldCheck size={15} className="text-primary-600" aria-hidden="true" />
                Session
              </div>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Last sign-in</dt>
                  <dd className="mt-1 text-sm text-slate-800">{formatDateTime(profile?.lastSignInAt)}</dd>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Account created</dt>
                  <dd className="mt-1 text-sm text-slate-800">{formatDateTime(profile?.createdAt)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      ) : null}

      <Dialog
        open={passwordOpen}
        title="Change Password"
        onClose={() => !passwordBusy && setPasswordOpen(false)}
        widthClassName="max-w-md"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void changePassword();
          }}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Current password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">New password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Confirm new password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </label>
          {passwordError ? <p className="text-sm text-red-600">{passwordError}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" disabled={passwordBusy} onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={passwordBusy}>
              {passwordBusy ? <Loader2 size={16} className="animate-spin" /> : null}
              {passwordBusy ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
