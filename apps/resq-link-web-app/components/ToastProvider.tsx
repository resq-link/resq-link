'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DISMISS_MS: Record<ToastType, number> = {
  success: 3500,
  info: 3500,
  warning: 4500,
  error: 5500,
};

const TOAST_STYLES: Record<ToastType, string> = {
  success:
    'border-emerald-200 bg-admin-surface text-emerald-900 dark:border-emerald-800/60 dark:text-emerald-100',
  error: 'border-red-200 bg-admin-surface text-red-900 dark:border-red-800/60 dark:text-red-100',
  warning:
    'border-amber-200 bg-admin-surface text-amber-950 dark:border-amber-800/60 dark:text-amber-100',
  info: 'border-sky-200 bg-admin-surface text-sky-950 dark:border-sky-800/60 dark:text-sky-100',
};

const ICON_STYLES: Record<ToastType, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-sky-600 dark:text-sky-400',
};

function ToastIcon({ type }: { type: ToastType }) {
  const className = `mt-0.5 shrink-0 ${ICON_STYLES[type]}`;
  switch (type) {
    case 'success':
      return <CheckCircle2 size={16} className={className} aria-hidden="true" />;
    case 'error':
      return <AlertCircle size={16} className={className} aria-hidden="true" />;
    case 'warning':
      return <AlertTriangle size={16} className={className} aria-hidden="true" />;
    default:
      return <Info size={16} className={className} aria-hidden="true" />;
  }
}

/** Map Firebase Auth / common client errors to readable Super Admin copy. */
export function toastAuthErrorMessage(error: unknown, fallback: string): string {
  const code = String((error as { code?: string })?.code || '');
  const message = error instanceof Error ? error.message : '';
  const haystack = `${code} ${message}`.toLowerCase();

  if (haystack.includes('wrong-password') || haystack.includes('invalid-credential')) {
    return 'Current password is incorrect.';
  }
  if (haystack.includes('weak-password')) {
    return 'Password must meet the required security rules.';
  }
  if (haystack.includes('requires-recent-login')) {
    return 'For security, please sign in again before changing your password.';
  }
  if (haystack.includes('too-many-requests')) {
    return 'Too many attempts. Please try again later.';
  }
  if (haystack.includes('network-request-failed') || haystack.includes('network error')) {
    return 'Network error. Check your connection and try again.';
  }
  if (message && message.length < 180 && !message.includes('FIREBASE') && !message.includes('auth/')) {
    return message;
  }
  return fallback;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const id = Date.now() + Math.random();
    setToasts((current) => {
      // Avoid stacking identical messages from double-clicks / rapid retries.
      const withoutDupes = current.filter((toast) => toast.message !== trimmed || toast.type !== type);
      return [...withoutDupes, { id, type, message: trimmed }].slice(-4);
    });

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, DISMISS_MS[type]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      warning: (message) => push('warning', message),
      info: (message) => push('info', message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm shadow-sm ${TOAST_STYLES[toast.type]}`}
          >
            <ToastIcon type={toast.type} />
            <p className="min-w-0 flex-1 leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded p-0.5 text-admin-fg-subtle transition-colors hover:bg-admin-hover hover:text-admin-fg"
              aria-label="Dismiss"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
