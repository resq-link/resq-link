import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './config';

export type ChatParticipantRole = 'dispatcher' | 'command_center' | 'responder';
export type ChatThreadType = 'direct' | 'group';

export interface ChatParticipant {
  uid: string;
  name: string;
  email?: string | null;
  role: ChatParticipantRole;
}

export interface ChatThreadRecord {
  id?: string;
  type: ChatThreadType;
  title?: string | null;
  participantIds: string[];
  participantRoles: Record<string, ChatParticipantRole>;
  participantNames: Record<string, string>;
  createdByUserId: string;
  lastMessageText?: string | null;
  lastMessageAt?: Date | Timestamp | null;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
  /** Per-user read watermark, keyed by uid. */
  readAt?: Record<string, Date | Timestamp | null>;
}

export interface ChatMessageRecord {
  id?: string;
  threadId: string;
  senderId: string;
  senderName: string;
  participantIds?: string[];
  text: string;
  createdAt?: Date | Timestamp;
}

const normalizeNullableString = (value?: string | null): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const ensureAuthenticated = () => {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to use messaging.');
  }
  return currentUser;
};

const isResponderDesignation = (value?: unknown): boolean => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return normalized.includes('responder');
};

const toDateValue = (value: unknown): Date | Timestamp | null => {
  if (!value) return null;
  if (value instanceof Date || value instanceof Timestamp) return value;
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate();
  }
  return null;
};

const toMillis = (value: Date | Timestamp | null | undefined): number => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
};

async function resolveParticipant(uid: string): Promise<ChatParticipant> {
  const db = getFirebaseFirestore();
  const commandCenterSnapshot = await getDoc(doc(db, 'commandCenters', uid));
  if (commandCenterSnapshot.exists()) {
    const data = commandCenterSnapshot.data();
    return {
      uid,
      name: data.name || data.email || uid,
      email: data.email || null,
      role: 'command_center',
    };
  }

  const dispatcherSnapshot = await getDoc(doc(db, 'dispatchers', uid));
  if (!dispatcherSnapshot.exists()) {
    throw new Error(`Participant ${uid} was not found.`);
  }

  const data = dispatcherSnapshot.data();
  if (data.active === false) {
    throw new Error(`Participant ${data.email || uid} is inactive.`);
  }

  return {
    uid,
    name: data.fullName || data.email || uid,
    email: data.email || null,
    role: isResponderDesignation(data.designation) ? 'responder' : 'dispatcher',
  };
}

const toThreadRecord = (snapshot: DocumentData): ChatThreadRecord => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    type: data.type === 'group' ? 'group' : 'direct',
    title: data.title || null,
    participantIds: Array.isArray(data.participantIds) ? data.participantIds : [],
    participantRoles: data.participantRoles || {},
    participantNames: data.participantNames || {},
    createdByUserId: data.createdByUserId || '',
    lastMessageText: data.lastMessageText || null,
    lastMessageAt: toDateValue(data.lastMessageAt),
    createdAt: toDateValue(data.createdAt) || new Date(),
    updatedAt: toDateValue(data.updatedAt) || undefined,
    readAt: data.readAt || {},
  };
};

const toMessageRecord = (snapshot: DocumentData, threadId: string): ChatMessageRecord => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    threadId,
    senderId: data.senderId || '',
    senderName: data.senderName || 'Unknown',
    participantIds: Array.isArray(data.participantIds) ? data.participantIds : [],
    text: data.text || '',
    createdAt: toDateValue(data.createdAt) || new Date(),
  };
};

function assertAllowedThread(participants: ChatParticipant[], creator: ChatParticipant, type: ChatThreadType) {
  const uniqueParticipantIds = new Set(participants.map((participant) => participant.uid));
  if (!uniqueParticipantIds.has(creator.uid)) {
    throw new Error('Creator must be included in the chat.');
  }

  const hasDispatcherSide = participants.some(
    (participant) => participant.role === 'dispatcher' || participant.role === 'command_center'
  );
  if (!hasDispatcherSide) {
    throw new Error('Responder-only chats are not allowed.');
  }

  if (creator.role === 'responder') {
    const nonCreatorParticipants = participants.filter((participant) => participant.uid !== creator.uid);
    const hasResponderTarget = nonCreatorParticipants.some((participant) => participant.role === 'responder');
    if (hasResponderTarget || type === 'group') {
      throw new Error('Responders can only start direct chats with dispatcher-side accounts.');
    }
  }
}

