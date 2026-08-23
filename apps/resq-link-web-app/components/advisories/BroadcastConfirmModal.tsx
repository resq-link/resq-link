'use client';

import React from 'react';
import { AlertTriangle, Send, X, ShieldAlert, Radio } from 'lucide-react';
import { AdvisoryRecord, ADVISORY_SEVERITIES } from '@packages/firebase';

interface BroadcastConfirmModalProps {
  isOpen: boolean;
  advisory: AdvisoryRecord | null;
  isLoading: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function BroadcastConfirmModal({
  isOpen,
  advisory,
  isLoading,
  onConfirm,
  onClose,
}: BroadcastConfirmModalProps) {
  if (!isOpen || !advisory) return null;

  const severityMeta = ADVISORY_SEVERITIES[advisory.severity] || ADVISORY_SEVERITIES.info;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/80">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Confirm Public Broadcast</h3>
              <p className="text-xs text-slate-400">Mass push notification transmission</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 space-y-1">
              <p className="font-semibold text-amber-300">High-Priority Alert Notice</p>
              <p>
                Broadcasting this advisory will send an instant push notification with audible alert
                to all registered civilian mobile devices in the target zone.
              </p>
            </div>
          </div>

          {/* Advisory Preview Box */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${severityMeta.badgeBg} ${severityMeta.badgeText} border ${severityMeta.border}`}
              >
                {severityMeta.label}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Scope:{' '}
                <strong className="text-slate-200">
                  {advisory.targetScope === 'all'
                    ? 'All Civilians (City-wide)'
                    : `Barangays: ${advisory.targetBarangays?.join(', ') || 'Target Area'}`}
                </strong>
              </span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-100">{advisory.title}</h4>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2">{advisory.summary}</p>
            </div>

            {advisory.pushNotification?.sent && (
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                Previously broadcast to {advisory.pushNotification.totalRecipients} devices.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/90 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-900/40 hover:from-red-500 hover:to-amber-500 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Broadcasting to Phones...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Broadcast Push Notification
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
