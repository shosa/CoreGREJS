'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission: string;
  fallbackUrl?: string;
}

export default function PermissionGuard({
  children,
  requiredPermission,
  fallbackUrl = '/'
}: PermissionGuardProps) {
  const router = useRouter();
  const { user, hasPermission } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Aspetta un momento per il caricamento dello stato
    const timer = setTimeout(() => {
      setChecking(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Mostra loader durante il check
  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-blue-500 border-t-transparent"
        />
      </div>
    );
  }

  // Se non ha il permesso, mostra il messaggio di accesso negato
  if (!hasPermission(requiredPermission)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="rounded-2xl border border-red-200 bg-white shadow-2xl dark:border-red-800 dark:bg-gray-800 overflow-hidden">
            {/* Header con gradiente rosso */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6">
              <div className="flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg"
                >
                  <i className="fas fa-lock text-4xl text-red-500"></i>
                </motion.div>
              </div>
            </div>

            {/* Contenuto */}
            <div className="p-8 text-center">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-gray-900 dark:text-white mb-3"
              >
                Accesso Negato
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-600 dark:text-gray-400 mb-6"
              >
                Non hai i permessi necessari per accedere a questo modulo.
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6"
              >
                <div className="flex items-center justify-center text-sm">
                  <i className="fas fa-info-circle text-red-500 mr-2"></i>
                  <span className="text-red-700 dark:text-red-300">
                    Modulo richiesto: <strong className="font-semibold">{requiredPermission}</strong>
                  </span>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-sm text-gray-500 dark:text-gray-400 mb-8"
              >
                Se ritieni di dover avere accesso a questo modulo, contatta l'amministratore di sistema.
              </motion.p>

              {/* Azioni */}
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.back()}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Torna Indietro
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(fallbackUrl)}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md transition-all"
                >
                  <i className="fas fa-home mr-2"></i>
                  Dashboard
                </motion.button>
              </div>

              {/* Info utente */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Hai effettuato l'accesso come <strong className="font-medium text-gray-700 dark:text-gray-300">{user?.userName}</strong>
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Se ha il permesso, mostra il contenuto
  return <>{children}</>;
}
