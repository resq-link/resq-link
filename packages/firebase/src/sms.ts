import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, where, type Timestamp } from 'firebase/firestore';
import { getFirebaseFirestore } from './config';

export type SmsMessageStatus = 'received' | 'queued' | 'sent' | 'delivered' | 'failed';
export interface SmsThread { id: string; phoneNumber: string; preview: string; unreadCount: number; lastDirection: 'inbound' | 'outbound'; lastMessageAt?: Date | Timestamp; }
export interface SmsMessage { id: string; threadId: string; phoneNumber: string; body: string; direction: 'inbound' | 'outbound'; status: SmsMessageStatus; createdAt?: Date | Timestamp; }
export type SmsIntakeStatus = 'untriaged' | 'triaged' | 'closed';
export interface SmsIntake { id: string; threadId: string; phoneNumber: string; latestMessage: string; status: SmsIntakeStatus; updatedAt?: Date | Timestamp; triagedAt?: Date | Timestamp; triagedBy?: string; }
export interface SmsQuickReply { id: string; label: string; text: string; sortOrder: number; }

export const defaultSmsQuickReplies = [
  { label: 'Request location', text: 'Thank you for contacting RESQ-Link. Please share your exact location or nearest landmark.', sortOrder: 10 },
  { label: 'Assess emergency', text: 'For dispatch, please tell us what happened, how many people are involved, and whether anyone is injured or in immediate danger.', sortOrder: 20 },
  { label: 'Acknowledgement', text: 'We are reviewing your report. If there is immediate danger, call 911 or your local emergency number now.', sortOrder: 30 },
];

const map = <T>(id: string, data: Record<string, unknown>) => ({ id, ...data }) as T;
export const subscribeToSmsIntakes = (callback: (items: SmsIntake[]) => void) => onSnapshot(query(collection(getFirebaseFirestore(), 'smsIntakes'), orderBy('updatedAt', 'desc')), snap => callback(snap.docs.map(doc => map<SmsIntake>(doc.id, doc.data()))));
export const subscribeToSmsMessages = (threadId: string, callback: (items: SmsMessage[]) => void) => onSnapshot(query(collection(getFirebaseFirestore(), 'smsMessages'), where('threadId', '==', threadId)), snap => callback(snap.docs.map(doc => map<SmsMessage>(doc.id, doc.data())).sort((left, right) => {
  const leftTime = left.createdAt instanceof Date ? left.createdAt.getTime() : typeof left.createdAt === 'object' && left.createdAt && 'toMillis' in left.createdAt ? left.createdAt.toMillis() : 0;
  const rightTime = right.createdAt instanceof Date ? right.createdAt.getTime() : typeof right.createdAt === 'object' && right.createdAt && 'toMillis' in right.createdAt ? right.createdAt.toMillis() : 0;
  return leftTime - rightTime;
})));
export const subscribeToSmsQuickReplies = (callback: (items: SmsQuickReply[]) => void) => onSnapshot(query(collection(getFirebaseFirestore(), 'smsQuickReplies'), orderBy('sortOrder', 'asc')), snap => callback(snap.docs.map(item => map<SmsQuickReply>(item.id, item.data()))));
export const createSmsQuickReply = async (input: Omit<SmsQuickReply, 'id'>) => addDoc(collection(getFirebaseFirestore(), 'smsQuickReplies'), { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
export const deleteSmsQuickReply = async (id: string) => deleteDoc(doc(getFirebaseFirestore(), 'smsQuickReplies', id));

export interface SmsGatewaySettings {
  id?: string;
  enabled: boolean;
  gatewayBaseUrl: string;
  gatewayUsername: string;
  gatewayPassword?: string;
  hasPassword?: boolean;
  webhookSecret: string;
  webhookUrl?: string;
  simSlot?: number;
  status: 'connected' | 'disconnected' | 'unconfigured' | 'error';
  lastPingAt?: Date | Timestamp;
  lastConnectedAt?: Date | Timestamp;
  lastError?: string | null;
  updatedAt?: Date | Timestamp;
  updatedBy?: string;
}

export const subscribeToSmsGatewaySettings = (callback: (settings: SmsGatewaySettings | null) => void) =>
  onSnapshot(doc(getFirebaseFirestore(), 'systemSettings', 'smsGateway'), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback(map<SmsGatewaySettings>(snap.id, snap.data()));
  });
