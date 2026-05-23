/**
 * Lightweight logging helpers for @packages/firebase.
 * - debug: development-only detail
 * - info: important lifecycle events (init, auth success)
 * - warnOnce: deduplicated warnings (e.g. missing composite index)
 */

declare const __DEV__: boolean | undefined;

const warnedOnceKeys = new Set<string>();

function isDevelopment(): boolean {
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__;
  }
  return process.env.NODE_ENV !== 'production';
}

export function firebaseDebug(...args: unknown[]): void {
  if (isDevelopment()) {
    console.log(...args);
  }
}

export function firebaseInfo(...args: unknown[]): void {
  console.log(...args);
}

export function firebaseWarnOnce(key: string, ...args: unknown[]): void {
  if (warnedOnceKeys.has(key)) {
    return;
  }
  warnedOnceKeys.add(key);
  console.warn(...args);
}

export function isFirestoreMissingIndexError(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | undefined;
  return (
    err?.code === 'failed-precondition' ||
    Boolean(err?.message?.includes('index'))
  );
}