async function createThread(input: {
  type: ChatThreadType;
  title?: string | null;
  participantIds: string[];
}): Promise<ChatThreadRecord> {
  const currentUser = ensureAuthenticated();
  const participantIds = Array.from(new Set([currentUser.uid, ...input.participantIds.map((id) => id.trim())].filter(Boolean)));

  if (participantIds.length < 2) {
    throw new Error('A chat requires at least two participants.');
  }

  const participants = await Promise.all(participantIds.map(resolveParticipant));
  const creator = participants.find((participant) => participant.uid === currentUser.uid);
  if (!creator) {
    throw new Error('Unable to resolve current user profile.');
  }

  assertAllowedThread(participants, creator, input.type);

  const participantRoles = Object.fromEntries(participants.map((participant) => [participant.uid, participant.role]));
  const participantNames = Object.fromEntries(participants.map((participant) => [participant.uid, participant.name]));
  const timestamp = Timestamp.now();
  const payload = {
    type: input.type,
    title: input.type === 'group' ? normalizeNullableString(input.title) || 'Group chat' : null,
    participantIds,
    participantRoles,
    participantNames,
    createdByUserId: currentUser.uid,
    lastMessageText: null,
    lastMessageAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const threadRef = await addDoc(collection(getFirebaseFirestore(), 'chatThreads'), payload);
  return {
    ...payload,
    id: threadRef.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Find the existing one-to-one thread with this participant, if any.
 *
 * Filtered client-side off a single array-contains query so no composite index
 * is required; a user's thread count is small enough for this to be cheap.
 */
async function findDirectChat(
  currentUserId: string,
  participantId: string
): Promise<ChatThreadRecord | null> {
  const snapshot = await getDocs(
    query(
      collection(getFirebaseFirestore(), 'chatThreads'),
      where('participantIds', 'array-contains', currentUserId)
    )
  );

  const match = snapshot.docs
    .map(toThreadRecord)
    .find(
      (thread) =>
        thread.type === 'direct' &&
        thread.participantIds.length === 2 &&
        thread.participantIds.includes(participantId)
    );

  return match ?? null;
}

/**
 * Open the direct chat with this participant, reusing the existing thread.
 *
 * Previously this always created a new thread, so tapping a name twice split
 * the conversation across duplicates — and a reply could land in a thread the
 * other side was not looking at.
 */
export async function createDirectChat(participantId: string): Promise<ChatThreadRecord> {
  const currentUser = ensureAuthenticated();
  const normalizedId = participantId.trim();

  if (normalizedId && normalizedId !== currentUser.uid) {
    const existing = await findDirectChat(currentUser.uid, normalizedId);
    if (existing) return existing;
  }

  return createThread({
    type: 'direct',
    participantIds: [normalizedId],
  });
}

export async function createGroupChat(title: string, participantIds: string[]): Promise<ChatThreadRecord> {
  return createThread({
    type: 'group',
    title,
    participantIds,
  });
}

export function subscribeToChatThreads(
  callback: (threads: ChatThreadRecord[]) => void,
  limitCount: number = 100
): () => void {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(getFirebaseFirestore(), 'chatThreads'),
      where('participantIds', 'array-contains', currentUser.uid),
      limit(limitCount)
    );

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        callback(
          snapshot.docs
            .map(toThreadRecord)
            .sort((left, right) => {
              return toMillis(right.updatedAt) - toMillis(left.updatedAt);
            })
        );
      },
      (error) => {
        console.error('Error subscribing to chat threads:', error);
        callback([]);
      }
    );
  } catch (error) {
    console.error('Error setting up chat thread subscription:', error);
    callback([]);
    return () => {};
  }
}

