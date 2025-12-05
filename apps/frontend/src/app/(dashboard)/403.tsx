'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Forbidden() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        {/* Error Code */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-8"
        >
          <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-800">403</h1>
        </motion.div>

        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg"
        >
          <i className="fas fa-lock text-4xl text-white"></i>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            Accesso negato
          </h2>
          <p className="mb-8 text-gray-600 dark:text-gray-400">
            Non hai i permessi necessari per accedere a questa risorsa.
          </p>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 text-sm font-medium text-white shadow-md transition-all hover:from-yellow-600 hover:to-orange-600"
              >
                <i className="fas fa-home mr-2"></i>
                Torna alla Home
              </motion.button>
            </Link>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.history.back()}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Indietro
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
