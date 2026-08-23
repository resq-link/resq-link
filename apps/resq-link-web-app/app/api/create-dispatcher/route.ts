import { NextRequest, NextResponse } from 'next/server';
import { createCommandCenterAccountAdmin } from '@packages/firebase/admin';
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
    const location =
      typeof body.location === 'string' && body.location.trim()
        ? body.location.trim()
        : 'Tuguegarao City';

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const result = await createCommandCenterAccountAdmin({
      email,
      password,
      name: fullName || 'Command Center',
      location,
    });

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'account.create.dispatcher',
      targetUid: result.uid,
      targetLabel: fullName || email,
      targetCollection: 'commandCenters',
      metadata: { location },
    });

    return NextResponse.json({ success: true, uid: result.uid });
  } catch (error: unknown) {
    const message = publicErrorMessage(error, 'Unable to create dispatcher. Please try again.');
    const status = message === 'Email already in use' ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
