import { NextRequest, NextResponse } from 'next/server'
import { RtcRole, RtcTokenBuilder } from 'agora-token'

const DEFAULT_TOKEN_TTL_SECONDS = 3600

const getTokenTtlSeconds = () => {
  const raw = Number(process.env.AGORA_TOKEN_TTL_SECONDS)
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_TOKEN_TTL_SECONDS
  }
  return Math.min(Math.floor(raw), 24 * 60 * 60)
}

const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export async function POST(request: NextRequest) {
  try {
    const appId = process.env.AGORA_APP_ID || process.env.EXPO_PUBLIC_AGORA_APP_ID
    const appCertificate = process.env.AGORA_APP_CERTIFICATE

    if (!appId || !appCertificate) {
      return NextResponse.json(
        { error: 'Agora token service is not configured.' },
        { status: 503 }
      )
    }

    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!idToken) {
      return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 })
    }

    const { verifyIdToken } = await import('@packages/firebase/admin')
    const decoded = await verifyIdToken(idToken)
    const body = await request.json()
    const incidentId = normalizeString(body.incidentId)
    const channelName = normalizeString(body.channelName)

    if (!incidentId || !channelName) {
      return NextResponse.json({ error: 'Missing incidentId or channelName.' }, { status: 400 })
    }

    if (channelName !== `incident_${incidentId}`) {
      return NextResponse.json({ error: 'Channel name does not match incident.' }, { status: 400 })
    }

    const ttlSeconds = getTokenTtlSeconds()
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds
    const token = RtcTokenBuilder.buildTokenWithUserAccount(
      appId,
      appCertificate,
      channelName,
      decoded.uid,
      RtcRole.PUBLISHER,
      expiresAt,
      expiresAt
    )

    return NextResponse.json({
      appId,
      channelName,
      token,
      uid: decoded.uid,
      expiresAt,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate Agora token.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
