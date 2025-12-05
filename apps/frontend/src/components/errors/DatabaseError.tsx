'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface DatabaseErrorProps {
  onRetry?: () => void;
}

export default function DatabaseError({ onRetry }: DatabaseErrorProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    if (onRetry) {
      onRetry();
    } else {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-lg"
        >
          <i className="fas fa-database text-4xl text-white"></i>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-3 text-2xl font-bold text-gray-900 dark:text-white"
        >
          Database non raggiungibile
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-6 text-gray-600 dark:text-gray-400"
        >
          Non è possibile connettersi al database. Verifica la connessione.
        </motion.p>

        {/* Action Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleRetry}
          disabled={retrying}
          whileHover={{ scale: retrying ? 1 : 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center rounded-lg bg-gradient-to-r from-red-500 to-orange-500 px-6 py-3 text-sm font-medium text-white shadow-md transition-all hover:from-red-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {retrying ? (
            <>
              <motion.i
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="fas fa-spinner mr-2"
              />
              Riprovo...
            </>
          ) : (
            <>
              <i className="fas fa-redo mr-2"></i>
              Riprova
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
