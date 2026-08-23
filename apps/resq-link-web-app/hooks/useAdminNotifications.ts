'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  collection,
  getFirebaseAuth,
  getFirebaseFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from '@packages/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/adminFetch';
import {
  mapAdminNotificationRecord,
  type AdminNotificationCategory,
  type AdminNotificationRecord,
} from '@/lib/adminNotifications';

export type NotificationFilterKey = 'all' | 'unread' | AdminNotificationCategory;

const LISTEN_LIMIT = 120;
const API_POLL_MS = 20_000;

type NotificationsApiResponse = {
  items: AdminNotificationRecord[];
  unreadCount: number;
};

type InboxState = {
  items: AdminNotificationRecord[];
  status: 'idle' | 'loading' | 'live' | 'api' | 'error';
  error: string | null;
  uid: string | null;
};

const INITIAL_INBOX: InboxState = {
  items: [],
  status: 'idle',
  error: null,
  uid: null,
};

let inboxState: InboxState = INITIAL_INBOX;
const inboxListeners = new Set<() => void>();
let activeUid: string | null = null;
let unsubscribeLive: (() => void) | null = null;
let apiPollTimer: ReturnType<typeof setInterval> | null = null;
let subscriberCount = 0;
let attachGeneration = 0;
let quietRetryUsed = false;

function emitInbox() {
  inboxListeners.forEach((listener) => listener());
}

function setInbox(patch: Partial<InboxState>) {
  inboxState = { ...inboxState, ...patch };
  emitInbox();
}

function stopApiPoll() {
  if (apiPollTimer) {
    clearInterval(apiPollTimer);
    apiPollTimer = null;
  }
}

function stopLive() {
  unsubscribeLive?.();
  unsubscribeLive = null;
}

async function fetchInboxApi(uid: string): Promise<AdminNotificationRecord[]> {
  const data = await adminFetch<NotificationsApiResponse>(
    `/api/notifications?limit=${LISTEN_LIMIT}`
  );
  // Guard against stale responses if the user changed.
  if (activeUid !== uid) return inboxState.items;
  return data.items || [];
}

function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code || '') : '';
  const message = 'message' in error ? String((error as { message?: unknown }).message || '') : '';
  return (
    code.includes('permission-denied') ||
    message.toLowerCase().includes('missing or insufficient permissions')
  );
}

async function startApiFallback(uid: string) {
  stopLive();
  stopApiPoll();
  setInbox({ status: 'api', error: null, uid });
  try {
    const items = await fetchInboxApi(uid);
    if (activeUid !== uid) return;
    setInbox({ items, status: 'api', error: null, uid });
  } catch (err) {
    if (activeUid !== uid) return;
    if (inboxState.items.length === 0) {
      setInbox({
        status: 'error',
        error: (err as Error).message || 'Unable to load notifications.',
        uid,
      });
    }
  }

  apiPollTimer = setInterval(() => {
    void fetchInboxApi(uid)
      .then((items) => {
        if (activeUid !== uid) return;
        setInbox({ items, status: 'api', error: null, uid });
      })
      .catch(() => {
        // Keep last good snapshot; avoid console noise.
      });
  }, API_POLL_MS);
}

