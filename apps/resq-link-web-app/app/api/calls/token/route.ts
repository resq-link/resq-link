import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { getAdminAuth } from '@packages/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const body = await request.json().catch(() => ({}));
    const roomName = typeof body?.roomName === 'string' ? body.roomName.trim() : '';
    const participantName =
      typeof body?.participantName === 'string' && body.participantName.trim()
        ? body.participantName.trim()
        : (decodedToken.name || decodedToken.email || decodedToken.uid);

    if (!roomName) {
      return NextResponse.json({ error: 'Room name is required.' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret1234567890123456789012345678';
    const livekitUrl =
      process.env.NEXT_PUBLIC_LIVEKIT_URL ||
      process.env.LIVEKIT_URL ||
      'wss://demo.livekit.cloud';

    const at = new AccessToken(apiKey, apiSecret, {
      identity: decodedToken.uid,
      name: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwtToken = await at.toJwt();

    return NextResponse.json({
      token: jwtToken,
      url: livekitUrl,
      roomName,
      identity: decodedToken.uid,
      participantName,
    });
  } catch (error: any) {
    console.error('[calls/token] Error generating token:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate calling token.' },
      { status: 500 }
    );
  }
}
