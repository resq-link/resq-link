'use client';

type CacheEntry<T> = {
  data: T | undefined;
  error: string | null;
  updatedAt: number;
  inflight: Promise<T> | null;
  listeners: Set<() => void>;
};

const entries = new Map<string, CacheEntry<unknown>>();

function getEntry<T>(key: string): CacheEntry<T> {
  const existing = entries.get(key);
  if (existing) return existing as CacheEntry<T>;
  const created: CacheEntry<T> = {
    data: undefined,
    error: null,
    updatedAt: 0,
    inflight: null,
    listeners: new Set(),
  };
  entries.set(key, created as CacheEntry<unknown>);
  return created;
}

function notify(key: string) {
  const entry = entries.get(key);
  entry?.listeners.forEach((listener) => listener());
}

export function peekAdminQuery<T>(key: string): T | undefined {
  return getEntry<T>(key).data;
}

export function subscribeAdminQuery(key: string, listener: () => void): () => void {
  const entry = getEntry(key);
  entry.listeners.add(listener);
  return () => {
    entry.listeners.delete(listener);
  };
}

export function ensureAdminQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  staleTimeMs: number,
  force = false
): Promise<T> {
  const entry = getEntry<T>(key);
  const isFresh = entry.data !== undefined && Date.now() - entry.updatedAt < staleTimeMs;
  if (!force && isFresh) {
    return Promise.resolve(entry.data as T);
  }
  if (entry.inflight) {
    return entry.inflight;
  }

  const request = (async () => {
    try {
      const data = await fetcher();
      entry.data = data;
      entry.error = null;
      entry.updatedAt = Date.now();
      return data;
    } catch (error) {
      if (entry.data === undefined) {
        entry.error = error instanceof Error ? error.message : 'Unable to load data.';
      }
      throw error;
    } finally {
      entry.inflight = null;
      notify(key);
    }
  })();

  entry.inflight = request;
  notify(key);
  return request;
}

export function getAdminQuerySnapshot<T>(key: string): {
  data: T | undefined;
  error: string | null;
  isRefreshing: boolean;
} {
  const entry = getEntry<T>(key);
  return {
    data: entry.data,
    error: entry.error,
    isRefreshing: entry.inflight !== null && entry.data !== undefined,
  };
}

/**
 * Mark a query stale without destroying the cache entry.
 *
 * IMPORTANT: Do not `entries.delete(key)` here. Subscribers hold listeners on the
 * entry object; deleting it drops those listeners, so a later refetch notifies an
 * empty set and React stays stuck on `initialLoading` with empty rows.
 *
 * Keep existing `data` (stale-while-revalidate) so tables do not flash to zero.
 */
function markEntryStale(key: string) {
  const entry = entries.get(key);
  if (!entry) return;
  entry.updatedAt = 0;
  entry.error = null;
  notify(key);
}

export function invalidateAdminQuery(key: string) {
  markEntryStale(key);
}

export function invalidateAdminQueryPrefix(prefix: string) {
  for (const key of [...entries.keys()]) {
    if (key.startsWith(prefix)) {
      markEntryStale(key);
    }
  }
}

/** Synchronously replace cached data (e.g. patch one row after a successful edit). */
export function setAdminQueryData<T>(key: string, data: T) {
  const entry = getEntry<T>(key);
  entry.data = data;
  entry.error = null;
  entry.updatedAt = Date.now();
  notify(key);
}