function attachLiveListener(uid: string) {
  stopLive();
  stopApiPoll();
  const generation = ++attachGeneration;

  const q = query(
    collection(getFirebaseFirestore(), 'adminNotifications'),
    where('recipientUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(LISTEN_LIMIT)
  );

  unsubscribeLive = onSnapshot(
    q,
    (snapshot) => {
      if (activeUid !== uid || generation !== attachGeneration) return;
      quietRetryUsed = false;
      const items = snapshot.docs.map((docSnap) =>
        mapAdminNotificationRecord(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      setInbox({ items, status: 'live', error: null, uid });
    },
    (err) => {
      if (activeUid !== uid || generation !== attachGeneration) return;

      if (isPermissionDenied(err) && !quietRetryUsed) {
        quietRetryUsed = true;
        void getFirebaseAuth()
          .currentUser?.getIdToken(true)
          .catch(() => undefined)
          .finally(() => {
            if (activeUid !== uid || generation !== attachGeneration) return;
            window.setTimeout(() => {
              if (activeUid !== uid || generation !== attachGeneration) return;
              attachLiveListener(uid);
            }, 400);
          });
        return;
      }

      if (isPermissionDenied(err)) {
        // Do not console.error — fall back to Admin SDK quietly.
        void startApiFallback(uid);
        return;
      }

      setInbox({
        status: 'error',
        error: err.message || 'Unable to load notifications in real time.',
        uid,
      });
    }
  );
}

function startInbox(uid: string) {
  // Reuse an existing live or API subscription for this uid.
  if (activeUid === uid && (unsubscribeLive || apiPollTimer)) {
    return;
  }
  activeUid = uid;
  quietRetryUsed = false;
  setInbox({
    items: inboxState.uid === uid ? inboxState.items : [],
    status: 'loading',
    error: null,
    uid,
  });
  attachLiveListener(uid);
}

function stopInbox() {
  attachGeneration += 1;
  activeUid = null;
  quietRetryUsed = false;
  stopLive();
  stopApiPoll();
  inboxState = INITIAL_INBOX;
  emitInbox();
}

function subscribeInbox(onStoreChange: () => void) {
  inboxListeners.add(onStoreChange);
  return () => {
    inboxListeners.delete(onStoreChange);
  };
}

function getInboxSnapshot() {
  return inboxState;
}

function applyFilter(
  items: AdminNotificationRecord[],
  filter: NotificationFilterKey
): AdminNotificationRecord[] {
  if (filter === 'unread') return items.filter((item) => !item.read);
  if (filter === 'kyc' || filter === 'operational' || filter === 'system') {
    return items.filter((item) => item.category === filter);
  }
  return items;
}

/**
 * Super Admin notification inbox (shared across bell + page).
 *
 * Waits for Auth workspace resolution so `admins/{uid}` / claims exist before
 * LIST on `adminNotifications`. One shared onSnapshot; quiet API fallback if
 * realtime remains unauthorized (no console permission spam).
 */
export function useAdminNotifications(filter: NotificationFilterKey, pageLimit = 60) {
  const { user, workspace, loading } = useAuth();
  const inbox = useSyncExternalStore(subscribeInbox, getInboxSnapshot, getInboxSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const hasItemsRef = useRef(false);

  useEffect(() => {
    hasItemsRef.current = inbox.items.length > 0;
  }, [inbox.items.length]);

  useEffect(() => {
    if (loading) return;

    if (!user || workspace !== 'super_admin') {
      if (subscriberCount === 0) stopInbox();
      return;
    }

    subscriberCount += 1;
    startInbox(user.uid);

    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1);
      if (subscriberCount === 0) {
        stopInbox();
      }
    };
  }, [user, workspace, loading]);

  const reload = useCallback(async () => {
    const uid = user?.uid;
    if (!uid || workspace !== 'super_admin') return;

    if (hasItemsRef.current) setRefreshing(true);
    try {
      // Prefer live listener when authorized; otherwise refresh via API.
      if (inboxState.status === 'api' || inboxState.status === 'error') {
        const items = await fetchInboxApi(uid);
        setInbox({ items, status: 'api', error: null, uid });
      } else {
        quietRetryUsed = false;
        attachLiveListener(uid);
      }
    } finally {
      setRefreshing(false);
    }
  }, [user?.uid, workspace]);

  const items = useMemo(
    () => applyFilter(inbox.items, filter).slice(0, pageLimit),
    [inbox.items, filter, pageLimit]
  );

  const unreadCount = useMemo(
    () => inbox.items.filter((item) => !item.read).length,
    [inbox.items]
  );

  const initialLoading =
    Boolean(user) &&
    workspace === 'super_admin' &&
    (loading || inbox.status === 'idle' || inbox.status === 'loading') &&
    inbox.items.length === 0 &&
    !inbox.error;

  return {
    items,
    unreadCount,
    initialLoading,
    refreshing,
    error: inbox.error,
    reload,
    invalidate: reload,
  };
}

export function useAdminNotificationPreview() {
  return useAdminNotifications('all', 5);
}
