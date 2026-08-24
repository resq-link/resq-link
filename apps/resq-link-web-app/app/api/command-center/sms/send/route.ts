import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, getAdminFirestore } from '@packages/firebase/admin';
import { requireCommandCenter } from '@/lib/server/requireCommandCenter';

function normalizePhone(value: unknown): string | null {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (/^9\d{9}$/.test(digits)) return `+63${digits}`;
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireCommandCenter(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json();
    const phoneNumber = normalizePhone(body?.phoneNumber);
    const messageBody = typeof body?.body === 'string' ? body.body.trim() : '';
    const threadId = typeof body?.threadId === 'string' ? body.threadId : null;

    if (!phoneNumber || !threadId || !messageBody || messageBody.length > 480) {
      return NextResponse.json({ error: 'Invalid message data or length exceeded (max 480 chars).' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const settingsSnap = await db.doc('systemSettings/smsGateway').get();
    const settings = settingsSnap.data();

    const baseUrl = (typeof settings?.gatewayBaseUrl === 'string' ? settings.gatewayBaseUrl.trim() : '') ||
      (process.env.SMS_GATEWAY_BASE_URL || '').trim();
    const username = (typeof settings?.gatewayUsername === 'string' ? settings.gatewayUsername.trim() : '') ||
      (process.env.SMS_GATEWAY_USERNAME || 'sms').trim();
    const password = (typeof settings?.gatewayPassword === 'string' ? settings.gatewayPassword.trim() : '') ||
      (process.env.SMS_GATEWAY_PASSWORD || '').trim();
    const simSlot = typeof settings?.simSlot === 'number' ? settings.simSlot : undefined;

    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Android SMS Gateway is not configured. Please configure it in Account → SMS Gateway Settings.' },
        { status: 400 }
      );
    }

    const outgoingRef = db.collection('smsMessages').doc();
    await outgoingRef.set({
      threadId,
      phoneNumber,
      body: messageBody,
      direction: 'outbound',
      status: 'queued',
      dispatcherId: authResult.auth.uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    const smsPayload: Record<string, unknown> = {
      phoneNumbers: [phoneNumber],
      textMessage: { text: messageBody },
    };
    if (simSlot) {
      smsPayload.simNumber = simSlot;
    }

    const gatewayResponse = await fetch(`${baseUrl.replace(/\/$/, '')}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smsPayload),
    });

    const gatewayResponseText = await gatewayResponse.text();
    let gatewayPayload: { id?: string } | null = null;
    try {
      gatewayPayload = gatewayResponseText ? (JSON.parse(gatewayResponseText) as { id?: string }) : null;
    } catch {
      gatewayPayload = null;
    }

    if (!gatewayResponse.ok) {
      console.error('[sms-send] Gateway rejected message:', {
        status: gatewayResponse.status,
        detail: gatewayResponseText.slice(0, 300),
      });
      await outgoingRef.update({
        status: 'failed',
        error: `Gateway returned status ${gatewayResponse.status}`,
      });
      return NextResponse.json(
        { error: `Android SMS Gateway rejected the message (${gatewayResponse.status}).` },
        { status: 502 }
      );
    }

    await Promise.all([
      outgoingRef.update({
        status: 'sent',
        gatewayMessageId: gatewayPayload?.id ?? null,
        sentAt: FieldValue.serverTimestamp(),
      }),
      db.doc(`smsThreads/${threadId}`).set(
        {
          preview: messageBody,
          lastMessageAt: FieldValue.serverTimestamp(),
          lastDirection: 'outbound',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      ),
      db.doc('systemSettings/smsGateway').set(
        {
          status: 'connected',
          lastConnectedAt: FieldValue.serverTimestamp(),
          lastPingAt: FieldValue.serverTimestamp(),
          lastError: null,
        },
        { merge: true }
      ).catch(() => undefined),
    ]);

    return NextResponse.json({ id: outgoingRef.id }, { status: 201 });
  } catch (error) {
    console.error('[sms-send] Error sending SMS:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to send SMS.' },
      { status: 500 }
    );
  }
}
