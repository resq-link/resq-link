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

function normalizeGatewayBaseUrl(url: string): string {
  let clean = (url || '').trim().replace(/\/+$/, '');
  if (clean === 'https://api.sms-gate.app' || clean === 'http://api.sms-gate.app') {
    clean = 'https://api.sms-gate.app/3rdparty/v1';
  }
  return clean;
}

function sanitizeGatewayErrorMessage(status: number, rawText: string): string {
  const isHtml = rawText.trim().startsWith('<') || rawText.includes('<!DOCTYPE') || rawText.includes('<html');
  if (status === 502 || status === 504 || status === 503) {
    return `Cloud Gateway returned HTTP ${status}. Your Android phone appears to be OFFLINE or disconnected from Cloud Server. In the Android SMS Gateway app, ensure Cloud Server is toggled ON and showing "Online".`;
  }
  if (status === 401 || status === 403) {
    return 'Authentication failed (401/403). Please verify your Username and Password/Token match the Android SMS Gateway app.';
  }
  if (status === 404) {
    return 'Endpoint not found (404). Please verify your Gateway Base URL (e.g. https://api.sms-gate.app/3rdparty/v1 or http://192.168.x.x:8080).';
  }
  if (isHtml) {
    return `Gateway returned HTTP ${status} error page.`;
  }
  return rawText.slice(0, 200) || `Device returned HTTP ${status}`;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireCommandCenter(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json().catch(() => ({}));
    const db = getAdminFirestore();
    const docRef = db.doc('systemSettings/smsGateway');
    const existingSnap = await docRef.get();
    const existing = existingSnap.data() || {};

    const rawBaseUrl = typeof body.gatewayBaseUrl === 'string' && body.gatewayBaseUrl.trim()
      ? body.gatewayBaseUrl.trim()
      : (existing.gatewayBaseUrl || '');
    const baseUrl = normalizeGatewayBaseUrl(rawBaseUrl);

    const username = (typeof body.gatewayUsername === 'string' && body.gatewayUsername.trim()
      ? body.gatewayUsername.trim()
      : (existing.gatewayUsername || 'sms')).trim();

    let password = typeof body.gatewayPassword === 'string' && body.gatewayPassword.trim() && !body.gatewayPassword.includes('••••')
      ? body.gatewayPassword.trim()
      : (existing.gatewayPassword || '');

    const simSlot = typeof body.simSlot === 'number' ? body.simSlot : (existing.simSlot ?? 1);
    const testPhoneNumber = body.testPhoneNumber ? normalizePhone(body.testPhoneNumber) : null;

    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: 'Please enter a Gateway Base URL (e.g. https://api.sms-gate.app/3rdparty/v1 or http://192.168.1.50:8080).' },
        { status: 400 }
      );
    }

    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      if (testPhoneNumber) {
        // Send a live test SMS
        const textMsg = `[RESQ-Link] Test message: Gateway connected successfully at ${new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })}.`;
        const smsPayload: Record<string, unknown> = {
          message: textMsg,
          textMessage: { text: textMsg },
          phoneNumbers: [testPhoneNumber],
          phone: [testPhoneNumber],
        };
        if (simSlot) {
          smsPayload.simNumber = simSlot;
          smsPayload.simSlot = simSlot;
        }

        // Try /message first, then fallback to /messages
        let res = await fetch(`${baseUrl}/message`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(smsPayload),
          signal: controller.signal,
        });

        if (res.status === 404) {
          res = await fetch(`${baseUrl}/messages`, {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(smsPayload),
            signal: controller.signal,
          });
        }

        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;
        const resText = await res.text();

        if (!res.ok) {
          throw new Error(sanitizeGatewayErrorMessage(res.status, resText));
        }

        await docRef.set({
          status: 'connected',
          lastPingAt: FieldValue.serverTimestamp(),
          lastConnectedAt: FieldValue.serverTimestamp(),
          lastError: null,
        }, { merge: true });

        return NextResponse.json({
          success: true,
          status: 'connected',
          latencyMs,
          message: `Test SMS dispatched successfully to ${testPhoneNumber} (${latencyMs}ms).`,
        });
      } else {
        // Ping connectivity using /message, /messages, or /status
        let pingSuccess = false;
        let lastStatus = 0;
        let lastBody = '';

        for (const endpoint of ['/message', '/messages', '/status', '']) {
          try {
            const res = await fetch(`${baseUrl}${endpoint}`, {
              method: 'GET',
              headers: { Authorization: authHeader },
              signal: controller.signal,
            });
            lastStatus = res.status;
            lastBody = await res.text();

            if (res.ok || res.status === 200 || res.status === 204) {
              pingSuccess = true;
              break;
            }
            if (res.status === 401 || res.status === 403) {
              throw new Error('Authentication failed (401/403). Please check your Username and Password/Token.');
            }
          } catch (err: any) {
            if (err.message?.includes('Authentication failed')) throw err;
          }
        }

        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;

        if (!pingSuccess && lastStatus >= 400 && lastStatus !== 404) {
          throw new Error(sanitizeGatewayErrorMessage(lastStatus, lastBody));
        }

        await docRef.set({
          status: 'connected',
          lastPingAt: FieldValue.serverTimestamp(),
          lastConnectedAt: FieldValue.serverTimestamp(),
          lastError: null,
        }, { merge: true });

        return NextResponse.json({
          success: true,
          status: 'connected',
          latencyMs,
          message: `Connected! Android SMS Gateway responded in ${latencyMs}ms.`,
        });
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      let errorMsg = fetchErr.message || 'Unable to connect to Android SMS Gateway.';
      if (fetchErr.name === 'AbortError') {
        errorMsg = 'Connection timed out after 10 seconds. Verify the Android phone is online, on the same network, or reachable.';
      }

      await docRef.set({
        status: 'error',
        lastPingAt: FieldValue.serverTimestamp(),
        lastError: errorMsg,
      }, { merge: true });

      return NextResponse.json({
        success: false,
        status: 'error',
        latencyMs,
        error: errorMsg,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('[sms-gateway-test] Internal error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
