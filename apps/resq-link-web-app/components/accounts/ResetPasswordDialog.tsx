'use client';

import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export function ResetPasswordDialog({
  open,
  accountLabel,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  accountLabel: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void> | void;
}) {
  const [password, setPassword] = useState('');

  return (
    <Dialog
      open={open}
      title="Reset password"
      onClose={() => {
        if (!busy) {
          setPassword('');
          onClose();
        }
      }}
    >
      <p className="text-sm text-admin-fg-muted">
        Set a new password for <span className="font-medium text-admin-fg">{accountLabel}</span>.
      </p>
      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-medium text-admin-fg-muted">New password</span>
        <input
          type="password"
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-10 w-full rounded-lg border border-admin-border px-3 text-sm transition-colors duration-admin focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </label>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" disabled={busy || password.length < 6} onClick={() => onConfirm(password)}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy ? 'Updating...' : 'Reset Password'}
        </Button>
      </div>
    </Dialog>
  );
}
