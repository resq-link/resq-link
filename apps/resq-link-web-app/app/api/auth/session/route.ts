import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@packages/firebase/admin';
import { resolveWebWorkspaceWithMeta } from '@/lib/server/resolveWebWorkspace';
import { ensureSuperAdminIdentity } from '@/lib/server/ensureSuperAdminIdentity';
import { WORKSPACE_COOKIE } from '@/lib/routes';
import { homeForWorkspace, type WebWorkspace } from '@/lib/workspace';

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
  };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const decoded = await verifyIdToken(token);
    let resolution = await resolveWebWorkspaceWithMeta(decoded.uid, decoded);
    let forceTokenRefresh = false;

    // Email/claim-based Super Admins must also have admins/{uid} + claims so
    // Firestore client listeners (adminNotifications) pass security rules.
    if (resolution.workspace === 'super_admin') {
      const ensured = await ensureSuperAdminIdentity(decoded.uid, decoded.email);
      // Refresh client token whenever identity was provisioned so Firestore rules
      // see claims immediately (admins/{uid} exists() also works without claims).
      forceTokenRefresh = ensured.claimsUpdated || ensured.ensuredDoc;
      if (ensured.ensuredDoc || ensured.claimsUpdated) {
        resolution = await resolveWebWorkspaceWithMeta(decoded.uid, decoded);
      }
    }

    const response = NextResponse.json({
      workspace: resolution.workspace,
      forceTokenRefresh,
      resolution: {
        uid: resolution.uid,
        adminDoc: resolution.adminDoc,
        adminByEmail: resolution.adminByEmail,
        superAdminClaim: resolution.superAdminClaim,
        commandCenterDoc: resolution.commandCenterDoc,
        commandCenterClaim: resolution.commandCenterClaim,
        redirectTarget: homeForWorkspace(resolution.workspace),
      },
    });

    if (resolution.workspace === 'unauthorized') {
      response.cookies.delete(WORKSPACE_COOKIE);
      return response;
    }

    response.cookies.set(WORKSPACE_COOKIE, resolution.workspace, cookieOptions());
    return response;
  } catch (error) {
    console.error('auth session failed', error);
    const response = NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    response.cookies.delete(WORKSPACE_COOKIE);
    return response;
  }
}

export async function DELETE() {
  const response = NextResponse.json({ workspace: null as WebWorkspace | null });
  response.cookies.delete(WORKSPACE_COOKIE);
  return response;
}
