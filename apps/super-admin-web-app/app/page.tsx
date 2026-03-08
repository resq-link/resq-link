'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAdminAuth();

  useEffect(() => {
    if (loading) return;
    if (user && isAdmin) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, isAdmin, loading, router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );
}
