'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api';

export default function ServerStatusOverlay() {
  const [isServerDown, setIsServerDown] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  const checkServerStatus = useCallback(async () => {
    try {
      setIsChecking(true);
      await axios.get(`${API_URL}/health`, { timeout: 5000 });
      setIsServerDown(false);
      setLastCheckTime(new Date());
    } catch (error) {
      setIsServerDown(true);
      setLastCheckTime(new Date());
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Check server status on mount
  useEffect(() => {
    checkServerStatus();
  }, [checkServerStatus]);

  // Auto-retry every 10 seconds when server is down
  useEffect(() => {
    if (isServerDown) {
      const interval = setInterval(() => {
        checkServerStatus();
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [isServerDown, checkServerStatus]);

  const handleManualRetry = () => {
    checkServerStatus();
  };

  if (!isServerDown) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-md mx-4"
        >
          {/* Card */}
          <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <i className="fas fa-exclamation-triangle text-2xl text-white"></i>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Server non disponibile
                  </h2>
                  <p className="text-sm text-white/80">
                    Tentativo di riconnessione in corso...
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Status message */}
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
                <div className="flex items-start gap-3">
                  <i className="fas fa-info-circle text-yellow-600 dark:text-yellow-400 mt-0.5"></i>
                  <div className="flex-1 text-sm text-yellow-800 dark:text-yellow-300">
                    <p className="font-semibold mb-1">Connessione al server interrotta</p>
                    <p>Non è possibile raggiungere il server backend. L'applicazione riproverà automaticamente a connettersi.</p>
                  </div>
                </div>
              </div>

              {/* Possible causes */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Possibili cause:
                </h3>
                <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <i className="fas fa-circle text-[6px] mt-2 text-red-500"></i>
                    <span>Il server backend non è in esecuzione</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-circle text-[6px] mt-2 text-red-500"></i>
                    <span>Problemi di connessione alla rete</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-circle text-[6px] mt-2 text-red-500"></i>
                    <span>Il server è in fase di manutenzione</span>
                  </li>
                </ul>
              </div>

              {/* Last check time */}
              {lastCheckTime && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  Ultimo controllo: {lastCheckTime.toLocaleTimeString('it-IT')}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={handleManualRetry}
                disabled={isChecking}
                className="w-full rounded-lg bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 px-6 py-3 text-sm font-medium text-white shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isChecking ? (
                  <>
                    <motion.i
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="fas fa-spinner"
                    />
                    <span>Controllo in corso...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-sync-alt"></i>
                    <span>Riprova ora</span>
                  </>
                )}
              </button>

              <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
                Riprova automatica ogni 10 secondi
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
