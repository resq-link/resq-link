import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@packages/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    await getAdminAuth().verifyIdToken(token);

    const body = await request.json().catch(() => ({}));
    const targetUserId = typeof body?.targetUserId === 'string' ? body.targetUserId.trim() : '';
    const callerName = typeof body?.callerName === 'string' ? body.callerName.trim() : 'Emergency Dispatch';
    const roomName = typeof body?.roomName === 'string' ? body.roomName.trim() : '';
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
    const incidentId = typeof body?.incidentId === 'string' ? body.incidentId.trim() : '';

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required.' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const [userSnap, dispatcherSnap] = await Promise.all([
      db.doc(`users/${targetUserId}`).get(),
      db.doc(`dispatchers/${targetUserId}`).get(),
    ]);

    const userTokens: Array<{ token: string; platform: string }> = Array.isArray(userSnap.data()?.pushTokens)
      ? userSnap.data()?.pushTokens
      : [];
    const dispatcherTokens: Array<{ token: string; platform: string }> = Array.isArray(dispatcherSnap.data()?.pushTokens)
      ? dispatcherSnap.data()?.pushTokens
      : [];

    const allTokens = [...userTokens, ...dispatcherTokens]
      .map((t) => t?.token)
      .filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken['));

    if (allTokens.length === 0) {
      return NextResponse.json({ success: true, sentCount: 0, message: 'No registered push tokens found.' });
    }

    const messages = allTokens.map((pushToken) => ({
      to: pushToken,
      sound: 'default',
      priority: 'high',
      title: 'Incoming Emergency Voice Call',
      body: `${callerName} is calling you. Tap to answer.`,
      data: {
        type: 'incoming_call',
        sessionId,
        roomName,
        callerName,
        incidentId,
      },
    }));

    // Dispatch to Expo push service
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await expoResponse.json().catch(() => ({}));

    return NextResponse.json({
      success: true,
      sentCount: messages.length,
      result,
    });
  } catch (error: any) {
    console.error('[notifications/call-alert] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to dispatch call notification.' },
      { status: 500 }
    );
  }
}
