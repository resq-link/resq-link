import type { WebWorkspace } from '@/lib/workspace'

const SESSION_FETCH_OPTIONS: RequestInit = {
  credentials: 'same-origin',
}

type SessionResponse = { workspace?: WebWorkspace; error?: string } | null

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

  return data?.workspace ?? 'unauthorized'
}
