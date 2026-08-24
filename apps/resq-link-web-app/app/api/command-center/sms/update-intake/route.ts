import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, getAdminFirestore } from '@packages/firebase/admin';
import { requireCommandCenter } from '@/lib/server/requireCommandCenter';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireCommandCenter(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json();
    const threadId = typeof body?.threadId === 'string' ? body.threadId.trim() : '';
    const status = body?.status;

    if (!threadId || !['untriaged', 'triaged', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid intake update parameters.' }, { status: 400 });
    }

    const db = getAdminFirestore();
    await db.doc(`smsIntakes/${threadId}`).set(
      {
        status,
        triagedBy: authResult.auth.uid,
        triagedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[sms-update-intake] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update intake.' },
      { status: 500 }
    );
  }
}
