import crypto from 'node:crypto';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onRequest, HttpsError } from 'firebase-functions/v2/https';

if (!getApps().length) initializeApp();

const db = getFirestore();
const gatewayWebhookSecret = defineSecret('SMS_GATEWAY_WEBHOOK_SECRET');
const gatewayUsername = defineSecret('SMS_GATEWAY_USERNAME');
const gatewayPassword = defineSecret('SMS_GATEWAY_PASSWORD');
const gatewayBaseUrl = defineSecret('SMS_GATEWAY_BASE_URL');
const dispatcherOrigins = [
  /^https:\/\/(www\.)?resq-link\.com$/,
  /^https:\/\/resq-link-[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/localhost(?::\d+)?$/,
];

type GatewayInbound = {
  event?: string;
  payload?: { messageId?: string; message?: string; phoneNumber?: string; simNumber?: number; receivedAt?: string };
};

function normalizePhone(value: unknown): string | null {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (/^9\d{9}$/.test(digits)) return `+63${digits}`;
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

function stableId(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function assertDispatcher(request: { get(name: string): string | undefined }) {
  const authorization = request.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) throw new HttpsError('unauthenticated', 'A Firebase session is required.');
  const token = await getAuth().verifyIdToken(authorization.slice(7));
  const [dispatcher, commandCenter] = await Promise.all([
    db.doc(`dispatchers/${token.uid}`).get(),
    db.doc(`commandCenters/${token.uid}`).get(),
  ]);
  if (!dispatcher.exists && !commandCenter.exists) throw new HttpsError('permission-denied', 'Dispatcher access is required.');
  return token;
}

export const smsGatewayInbound = onRequest(
  { region: 'asia-southeast1', secrets: [gatewayWebhookSecret] },
  async (request: any, response: any) => {
    const receivedToken = String((Array.isArray(request.query.token) ? request.query.token[0] : request.query.token) ?? '').trim();
    const settingsSnap = await db.doc('systemSettings/smsGateway').get();
    const settings = settingsSnap.data();
    let expectedToken = (typeof settings?.webhookSecret === 'string' ? settings.webhookSecret.trim() : '') || gatewayWebhookSecret.value().trim();
    if (request.method !== 'POST' || !receivedToken || receivedToken !== expectedToken) {
      response.status(401).send('Unauthorized');
      return;
    }
    const event = request.body as GatewayInbound;
    if (event.event !== 'sms:received' || !event.payload?.messageId) {
      response.status(204).end();
      return;
    }
    const phoneNumber = normalizePhone(event.payload.phoneNumber);
    const body = event.payload.message?.trim();
    if (!phoneNumber || !body) {
      response.status(400).send('Invalid SMS payload');
      return;
    }
    const threadId = stableId(phoneNumber);
    const messageId = stableId(`gateway:${event.payload.messageId}`);
    const messageRef = db.doc(`smsMessages/${messageId}`);
    const threadRef = db.doc(`smsThreads/${threadId}`);
    const intakeRef = db.doc(`smsIntakes/${threadId}`);
    await db.runTransaction(async (transaction) => {
      if ((await transaction.get(messageRef)).exists) return;
      transaction.set(messageRef, {
        threadId, direction: 'inbound', body, phoneNumber, gatewayMessageId: event.payload!.messageId,
        gatewayDeviceSim: event.payload!.simNumber ?? null, status: 'received',
        gatewayReceivedAt: event.payload!.receivedAt ?? null, createdAt: FieldValue.serverTimestamp(),
      });
      transaction.set(threadRef, {
        phoneNumber, preview: body, lastMessageAt: FieldValue.serverTimestamp(), lastDirection: 'inbound',
        unreadCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(intakeRef, {
        threadId, phoneNumber, latestMessage: body, status: 'untriaged', source: 'sms',
        updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    // Mark gateway as active/connected
    await db.doc('systemSettings/smsGateway').set({
      status: 'connected',
      lastConnectedAt: FieldValue.serverTimestamp(),
      lastPingAt: FieldValue.serverTimestamp(),
      lastError: null,
    }, { merge: true }).catch(() => undefined);
    response.status(204).end();
  }
);

export const sendSms = onRequest(
  { region: 'asia-southeast1', cors: dispatcherOrigins, secrets: [gatewayUsername, gatewayPassword, gatewayBaseUrl] },
  async (request: any, response: any) => {
    if (request.method !== 'POST') return response.status(405).send('Method not allowed');
    try {
      const dispatcher = await assertDispatcher(request);
      const phoneNumber = normalizePhone(request.body?.phoneNumber);
      const body = typeof request.body?.body === 'string' ? request.body.body.trim() : '';
      const threadId = typeof request.body?.threadId === 'string' ? request.body.threadId : null;
      if (!phoneNumber || !threadId || !body || body.length > 480) return response.status(400).send('Invalid message.');
      
      const settingsSnap = await db.doc('systemSettings/smsGateway').get();
      const settings = settingsSnap.data();
      const baseUrl = (typeof settings?.gatewayBaseUrl === 'string' ? settings.gatewayBaseUrl.trim() : '') || gatewayBaseUrl.value().trim();
      const username = (typeof settings?.gatewayUsername === 'string' ? settings.gatewayUsername.trim() : '') || gatewayUsername.value().trim();
      const password = (typeof settings?.gatewayPassword === 'string' ? settings.gatewayPassword.trim() : '') || gatewayPassword.value().trim();
      const simSlot = typeof settings?.simSlot === 'number' ? settings.simSlot : undefined;

      if (!baseUrl) {
        throw new Error('SMS Gateway Base URL is not configured.');
      }

      const outgoingRef = db.collection('smsMessages').doc();
      await outgoingRef.set({ threadId, phoneNumber, body, direction: 'outbound', status: 'queued', dispatcherId: dispatcher.uid, createdAt: FieldValue.serverTimestamp() });
      
      const payload: Record<string, unknown> = {
        phoneNumbers: [phoneNumber],
        textMessage: { text: body },
      };
      if (simSlot) {
        payload.simNumber = simSlot;
      }

      const gatewayResponse = await fetch(`${baseUrl.replace(/\/$/, '')}/messages`, {
        method: 'POST', headers: {
          authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          'content-type': 'application/json',
        }, body: JSON.stringify(payload),
      });
      const gatewayResponseText = await gatewayResponse.text();
      let gatewayPayload: { id?: string } | null = null;
      try {
        gatewayPayload = gatewayResponseText ? JSON.parse(gatewayResponseText) as { id?: string } : null;
      } catch {
        gatewayPayload = null;
      }
      if (!gatewayResponse.ok) {
        console.error('SMS gateway rejected the message request.', {
          status: gatewayResponse.status,
          detail: gatewayResponseText.slice(0, 300),
        });
        throw new Error(`Gateway rejected the message (${gatewayResponse.status}).`);
      }
      await Promise.all([
        outgoingRef.update({ status: 'sent', gatewayMessageId: gatewayPayload?.id ?? null, sentAt: FieldValue.serverTimestamp() }),
        db.doc(`smsThreads/${threadId}`).set({ preview: body, lastMessageAt: FieldValue.serverTimestamp(), lastDirection: 'outbound', updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
        db.doc('systemSettings/smsGateway').set({
          status: 'connected',
          lastConnectedAt: FieldValue.serverTimestamp(),
          lastPingAt: FieldValue.serverTimestamp(),
          lastError: null,
        }, { merge: true }).catch(() => undefined),
      ]);
      response.status(201).json({ id: outgoingRef.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send SMS.';
      await db.doc('systemSettings/smsGateway').set({
        status: 'error',
        lastError: message,
        lastPingAt: FieldValue.serverTimestamp(),
      }, { merge: true }).catch(() => undefined);
      response.status(error instanceof HttpsError ? 401 : 500).json({ error: message });
    }
  }
);

export const updateSmsIntake = onRequest(
  { region: 'asia-southeast1', cors: dispatcherOrigins },
  async (request: any, response: any) => {
    if (request.method !== 'POST') return response.status(405).send('Method not allowed');
    try {
      const dispatcher = await assertDispatcher(request);
      const threadId = typeof request.body?.threadId === 'string' ? request.body.threadId : '';
      const status = request.body?.status;
      if (!threadId || !['untriaged', 'triaged', 'closed'].includes(status)) {
        return response.status(400).send('Invalid intake update.');
      }
      await db.doc(`smsIntakes/${threadId}`).set({
        status,
        triagedBy: dispatcher.uid,
        triagedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      response.status(204).end();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update SMS intake.';
      response.status(error instanceof HttpsError ? 401 : 500).json({ error: message });
    }
  },
);
