import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { FieldValue, getAdminFirestore, writeAuditLog } from '@packages/firebase/admin';
import { requireCommandCenter } from '@/lib/server/requireCommandCenter';

function normalizeWebhookUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}/api/sms/inbound?token=${encodeURIComponent(token)}`;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireCommandCenter(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const db = getAdminFirestore();
    const docRef = db.doc('systemSettings/smsGateway');
    const docSnap = await docRef.get();

    const origin = request.nextUrl.origin || 'http://localhost:3000';
    let data = docSnap.data();

    if (!docSnap.exists || !data) {
      // Default initial state
      const defaultSecret = crypto.randomBytes(16).toString('hex');
      const initialSettings = {
        enabled: true,
        gatewayBaseUrl: '',
        gatewayUsername: 'sms',
        webhookSecret: defaultSecret,
        simSlot: 1,
        status: 'unconfigured',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await docRef.set(initialSettings, { merge: true });
      data = initialSettings;
    }

    const webhookSecret = data.webhookSecret || '';
    const hasPassword = Boolean(data.gatewayPassword);

    return NextResponse.json({
      enabled: data.enabled ?? true,
      gatewayBaseUrl: data.gatewayBaseUrl || '',
      gatewayUsername: data.gatewayUsername || 'sms',
      hasPassword,
      webhookSecret,
      webhookUrl: normalizeWebhookUrl(origin, webhookSecret),
      simSlot: data.simSlot ?? 1,
      status: data.status || (data.gatewayBaseUrl ? 'disconnected' : 'unconfigured'),
      lastPingAt: data.lastPingAt?.toDate?.()?.toISOString() ?? (data.lastPingAt ? String(data.lastPingAt) : null),
      lastConnectedAt: data.lastConnectedAt?.toDate?.()?.toISOString() ?? (data.lastConnectedAt ? String(data.lastConnectedAt) : null),
      lastError: data.lastError || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('[sms-gateway] Failed to fetch settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

function normalizeGatewayBaseUrl(url: string): string {
  let clean = (url || '').trim().replace(/\/+$/, '');
  if (clean === 'https://api.sms-gate.app' || clean === 'http://api.sms-gate.app') {
    clean = 'https://api.sms-gate.app/3rdparty/v1';
  }
  return clean;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireCommandCenter(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json();
    const {
      enabled = true,
      gatewayBaseUrl = '',
      gatewayUsername = 'sms',
      gatewayPassword,
      webhookSecret,
      simSlot = 1,
    } = body;

    const db = getAdminFirestore();
    const docRef = db.doc('systemSettings/smsGateway');
    const existingSnap = await docRef.get();
    const existing = existingSnap.data() || {};

    const cleanBaseUrl = normalizeGatewayBaseUrl(typeof gatewayBaseUrl === 'string' ? gatewayBaseUrl : '');
    const cleanUsername = typeof gatewayUsername === 'string' ? gatewayUsername.trim() : 'sms';
    let cleanSecret = typeof webhookSecret === 'string' ? webhookSecret.trim() : '';

    if (!cleanSecret) {
      cleanSecret = existing.webhookSecret || crypto.randomBytes(16).toString('hex');
    }

    const updatePayload: Record<string, unknown> = {
      enabled: Boolean(enabled),
      gatewayBaseUrl: cleanBaseUrl,
      gatewayUsername: cleanUsername,
      webhookSecret: cleanSecret,
      simSlot: typeof simSlot === 'number' ? simSlot : 1,
      status: cleanBaseUrl ? (existing.status === 'connected' ? 'connected' : 'disconnected') : 'unconfigured',
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: authResult.auth.uid,
    };

    // Only update password if a new non-masked password was passed
    if (typeof gatewayPassword === 'string' && gatewayPassword.trim() && !gatewayPassword.includes('••••')) {
      updatePayload.gatewayPassword = gatewayPassword.trim();
    }

    await docRef.set(updatePayload, { merge: true });

    // Write audit log
    await writeAuditLog({
      actorUid: authResult.auth.uid,
      actorEmail: authResult.auth.email,
      action: 'command_center.update',
      targetUid: 'systemSettings/smsGateway',
      targetLabel: 'Android SMS Gateway Configuration',
      targetCollection: 'systemSettings',
      metadata: {
        gatewayBaseUrl: cleanBaseUrl,
        gatewayUsername: cleanUsername,
        enabled: Boolean(enabled),
        simSlot: typeof simSlot === 'number' ? simSlot : 1,
      },
    }).catch((auditErr: any) => console.warn('[sms-gateway] Audit log error:', auditErr));

    const origin = request.nextUrl.origin || 'http://localhost:3000';
    const effectivePassword = typeof updatePayload.gatewayPassword === 'string'
      ? updatePayload.gatewayPassword
      : (typeof existing.gatewayPassword === 'string' ? existing.gatewayPassword : '');

    let webhookRegistered = false;
    if (cleanBaseUrl && effectivePassword) {
      try {
        const targetWebhookUrl = normalizeWebhookUrl(origin, cleanSecret);
        const authHeader = `Basic ${Buffer.from(`${cleanUsername}:${effectivePassword}`).toString('base64')}`;

        const hookRes = await fetch(`${cleanBaseUrl}/webhooks`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: 'resqlink-sms-inbound',
            url: targetWebhookUrl,
            event: 'sms:received',
          }),
        });

        if (hookRes.ok || hookRes.status === 200 || hookRes.status === 201 || hookRes.status === 204) {
          webhookRegistered = true;
        }
      } catch (hookErr: any) {
        console.warn('[sms-gateway] Auto webhook registration note:', hookErr?.message);
      }
    }

    const hasPassword = Boolean(updatePayload.gatewayPassword || existing.gatewayPassword);

    return NextResponse.json({
      success: true,
      webhookRegistered,
      settings: {
        enabled: updatePayload.enabled,
        gatewayBaseUrl: updatePayload.gatewayBaseUrl,
        gatewayUsername: updatePayload.gatewayUsername,
        hasPassword,
        webhookSecret: updatePayload.webhookSecret,
        webhookUrl: normalizeWebhookUrl(origin, cleanSecret),
        simSlot: updatePayload.simSlot,
        status: updatePayload.status,
      },
    });
  } catch (error) {
    console.error('[sms-gateway] Failed to update settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
