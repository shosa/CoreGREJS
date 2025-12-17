'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useHydration } from '@/store/auth';

export default function HomePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useHydration();

  useEffect(() => {
    if (!hasHydrated) return;

    if (isAuthenticated) {
      router.replace('/menu');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Caricamento...</p>
      </div>
    </div>
  );
}
