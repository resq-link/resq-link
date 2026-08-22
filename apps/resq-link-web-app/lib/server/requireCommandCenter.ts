import { NextRequest, NextResponse } from 'next/server'
import { isCommandCenterAccount, verifyIdToken } from '@packages/firebase/admin'
import type { DecodedIdToken } from 'firebase-admin/auth'

export interface CommandCenterAuth {
  uid: string
  email: string | null
  token: DecodedIdToken
}

export type CommandCenterResult =
  | { ok: true; auth: CommandCenterAuth }
  | { ok: false; response: NextResponse }

export async function requireCommandCenter(request: NextRequest): Promise<CommandCenterResult> {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Missing authorization token' }, { status: 401 }),
      }
    }

    const decoded = await verifyIdToken(token)
    const allowed = await isCommandCenterAccount(decoded.uid)
    if (!allowed) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Forbidden: command center access required' },
          { status: 403 }
        ),
      }
    }

    return {
      ok: true,
      auth: {
        uid: decoded.uid,
        email: typeof decoded.email === 'string' ? decoded.email : null,
        token: decoded,
      },
    }
  } catch (error) {
    console.error('requireCommandCenter failed', error)
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }),
    }
  }
}