export function subscribeToChatMessages(
  threadId: string,
  callback: (messages: ChatMessageRecord[]) => void,
  limitCount: number = 100
): () => void {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser || !threadId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(getFirebaseFirestore(), 'chatThreads', threadId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(limitCount)
    );

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        callback(snapshot.docs.map((item) => toMessageRecord(item, threadId)));
      },
      (error) => {
        console.error('Error subscribing to chat messages:', error);
        callback([]);
      }
    );
  } catch (error) {
    console.error('Error setting up chat message subscription:', error);
    callback([]);
    return () => {};
  }
}

export async function sendChatMessage(threadId: string, text: string): Promise<ChatMessageRecord> {
  const currentUser = ensureAuthenticated();
  const normalizedText = text.trim();
  if (!normalizedText) {
    throw new Error('Message text is required.');
  }

  const threadRef = doc(getFirebaseFirestore(), 'chatThreads', threadId);
  const threadSnapshot = await getDoc(threadRef);
  if (!threadSnapshot.exists()) {
    throw new Error('Chat thread was not found.');
  }

  const thread = toThreadRecord(threadSnapshot);
  if (!thread.participantIds.includes(currentUser.uid)) {
    throw new Error('Only chat participants can send messages.');
  }

  const senderName =
    thread.participantNames[currentUser.uid] ||
    currentUser.displayName ||
    currentUser.email ||
    currentUser.uid;
  const timestamp = Timestamp.now();
  const payload = {
    threadId,
    senderId: currentUser.uid,
    senderName,
    participantIds: thread.participantIds,
    text: normalizedText,
    createdAt: timestamp,
  };

  const messageRef = await addDoc(collection(getFirebaseFirestore(), 'chatThreads', threadId, 'messages'), payload);
  await updateDoc(threadRef, {
    lastMessageText: normalizedText,
    lastMessageAt: timestamp,
    updatedAt: timestamp,
    // Stamp the sender's own watermark so their message never shows as unread
    // to themselves.
    [`readAt.${currentUser.uid}`]: timestamp,
  });

  return {
    ...payload,
    id: messageRef.id,
    createdAt: new Date(),
  };
}

export async function getMessagingParticipants(): Promise<ChatParticipant[]> {
  ensureAuthenticated();
  const snapshot = await getDocs(collection(getFirebaseFirestore(), 'dispatchers'));
  const participants: ChatParticipant[] = [];

  snapshot.forEach((item) => {
    const data = item.data();
    if (data.active === false) return;
    participants.push({
      uid: item.id,
      name: data.fullName || data.email || item.id,
      email: data.email || null,
      role: isResponderDesignation(data.designation) ? 'responder' : 'dispatcher',
    });
  });

  return participants.sort((left, right) => left.name.localeCompare(right.name));
}


/**
 * Mark a thread as read up to now for the signed-in user.
 *
 * Read state lives in a `readAt` map on the thread rather than a subcollection
 * so a single thread snapshot tells each client what is unread — no extra
 * listener per thread. Writing it keeps participantIds/participantRoles/
 * createdByUserId untouched, so the existing update rule already permits it.
 */
export async function markThreadRead(threadId: string): Promise<void> {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser || !threadId) return;

  try {
    await updateDoc(doc(getFirebaseFirestore(), 'chatThreads', threadId), {
      [`readAt.${currentUser.uid}`]: Timestamp.now(),
    });
  } catch (error) {
    // Read receipts are not worth surfacing to the user or blocking the UI.
    console.error('Error marking thread read:', error);
  }
}

/**
 * Whether a thread holds messages this user has not seen.
 *
 * A thread with no messages is never unread, and a user's own message never
 * marks their own thread unread because sending stamps their readAt.
 */
export function isThreadUnread(
  thread: Pick<ChatThreadRecord, 'lastMessageAt' | 'readAt'> | null | undefined,
  userId: string | null | undefined
): boolean {
  if (!thread || !userId) return false;
  const lastMessage = toMillis(thread.lastMessageAt);
  if (lastMessage === 0) return false;
  return lastMessage > toMillis(thread.readAt?.[userId]);
}

/** How many of these threads carry unread messages for this user. */
export function countUnreadThreads(
  threads: ChatThreadRecord[],
  userId: string | null | undefined
): number {
  if (!userId) return 0;
  return threads.reduce(
    (total, thread) => (isThreadUnread(thread, userId) ? total + 1 : total),
    0
  );
}