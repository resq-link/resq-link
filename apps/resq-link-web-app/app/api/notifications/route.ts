import { NextRequest, NextResponse } from 'next/server';
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { mapAdminNotificationDoc } from '@/lib/server/adminNotifications';
import { toMillis } from '@/lib/server/timestamps';
import { publicErrorMessage } from '@/lib/errors';
import type { AdminNotificationCategory } from '@/lib/adminNotifications';

let orderedIndexReady = true;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 40), 1), 100);
    const unreadOnly = searchParams.get('unread') === '1' || searchParams.get('unread') === 'true';
    const categoryParam = searchParams.get('category');
    const category =
      categoryParam === 'kyc' || categoryParam === 'operational' || categoryParam === 'system'
        ? (categoryParam as AdminNotificationCategory)
        : null;
    const preview = searchParams.get('preview') === '1';

    const db = getAdminFirestore();
    const uid = auth.auth.uid;
    let docs: QueryDocumentSnapshot[] = [];

    try {
      if (!orderedIndexReady) {
        throw new Error('SKIP_ORDERED_INDEX');
      }

      let query: Query = db
        .collection('adminNotifications')
        .where('recipientUid', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(Math.max(limit * 2, 40));

      if (unreadOnly) {
        query = db
          .collection('adminNotifications')
          .where('recipientUid', '==', uid)
          .where('read', '==', false)
          .orderBy('createdAt', 'desc')
          .limit(Math.max(limit * 2, 40));
      }

      const snap = await query.get();
      docs = snap.docs;
    } catch (error) {
      const skipped = error instanceof Error && error.message === 'SKIP_ORDERED_INDEX';
      if (orderedIndexReady && !skipped) {
        orderedIndexReady = false;
        console.warn(
          'adminNotifications composite index is missing; using in-memory sort until recipientUid+createdAt is deployed.'
        );
      }
      const snap = await db.collection('adminNotifications').where('recipientUid', '==', uid).limit(200).get();
      docs = [...snap.docs].sort(
        (a, b) => toMillis(b.data().createdAt) - toMillis(a.data().createdAt)
      );
    }

    let items = docs.map((doc) => mapAdminNotificationDoc(doc.id, doc.data() as Record<string, unknown>));

    if (unreadOnly) {
      items = items.filter((item) => !item.read);
    }
    if (category) {
      items = items.filter((item) => item.category === category);
    }

    let unreadCount = 0;
    try {
      const unreadSnap = await db
        .collection('adminNotifications')
        .where('recipientUid', '==', uid)
        .where('read', '==', false)
        .limit(200)
        .get();
      unreadCount = unreadSnap.size;
    } catch {
      unreadCount = items.filter((item) => !item.read).length;
    }

    return NextResponse.json({
      items: items.slice(0, preview ? 5 : limit),
      unreadCount,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to load notifications.') },
      { status: 500 }
    );
  }
}
