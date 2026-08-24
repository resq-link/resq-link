import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { FieldValue, getAdminFirestore } from '@packages/firebase/admin';

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

export async function POST(request: NextRequest) {
  try {
    const receivedToken = request.nextUrl.searchParams.get('token')?.trim();
    const db = getAdminFirestore();

    const settingsSnap = await db.doc('systemSettings/smsGateway').get();
    const settings = settingsSnap.data();
    const expectedToken = (typeof settings?.webhookSecret === 'string' ? settings.webhookSecret.trim() : '') ||
      (process.env.SMS_GATEWAY_WEBHOOK_SECRET || '').trim();

    if (!receivedToken || !expectedToken || receivedToken !== expectedToken) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const rawBody = (await request.json().catch(() => null)) as Record<string, any> | null;
    if (!rawBody) {
      return new NextResponse(null, { status: 204 });
    }

    const payload = rawBody.payload || rawBody;
    const rawPhone = payload.phoneNumber || payload.phone || payload.from || payload.address || rawBody.phoneNumber || rawBody.phone;
    const rawMessage = payload.message || payload.text || payload.body || rawBody.message || rawBody.text;
    const rawMessageId = payload.messageId || payload.id || rawBody.messageId || rawBody.id || `msg_${Date.now()}`;

    const phoneNumber = normalizePhone(rawPhone);
    const body = typeof rawMessage === 'string' ? rawMessage.trim() : '';

    if (!phoneNumber || !body) {
      console.warn('[sms-inbound] Received webhook but missing phone or body:', rawBody);
      return new NextResponse('Invalid SMS payload', { status: 400 });
    }

    const threadId = stableId(phoneNumber);
    const messageId = stableId(`gateway:${rawMessageId}`);
    const messageRef = db.doc(`smsMessages/${messageId}`);
    const threadRef = db.doc(`smsThreads/${threadId}`);
    const intakeRef = db.doc(`smsIntakes/${threadId}`);

    await db.runTransaction(async (transaction) => {
      const msgSnap = await transaction.get(messageRef);
      if (msgSnap.exists) return;

      transaction.set(messageRef, {
        threadId,
        direction: 'inbound',
        body,
        phoneNumber,
        gatewayMessageId: event.payload!.messageId,
        gatewayDeviceSim: event.payload!.simNumber ?? null,
        status: 'received',
        gatewayReceivedAt: event.payload!.receivedAt ?? null,
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.set(
        threadRef,
        {
          phoneNumber,
          preview: body,
          lastMessageAt: FieldValue.serverTimestamp(),
          lastDirection: 'inbound',
          unreadCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      transaction.set(
        intakeRef,
        {
          threadId,
          phoneNumber,
          latestMessage: body,
          status: 'untriaged',
          source: 'sms',
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    // Update live gateway status
    await db.doc('systemSettings/smsGateway').set(
      {
        status: 'connected',
        lastConnectedAt: FieldValue.serverTimestamp(),
        lastPingAt: FieldValue.serverTimestamp(),
        lastError: null,
      },
      { merge: true }
    ).catch(() => undefined);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[sms-inbound-webhook] Error processing incoming SMS:', error);
    return new NextResponse(error instanceof Error ? error.message : 'Internal Server Error', { status: 500 });
  }
}
