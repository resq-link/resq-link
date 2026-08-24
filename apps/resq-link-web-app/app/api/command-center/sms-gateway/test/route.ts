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

    const body = await request.json().catch(() => ({}));
    const db = getAdminFirestore();
    const docRef = db.doc('systemSettings/smsGateway');
    const existingSnap = await docRef.get();
    const existing = existingSnap.data() || {};

    const baseUrl = (typeof body.gatewayBaseUrl === 'string' && body.gatewayBaseUrl.trim()
      ? body.gatewayBaseUrl.trim()
      : (existing.gatewayBaseUrl || '')).replace(/\/$/, '');

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
        { success: false, error: 'Please enter a Gateway Base URL (e.g. http://192.168.1.50:8080 or Cloud URL).' },
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
        const smsPayload: Record<string, unknown> = {
          phoneNumbers: [testPhoneNumber],
          textMessage: { text: `[RESQ-Link] Test message: Gateway connected successfully at ${new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })}.` },
        };
        if (simSlot) {
          smsPayload.simNumber = simSlot;
        }

        const res = await fetch(`${baseUrl}/messages`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(smsPayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;
        const resText = await res.text();

        if (!res.ok) {
          throw new Error(`Device returned HTTP ${res.status}: ${resText.slice(0, 200) || res.statusText}`);
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
        // Ping connectivity using /messages or /status
        let pingSuccess = false;
        let responseStatus = 0;
        let responseSnippet = '';

        try {
          const res = await fetch(`${baseUrl}/messages`, {
            method: 'GET',
            headers: { Authorization: authHeader },
            signal: controller.signal,
          });
          responseStatus = res.status;
          responseSnippet = (await res.text()).slice(0, 200);
          if (res.ok || res.status === 200 || res.status === 204) {
            pingSuccess = true;
          }
        } catch {
          // Fallback to GET /
          const res = await fetch(`${baseUrl}/`, {
            method: 'GET',
            headers: { Authorization: authHeader },
            signal: controller.signal,
          });
          responseStatus = res.status;
          if (res.ok || res.status === 200 || res.status === 401 || res.status === 403 || res.status === 404) {
            // Reached device
            if (res.status === 401) {
              throw new Error('Authentication failed (401 Unauthorized). Please check Username and Password.');
            }
            pingSuccess = true;
          }
        }

        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;

        if (!pingSuccess && responseStatus >= 400 && responseStatus !== 404) {
          throw new Error(`Device responded with error status ${responseStatus}: ${responseSnippet}`);
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
        errorMsg = 'Connection timed out after 10 seconds. Verify the Android phone is on the same network or the URL/port is open.';
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
      }, { status: 502 });
    }
  } catch (error) {
    console.error('[sms-gateway-test] Internal error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
