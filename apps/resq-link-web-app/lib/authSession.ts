import type { WebWorkspace } from '@/lib/workspace'

const SESSION_FETCH_OPTIONS: RequestInit = {
  credentials: 'same-origin',
}

export type WorkspaceResolutionSnapshot = {
  uid: string
  adminDoc: boolean
  adminByEmail: boolean
  superAdminClaim: boolean
  commandCenterDoc: boolean
  commandCenterClaim: boolean
}

type SessionResponse = {
  workspace?: WebWorkspace
  resolution?: WorkspaceResolutionSnapshot
  error?: string
} | null

export async function clearAuthSession(): Promise<void> {
  await fetch('/api/auth/session', { method: 'DELETE', ...SESSION_FETCH_OPTIONS })
}

export async function syncAuthSession(token: string | null): Promise<WebWorkspace | null> {
  if (!token) {
    await clearAuthSession()
    return null
  }

  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    ...SESSION_FETCH_OPTIONS,
  })

  const data = (await response.json().catch(() => null)) as SessionResponse
  if (!response.ok) {
    return 'unauthorized'
  }

  if (data?.resolution) {
    const target =
      data.workspace === 'super_admin'
        ? '/admin/dashboard'
        : data.workspace === 'command_center'
          ? '/command-center/intake'
          : '/login'

    console.info('[auth] workspace resolved', {
      uid: data.resolution.uid,
      workspace: data.workspace,
      adminDoc: data.resolution.adminDoc,
      adminByEmail: data.resolution.adminByEmail,
      superAdminClaim: data.resolution.superAdminClaim,
      commandCenterDoc: data.resolution.commandCenterDoc,
      commandCenterClaim: data.resolution.commandCenterClaim,
      redirectTarget: target,
    })
  }

  return data?.workspace ?? 'unauthorized'
}
