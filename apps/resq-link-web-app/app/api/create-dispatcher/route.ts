import { NextRequest, NextResponse } from 'next/server';
import { createDispatcherAccountAdmin } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { recordAudit } from '@/lib/server/audit';
import { notifySuperAdmins } from '@/lib/server/adminNotifications';
import { assertAssignableAgencyCode } from '@/lib/server/agencies';
import { publicErrorMessage } from '@/lib/errors';
import { routes } from '@/lib/routes';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role = body.role;
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const teamCode = typeof body.teamCode === 'string' ? body.teamCode.trim() : '';
    const teamLabel = typeof body.teamLabel === 'string' ? body.teamLabel.trim() : teamCode;

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing email, password, or agency' }, { status: 400 });
    }
    let agencyCode: string;
    try {
      agencyCode = await assertAssignableAgencyCode(role);
    } catch (error) {
      const status = (error as { status?: number }).status || 400;
      return NextResponse.json({ error: (error as Error).message }, { status });
    }

    const result = await createDispatcherAccountAdmin({
      email,
      password,
      role: agencyCode,
      fullName,
      designation: 'dispatcher',
      teamCode: teamCode || null,
      teamLabel: teamLabel || null,
    });

    await recordAudit({
      actorUid: auth.auth.uid,
      actorEmail: auth.auth.email,
      action: 'account.create.dispatcher',
      targetUid: result.uid,
      targetLabel: fullName || email,
      targetCollection: 'dispatchers',
      metadata: { agency: agencyCode, teamCode: teamCode || null },
    });

    await notifySuperAdmins({
      type: 'account.created.dispatcher',
      title: 'Dispatcher account created',
      message: `${fullName || email} was added to ${agencyCode}.`,
      targetUrl: routes.admin.dispatchers,
      targetId: result.uid,
      excludeUid: auth.auth.uid,
      metadata: { agency: agencyCode },
    });

    return NextResponse.json({ success: true, uid: result.uid });
  } catch (error: unknown) {
    const message = publicErrorMessage(error, 'Unable to create dispatcher. Please try again.');
    const status = message === 'Email already in use' ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
