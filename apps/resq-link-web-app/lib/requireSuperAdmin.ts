import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, verifyIdToken } from '@packages/firebase/admin'
import type { DecodedIdToken } from 'firebase-admin/auth'

export interface SuperAdminAuth {
  uid: string
  email: string | null
  token: DecodedIdToken
}

export type SuperAdminResult =
  | { ok: true; auth: SuperAdminAuth }
  | { ok: false; response: NextResponse }

export async function requireSuperAdmin(request: NextRequest): Promise<SuperAdminResult> {
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
    const adminCheck = await isAdmin(decoded.uid)
    if (!adminCheck) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Forbidden: Super admin access required' },
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
    console.error('requireSuperAdmin failed', error)
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }),
    }
  }
}
