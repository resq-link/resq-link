import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@packages/firebase/admin'
import { recordAudit } from '@/lib/server/audit'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : ''
    const accountType = typeof body.accountType === 'string' ? body.accountType.trim() : 'civilian'
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

    if (!identifier) {
      return NextResponse.json(
        { error: 'Email address or mobile phone number is required.' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()
    const timestamp = new Date()

    // Store deletion request in accountDeletionRequests collection for administrative review & tracking
    const requestDoc = await db.collection('accountDeletionRequests').add({
      identifier,
      accountType,
      reason: reason || null,
      status: 'pending',
      requestedAt: timestamp,
      source: 'web_public_portal',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })

    // Log in audit log
    await recordAudit({
      actorUid: 'system_public',
      actorEmail: 'public-web-request',
      action: 'account.delete',
      targetUid: requestDoc.id,
      targetLabel: identifier,
      targetCollection: 'accountDeletionRequests',
      reason: reason || 'Public portal account deletion request',
      metadata: {
        identifier,
        accountType,
        requestId: requestDoc.id,
        isPublicRequest: true,
      },
    })

    return NextResponse.json({
      success: true,
      requestId: requestDoc.id,
      message: 'Account deletion request received successfully.',
    })
  } catch (error: any) {
    console.error('Error handling public account deletion request:', error)
    return NextResponse.json(
      { error: 'Failed to process account deletion request. Please try again later or contact support directly.' },
      { status: 500 }
    )
  }
}
