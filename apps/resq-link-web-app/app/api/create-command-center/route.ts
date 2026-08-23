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
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const location = typeof body.location === 'string' ? body.location.trim() : '';

    if (!email || !password || !name || !location) {
      return NextResponse.json({ error: 'Missing email, password, name, or location' }, { status: 400 });
    }

    const result = await createCommandCenterAccountAdmin({
      email,
      password,
      name,
      location,
    });

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'account.create.command_center',
      targetUid: result.uid,
      targetLabel: name,
      targetCollection: 'commandCenters',
      metadata: { location },
    });

    return NextResponse.json({ success: true, uid: result.uid });
  } catch (error: unknown) {
    const message = publicErrorMessage(error, 'Unable to create command center. Please try again.');
    const status = message === 'Email already in use' ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
