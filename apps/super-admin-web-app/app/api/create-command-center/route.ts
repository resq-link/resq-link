import { NextRequest, NextResponse } from 'next/server';
import { createCommandCenterAccountAdmin, isAdmin, verifyIdToken } from '@packages/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const decoded = await verifyIdToken(token);
    const uid = decoded.uid;

    const adminCheck = await isAdmin(uid);
    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, name, location } = body;
    if (!email || !password || !name || !location) {
      return NextResponse.json({ error: 'Missing email, password, name, or location' }, { status: 400 });
    }

    const result = await createCommandCenterAccountAdmin({
      email,
      password,
      name,
      location,
    });
    return NextResponse.json({ success: true, uid: result.uid });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg.includes('email-already-exists') || msg.includes('already in use')) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
