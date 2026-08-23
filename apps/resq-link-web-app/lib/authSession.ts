import type { WebWorkspace } from '@/lib/workspace';

const SESSION_FETCH_OPTIONS: RequestInit = {
  credentials: 'same-origin',
};

export type WorkspaceResolutionSnapshot = {
  uid: string;
  adminDoc: boolean;
  adminByEmail: boolean;
  superAdminClaim: boolean;
  commandCenterDoc: boolean;
  commandCenterClaim: boolean;
};

export type AuthSessionResult = {
  workspace: WebWorkspace | null;
  forceTokenRefresh: boolean;
  resolution?: WorkspaceResolutionSnapshot;
};

type SessionResponse = {
  workspace?: WebWorkspace;
  forceTokenRefresh?: boolean;
  resolution?: WorkspaceResolutionSnapshot;
  error?: string;
} | null;

export async function clearAuthSession(): Promise<void> {
  await fetch('/api/auth/session', { method: 'DELETE', ...SESSION_FETCH_OPTIONS });
}

export async function syncAuthSession(token: string | null): Promise<AuthSessionResult> {
  if (!token) {
    await clearAuthSession();
    return { workspace: null, forceTokenRefresh: false };
  }

  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    ...SESSION_FETCH_OPTIONS,
  });

  const data = (await response.json().catch(() => null)) as SessionResponse;
  if (!response.ok) {
    return { workspace: 'unauthorized', forceTokenRefresh: false };
  }

  if (data?.resolution) {
    const target =
      data.workspace === 'super_admin'
        ? '/admin/dashboard'
        : data.workspace === 'command_center'
          ? '/command-center/intake'
          : '/login';

    console.info('[auth] workspace resolved', {
      uid: data.resolution.uid,
      workspace: data.workspace,
      adminDoc: data.resolution.adminDoc,
      adminByEmail: data.resolution.adminByEmail,
      superAdminClaim: data.resolution.superAdminClaim,
      commandCenterDoc: data.resolution.commandCenterDoc,
      commandCenterClaim: data.resolution.commandCenterClaim,
      forceTokenRefresh: Boolean(data.forceTokenRefresh),
      redirectTarget: target,
    });
  }

  return {
    workspace: data?.workspace ?? 'unauthorized',
    forceTokenRefresh: Boolean(data?.forceTokenRefresh),
    resolution: data?.resolution,
  };
}
