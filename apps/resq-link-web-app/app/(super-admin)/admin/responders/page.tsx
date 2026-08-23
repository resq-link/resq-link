'use client';

import { Suspense } from 'react';
import { StaffAccountsPage } from '@/components/accounts/StaffAccountsPage';

export default function RespondersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-admin-fg-subtle">Loading...</p>}>
      <StaffAccountsPage kind="responder" />
    </Suspense>
  );
}
