'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, darkMode, token, sidebarCollapsed } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Aspetta un tick per permettere a Zustand di fare hydration
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Solo dopo il loading iniziale, controlla l'autenticazione
    if (!isLoading && !isAuthenticated && !token) {
      router.replace('/login');
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

  // Se non autenticato, mostra loading mentre fa il redirect
  if (!isAuthenticated && !token) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className={`h-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <Sidebar />

      {/* Content Area */}
      <div
        className="relative flex flex-col h-full overflow-x-hidden overflow-y-auto transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? '72px' : '260px' }}
      >
        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="relative flex-1 bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-y-auto">
          {/* Animated Wave Background - Fixed */}
          <div className="fixed bottom-0 left-0 right-0 h-80 overflow-hidden pointer-events-none z-0 transition-all duration-300" style={{ marginLeft: sidebarCollapsed ? '72px' : '260px' }}>
            {/* Wave 1 - Bottom */}
            <div className="absolute bottom-0 left-0 right-0">
              <svg
                viewBox="0 0 1440 320"
                className="w-full h-auto"
                preserveAspectRatio="none"
              >
                <motion.path
                  animate={{
                    d: [
                      'M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,234.7C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z',
                      'M0,256L48,240C96,224,192,192,288,186.7C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,208C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z',
                      'M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,234.7C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z',
                    ],
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  fill="#e5e7eb"
                  fillOpacity="0.15"
                  className="dark:fill-gray-700 dark:opacity-10"
                />
              </svg>
            </div>

            {/* Wave 2 - Middle */}
            <div className="absolute bottom-0 left-0 right-0">
              <svg
                viewBox="0 0 1440 320"
                className="w-full h-auto"
                preserveAspectRatio="none"
              >
                <motion.path
                  animate={{
                    d: [
                      'M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,213.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z',
                      'M0,256L48,261.3C96,267,192,277,288,272C384,267,480,245,576,234.7C672,224,768,224,864,234.7C960,245,1056,267,1152,272C1248,277,1344,267,1392,261.3L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z',
                      'M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,213.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z',
                    ],
                  }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 1.5,
                  }}
                  fill="#d1d5db"
                  fillOpacity="0.12"
                  className="dark:fill-gray-600 dark:opacity-8"
                />
              </svg>
            </div>

            {/* Wave 3 - Top */}
            <div className="absolute bottom-0 left-0 right-0">
              <svg
                viewBox="0 0 1440 320"
                className="w-full h-auto"
                preserveAspectRatio="none"
              >
                <motion.path
                  animate={{
                    d: [
                      'M0,320L48,298.7C96,277,192,235,288,224C384,213,480,235,576,250.7C672,267,768,277,864,272C960,267,1056,245,1152,240C1248,235,1344,245,1392,250.7L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z',
                      'M0,288L48,282.7C96,277,192,267,288,266.7C384,267,480,277,576,282.7C672,288,768,288,864,277.3C960,267,1056,245,1152,250.7C1248,256,1344,288,1392,304L1440,320L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z',
                      'M0,320L48,298.7C96,277,192,235,288,224C384,213,480,235,576,250.7C672,267,768,277,864,272C960,267,1056,245,1152,240C1248,235,1344,245,1392,250.7L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z',
                    ],
                  }}
                  transition={{
                    duration: 14,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 3,
                  }}
                  fill="#f3f4f6"
                  fillOpacity="0.08"
                  className="dark:fill-gray-500 dark:opacity-5"
                />
              </svg>
            </div>
          </div>

          {/* Content with relative positioning */}
          <div className="relative z-[1] mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
