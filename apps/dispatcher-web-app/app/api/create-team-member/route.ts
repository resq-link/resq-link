import { NextRequest, NextResponse } from 'next/server'
import type { DispatcherRole } from '@packages/firebase'

const validRoles: DispatcherRole[] = ['BFP', 'PNP', 'MDRRMO', 'AMBULANCE', 'PCG']

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(request: NextRequest) {
  try {
    const { createDispatcherAccountAdmin, isCommandCenterAccount, verifyIdToken } = await import('@packages/firebase/admin')
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }

    const decoded = await verifyIdToken(token)
    const isCommandCenter = await isCommandCenterAccount(decoded.uid)
    if (!isCommandCenter) {
      return NextResponse.json({ error: 'Forbidden: command center access required' }, { status: 403 })
    }

    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
    const role = body.role as DispatcherRole
    const designation = normalizeOptionalString(body.designation) ?? 'dispatcher'
    const teamCode = normalizeOptionalString(body.teamCode)
    const teamLabel = normalizeOptionalString(body.teamLabel) ?? teamCode

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing email, password, or agency' }, { status: 400 })
    }

    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid agency role' }, { status: 400 })
    }

    const result = await createDispatcherAccountAdmin({
      email,
      password,
      fullName,
      role,
      designation,
      teamCode,
      teamLabel,
    })

    return NextResponse.json({ success: true, uid: result.uid })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('email-already-exists') || msg.includes('already in use')) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
