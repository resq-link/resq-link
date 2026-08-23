'use client';

import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function DeleteConfirmationDialog({
  open,
  title,
  entityName,
  email,
  accountTypeLabel,
  description,
  confirmLabel = 'Delete',
  busy = false,
  blocked = false,
  blockedMessage,
  requireReason = false,
  reasonPlaceholder = 'Optional reason for this deletion',
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  entityName?: string;
  email?: string;
  accountTypeLabel?: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  blocked?: boolean;
  blockedMessage?: string;
  requireReason?: boolean;
  reasonPlaceholder?: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  const canConfirm = !busy && !blocked && (!requireReason || Boolean(reason.trim()));

  return (
    <Dialog
      open={open}
      title={blocked ? 'Action Blocked' : title}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {(email || accountTypeLabel || entityName) && !blocked ? (
        <dl className="mb-3 space-y-1.5 rounded-lg border border-admin-border bg-admin-muted px-3 py-2.5 text-sm">
          {email ? (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-admin-fg-subtle">Email</dt>
              <dd className="font-medium text-admin-fg">{email}</dd>
            </div>
          ) : entityName ? (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-admin-fg-subtle">Account</dt>
              <dd className="font-medium text-admin-fg">{entityName}</dd>
            </div>
          ) : null}
          {accountTypeLabel ? (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-admin-fg-subtle">Account Type</dt>
              <dd className="font-medium text-admin-fg">{accountTypeLabel}</dd>
            </div>
          ) : null}
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-admin-fg-subtle">Action</dt>
            <dd className="font-medium text-admin-fg">{confirmLabel}</dd>
          </div>
        </dl>
      ) : null}

      {blocked ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
          {email ? (
            <p>
              <span className="font-medium">Email:</span> {email}
            </p>
          ) : null}
          {accountTypeLabel ? (
            <p className={email ? 'mt-1' : undefined}>
              <span className="font-medium">Detected Role:</span> {accountTypeLabel}
            </p>
          ) : null}
          <p className="mt-2">{blockedMessage || description}</p>
        </div>
      ) : (
        <p className="text-sm text-admin-fg-muted">{description}</p>
      )}

      {!blocked ? (
        requireReason ? (
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Reason</span>
            <textarea
              required
              value={reason}
              disabled={busy}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-[96px] w-full rounded-lg border border-admin-border px-3 py-2 text-sm text-admin-fg transition-colors duration-admin focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60"
              placeholder={reasonPlaceholder}
            />
          </label>
        ) : (
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-medium text-admin-fg-muted">Reason (optional)</span>
            <textarea
              value={reason}
              disabled={busy}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-[72px] w-full rounded-lg border border-admin-border px-3 py-2 text-sm text-admin-fg transition-colors duration-admin focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60"
              placeholder={reasonPlaceholder}
            />
          </label>
        )
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
          {blocked ? 'Close' : 'Cancel'}
        </Button>
        {!blocked ? (
          <Button
            type="button"
            variant="danger"
            disabled={!canConfirm}
            onClick={() => void onConfirm(reason.trim())}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {busy ? 'Deleting...' : confirmLabel}
          </Button>
        ) : null}
      </div>
    </Dialog>
  );
}
