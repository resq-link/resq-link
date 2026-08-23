import { NextRequest, NextResponse } from 'next/server';
import { createCivilianAccountAdmin } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import { publicErrorMessage } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Missing email, password, or full name' }, { status: 400 });
    }

    const result = await createCivilianAccountAdmin({
      email,
      password,
      fullName,
      phone,
      address,
    });

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'account.create.civilian',
      targetUid: result.uid,
      targetLabel: fullName || email,
      targetCollection: 'users',
    });

    return NextResponse.json({ success: true, uid: result.uid });
  } catch (error: unknown) {
    const message = publicErrorMessage(error, 'Unable to create civilian. Please try again.');
    const status = message === 'Email already in use' ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
