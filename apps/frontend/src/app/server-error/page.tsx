'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

export default function ServerErrorPage() {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    // Redirect alla home e ricarica
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 dark:from-gray-900 dark:to-gray-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo/Brand */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl">
            <span className="text-3xl font-bold text-white">CG</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CoreGRE</h1>
        </motion.div>

        {/* Error Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg"
          >
            <i className="fas fa-server text-3xl text-white"></i>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-3 text-center text-2xl font-bold text-gray-900 dark:text-white"
          >
            Server non raggiungibile
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-6 text-center text-gray-600 dark:text-gray-400"
          >
            Non è possibile connettersi al server backend. Verifica la connessione e riprova.
          </motion.p>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50"
          >
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
              Possibili cause:
            </h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <i className="fas fa-circle text-xs mt-1.5 text-purple-500"></i>
                <span>Il server backend è offline</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-circle text-xs mt-1.5 text-purple-500"></i>
                <span>Problemi di connessione di rete</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-circle text-xs mt-1.5 text-purple-500"></i>
                <span>Il server è in manutenzione</span>
              </li>
            </ul>
          </motion.div>

          {/* Action Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            onClick={handleRetry}
            disabled={retrying}
            whileHover={{ scale: retrying ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-medium text-white shadow-md transition-all hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {retrying ? (
              <>
                <motion.i
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="fas fa-spinner mr-2"
                />
                Ricaricamento...
              </>
            ) : (
              <>
                <i className="fas fa-redo mr-2"></i>
                Riprova connessione
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Support Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400"
        >
          <p>
            Se il problema persiste, contatta l'amministratore di sistema.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
