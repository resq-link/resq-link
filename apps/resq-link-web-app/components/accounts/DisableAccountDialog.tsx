'use client';

import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export function DisableAccountDialog({
  open,
  accountLabel,
  accountKind,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  accountLabel: string;
  accountKind: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}) {
  const [reason, setReason] = useState('');

  return (
    <Dialog
      open={open}
      title={`Disable ${accountKind}?`}
      onClose={() => {
        if (!busy) {
          setReason('');
          onClose();
        }
      }}
    >
      <p className="text-sm text-admin-fg-muted">
        <span className="font-medium text-admin-fg">{accountLabel}</span> will no longer be able to access RESQ-LINK.
      </p>
      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Reason</span>
        <textarea
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="min-h-[96px] w-full rounded-lg border border-admin-border px-3 py-2 text-sm text-admin-fg transition-colors duration-admin focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Why is this account being disabled?"
        />
      </label>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={busy || !reason.trim()}
          onClick={() => onConfirm(reason.trim())}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy ? 'Disabling...' : 'Disable Account'}
        </Button>
      </div>
    </Dialog>
  );
}
