'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Aspetta un tick per permettere a Zustand di fare hydration
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Se già autenticato, redirect alla dashboard
    if (!isLoading && (isAuthenticated || token)) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, token, router]);

  // Mostra loading mentre aspettiamo hydration
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  // Se autenticato, mostra loading mentre fa il redirect
  if (isAuthenticated || token) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
