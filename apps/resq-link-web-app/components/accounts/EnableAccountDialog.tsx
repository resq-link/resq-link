'use client';

import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';

export function EnableAccountDialog({
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
  onConfirm: () => Promise<void> | void;
}) {
  return (
    <Dialog open={open} title={`Enable ${accountKind}?`} onClose={() => !busy && onClose()}>
      <p className="text-sm text-slate-600">
        Restore access for <span className="font-medium text-slate-900">{accountLabel}</span>.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" disabled={busy} onClick={onConfirm}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy ? 'Enabling...' : 'Enable Account'}
        </Button>
      </div>
    </Dialog>
  );
}
