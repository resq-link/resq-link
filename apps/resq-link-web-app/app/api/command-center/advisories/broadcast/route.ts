import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminFirestore, writeAuditLog } from '@packages/firebase/admin';
import { requireCommandCenter } from '@/lib/server/requireCommandCenter';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;
const CIVILIAN_ALERT_CHANNEL = 'emergency-updates';

interface StoredToken {
  token: string;
  platform?: 'ios' | 'android' | 'web';
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound: string;
  channelId: string;
  priority: 'high';
  interruptionLevel: 'time-sensitive' | 'critical';
  ttl: number;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireCommandCenter(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json();
    const advisoryId = typeof body.advisoryId === 'string' ? body.advisoryId.trim() : '';

    if (!advisoryId) {
      return NextResponse.json({ error: 'advisoryId is required' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const advisoryDocRef = db.collection('advisories').doc(advisoryId);
    const advisorySnap = await advisoryDocRef.get();

    if (!advisorySnap.exists) {
      return NextResponse.json({ error: 'Advisory not found' }, { status: 404 });
    }

    const advisory = advisorySnap.data() || {};
    const title = advisory.title || 'Emergency Advisory';
    const summary = advisory.summary || advisory.content?.slice(0, 140) || 'New public advisory issued';
    const severity = String(advisory.severity || 'info').toLowerCase();
    const targetScope = advisory.targetScope || 'all';
    const targetBarangays: string[] = Array.isArray(advisory.targetBarangays)
      ? advisory.targetBarangays.map((b: string) => b.trim().toLowerCase())
      : [];

    // Query civilian users with push tokens
    const usersSnapshot = await db.collection('users').get();

    const messages: ExpoMessage[] = [];
    const tokenOwners = new Map<string, string>(); // token -> userId

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const rawTokens = userData.pushTokens;
      if (!Array.isArray(rawTokens) || rawTokens.length === 0) return;

      // Check barangay targeting if scope is not 'all'
      if (targetScope === 'barangay' && targetBarangays.length > 0) {
        const userBarangay = String(userData.barangay || userData.address || '').toLowerCase();
        const matches = targetBarangays.some((target) => userBarangay.includes(target));
        if (!matches) return;
      }

      const tokens: StoredToken[] = rawTokens.filter(
        (t) => t?.token && typeof t.token === 'string' && t.token.startsWith('ExponentPushToken')
      );

      const prefix =
        severity === 'critical'
          ? '🚨 [CRITICAL ADVISORY] '
          : severity === 'severe'
          ? '⚠️ [SEVERE WARNING] '
          : severity === 'moderate'
          ? '📢 [ADVISORY] '
          : 'ℹ️ [NOTICE] ';

      tokens.forEach((entry) => {
        tokenOwners.set(entry.token, userDoc.id);
        messages.push({
          to: entry.token,
          title: `${prefix}${title}`,
          body: summary,
          data: {
            type: 'advisory',
            advisoryId,
            severity,
            category: advisory.category || 'general',
            title,
            summary,
            action: 'view_advisory',
          },
          sound: 'default',
          channelId: CIVILIAN_ALERT_CHANNEL,
          priority: 'high',
          interruptionLevel: severity === 'critical' ? 'critical' : 'time-sensitive',
          ttl: 86400,
        });
      });
    });

    if (messages.length === 0) {
      await advisoryDocRef.update({
        'pushNotification.sent': true,
        'pushNotification.sentAt': admin.firestore.FieldValue.serverTimestamp(),
        'pushNotification.totalRecipients': 0,
        'pushNotification.successCount': 0,
        'pushNotification.failureCount': 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        totalRecipients: 0,
        successCount: 0,
        failureCount: 0,
        message: 'No registered civilian push devices found matching target criteria.',
      });
    }

    // Batch send to Expo
    let successCount = 0;
    let failureCount = 0;
    let deadTokensPruned = 0;

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batch),
        });

        if (!res.ok) {
          console.error('[advisory-broadcast] Expo push batch error status:', res.status);
          failureCount += batch.length;
          continue;
        }

        const data = (await res.json()) as {
          data?: Array<{ status: string; details?: { error?: string } }>;
        };

        const tickets = data.data || [];
        for (let t = 0; t < tickets.length; t++) {
          const ticket = tickets[t];
          const token = batch[t]?.to;

          if (ticket?.status === 'ok') {
            successCount++;
          } else {
            failureCount++;
            if (ticket?.details?.error === 'DeviceNotRegistered' && token) {
              const userId = tokenOwners.get(token);
              if (userId) {
                try {
                  const userRef = db.collection('users').doc(userId);
                  const uSnap = await userRef.get();
                  if (uSnap.exists) {
                    const existing = uSnap.get('pushTokens') || [];
                    const stale = existing.filter((e: StoredToken) => e?.token === token);
                    if (stale.length > 0) {
                      await userRef.update({
                        pushTokens: admin.firestore.FieldValue.arrayRemove(...stale),
                      });
                      deadTokensPruned++;
                    }
                  }
                } catch (err) {
                  console.warn('[advisory-broadcast] Failed pruning dead token:', err);
                }
              }
            }
          }
        }
      } catch (batchErr) {
        console.error('[advisory-broadcast] Batch dispatch network error:', batchErr);
        failureCount += batch.length;
      }
    }

    // Update Advisory with broadcast results
    await advisoryDocRef.update({
      'pushNotification.sent': true,
      'pushNotification.sentAt': admin.firestore.FieldValue.serverTimestamp(),
      'pushNotification.totalRecipients': messages.length,
      'pushNotification.successCount': successCount,
      'pushNotification.failureCount': failureCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Write audit log
    await writeAuditLog({
      actorUid: authResult.auth.uid,
      actorEmail: authResult.auth.email,
      action: 'advisory.broadcast',
      targetUid: advisoryId,
      targetLabel: title,
      targetCollection: 'advisories',
      metadata: {
        severity,
        targetScope,
        totalRecipients: messages.length,
        successCount,
        failureCount,
        deadTokensPruned,
      },
    });

    return NextResponse.json({
      success: true,
      totalRecipients: messages.length,
      successCount,
      failureCount,
      deadTokensPruned,
      message: `Advisory broadcast transmitted to ${successCount} device(s).`,
    });
  } catch (error) {
    console.error('[advisory-broadcast] Server error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
