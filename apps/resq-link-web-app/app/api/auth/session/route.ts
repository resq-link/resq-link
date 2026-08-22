import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@packages/firebase/admin'
import { resolveWebWorkspace } from '@/lib/server/resolveWebWorkspace'
import { WORKSPACE_COOKIE } from '@/lib/routes'
import type { WebWorkspace } from '@/lib/workspace'

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }

    const decoded = await verifyIdToken(token)
    const workspace = await resolveWebWorkspace(decoded.uid, decoded)
    const response = NextResponse.json({ workspace })

    if (workspace === 'unauthorized') {
      response.cookies.delete(WORKSPACE_COOKIE)
      return response
    }

    response.cookies.set(WORKSPACE_COOKIE, workspace, cookieOptions())
    return response
  } catch (error) {
    console.error('auth session failed', error)
    const response = NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    response.cookies.delete(WORKSPACE_COOKIE)
    return response
  }
}

export async function DELETE() {
  const response = NextResponse.json({ workspace: null as WebWorkspace | null })
  response.cookies.delete(WORKSPACE_COOKIE)
  return response
}
