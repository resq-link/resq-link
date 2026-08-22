import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@packages/firebase/admin';
import { requireSuperAdmin } from '@/lib/requireSuperAdmin';
import { publicErrorMessage } from '@/lib/errors';

const FALLBACK_TEAMS = [
  { code: 'whiskey', label: 'Whiskey' },
  { code: 'x-ray', label: 'X-ray' },
  { code: 'yankee', label: 'Yankee' },
  { code: 'zulu', label: 'Zulu' },
];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const fallback = FALLBACK_TEAMS;

    try {
      const snap = await getAdminFirestore().collection('teams').get();
      if (snap.empty) {
        return NextResponse.json({ items: fallback });
      }
      const items = snap.docs
        .map((doc) => {
          const data = doc.data() || {};
          return {
            code: String(data.code || doc.id),
            label: String(data.label || data.code || doc.id),
            isActive: data.isActive !== false,
          };
        })
        .filter((team) => team.isActive)
        .map(({ code, label }) => ({ code, label }));
      return NextResponse.json({ items: items.length > 0 ? items : fallback });
    } catch {
      return NextResponse.json({ items: fallback });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Unable to load teams.') },
      { status: 500 }
    );
  }
}
