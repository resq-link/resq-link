import { collection, onSnapshot, orderBy, query, type Timestamp } from 'firebase/firestore';
import { getFirebaseFirestore } from './config';

export type SmsMessageStatus = 'received' | 'queued' | 'sent' | 'delivered' | 'failed';
export interface SmsThread { id: string; phoneNumber: string; preview: string; unreadCount: number; lastDirection: 'inbound' | 'outbound'; lastMessageAt?: Date | Timestamp; }
export interface SmsMessage { id: string; threadId: string; phoneNumber: string; body: string; direction: 'inbound' | 'outbound'; status: SmsMessageStatus; createdAt?: Date | Timestamp; }
export type SmsIntakeStatus = 'untriaged' | 'triaged' | 'closed';
export interface SmsIntake { id: string; threadId: string; phoneNumber: string; latestMessage: string; status: SmsIntakeStatus; updatedAt?: Date | Timestamp; triagedAt?: Date | Timestamp; triagedBy?: string; }

const map = <T>(id: string, data: Record<string, unknown>) => ({ id, ...data }) as T;
export const subscribeToSmsIntakes = (callback: (items: SmsIntake[]) => void) => onSnapshot(query(collection(getFirebaseFirestore(), 'smsIntakes'), orderBy('updatedAt', 'desc')), snap => callback(snap.docs.map(doc => map<SmsIntake>(doc.id, doc.data()))));
export const subscribeToSmsMessages = (threadId: string, callback: (items: SmsMessage[]) => void) => onSnapshot(query(collection(getFirebaseFirestore(), 'smsMessages'), orderBy('createdAt', 'asc')), snap => callback(snap.docs.map(doc => map<SmsMessage>(doc.id, doc.data())).filter(message => message.threadId === threadId)));
