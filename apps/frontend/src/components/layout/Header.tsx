'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth';
import SpoolModal from './SpoolModal';
import { jobsApi } from '@/lib/api';

export default function Header() {
  const router = useRouter();
  const { user, toggleSidebar, logout, hasPermission } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSpool, setShowSpool] = useState(false);
  const [newFilesCount, setNewFilesCount] = useState(0);
  const [lastSeenJobIds, setLastSeenJobIds] = useState<Set<string>>(new Set());

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Polling per nuovi file nello spool
  useEffect(() => {
    const checkNewFiles = async () => {
      try {
        const jobs = await jobsApi.list();
        const doneJobs = jobs.filter(j => j.status === 'done' && j.outputName);
        const currentIds = new Set(doneJobs.map(j => j.id));

        // Carica IDs visti dal localStorage
        const stored = localStorage.getItem('lastSeenSpoolJobs');
        const seenIds = stored ? new Set(JSON.parse(stored)) : new Set<string>();

        // Calcola nuovi file (presenti ora ma non visti)
        const newCount = doneJobs.filter(j => !seenIds.has(j.id)).length;
        setNewFilesCount(newCount);
        setLastSeenJobIds(seenIds);
      } catch (err) {
        // Ignora errori silenziosamente
      }
    };

    checkNewFiles();
    const interval = setInterval(checkNewFiles, 3000); // Poll ogni 3 secondi
    return () => clearInterval(interval);
  }, []);

  // Quando si apre lo spool, marca tutti i file come visti
  const handleOpenSpool = () => {
    setShowSpool(true);

    // Dopo un piccolo delay per permettere allo SpoolModal di caricare i dati
    setTimeout(async () => {
      try {
        const jobs = await jobsApi.list();
        const doneJobs = jobs.filter(j => j.status === 'done' && j.outputName);
        const allIds = doneJobs.map(j => j.id);

        localStorage.setItem('lastSeenSpoolJobs', JSON.stringify(allIds));
        setLastSeenJobIds(new Set(allIds));
        setNewFilesCount(0);
      } catch (err) {
        // Ignora errori
      }
    }, 500);
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="sticky top-0 z-50 flex w-full bg-white shadow-md dark:bg-gray-800 dark:shadow-none"
      >
        <div className="flex flex-grow items-center justify-between px-4 py-4 md:px-6 2xl:px-11">
          {/* Left side - Menu toggle and search */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile menu toggle */}
          <motion.button
            onClick={toggleSidebar}
            whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="block rounded-lg border border-gray-200 bg-white p-1.5 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:hidden"
            >
              <i className="fas fa-bars text-gray-600 dark:text-gray-300"></i>
            </motion.button>

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="hidden sm:block"
          >
            <div className="relative">
              <motion.input
                type="text"
                placeholder="Cerca cartellini, commesse..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  whileFocus={{ scale: 1.02 }}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-900 dark:text-white xl:w-96"
                />
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                <i className="fas fa-search text-gray-400"></i>
              </span>
            </div>
          </motion.div>

          {/* Spool lavori (accanto alla ricerca) */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleOpenSpool}
            className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
              newFilesCount > 0
                ? 'border-blue-500 bg-blue-50 hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
            }`}
          >
            {/* Animazione pulsante se ci sono nuovi file */}
            {newFilesCount > 0 && (
              <motion.span
                className="absolute inset-0 rounded-full bg-blue-500 opacity-30"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}

            <motion.i
              animate={
                newFilesCount > 0
                  ? { rotate: [0, -8, 8, -8, 8, 0] }
                  : { rotate: [0, -8, 8, -8, 8, 0] }
              }
              transition={
                newFilesCount > 0
                  ? { duration: 0.5, repeat: Infinity, repeatDelay: 2 }
                  : { duration: 0.5, repeat: Infinity, repeatDelay: 6 }
              }
              className={newFilesCount > 0 ? "fas fa-file-alt text-blue-600 dark:text-blue-400" : "fas fa-file-alt text-gray-600 dark:text-gray-300"}
            />

            {/* Badge con conteggio */}
            {newFilesCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white"
              >
                {newFilesCount}
              </motion.span>
            )}
          </motion.button>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3 2xsm:gap-7">
          {/* User dropdown */}
            <div className="relative">
              <motion.button
                onClick={() => setShowDropdown(!showDropdown)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3"
              >
                <span className="hidden text-right lg:block">
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">
                    {user?.nome}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    @{user?.userName}
                  </span>
                </span>

                <motion.span
                  whileHover={{ scale: 1.1 }}
                  className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold"
                >
                  {user?.nome?.charAt(0) || 'U'}
                </motion.span>

                <motion.i
                  animate={{ rotate: showDropdown ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="fas fa-chevron-down text-gray-600 dark:text-gray-300"
                />
              </motion.button>

              {/* Dropdown menu */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-4 w-56 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 z-[100]"
                  >
                    <ul className="py-2">
                      <motion.li whileHover={{ x: 5 }}>
                        <Link
                          href="/profile"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                          onClick={() => setShowDropdown(false)}
                        >
                          <i className="fas fa-user"></i>
                          Profilo
                        </Link>
                      </motion.li>
                      {hasPermission('settings') && (
                        <motion.li whileHover={{ x: 5 }}>
                          <Link
                            href="/settings"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            onClick={() => setShowDropdown(false)}
                          >
                            <i className="fas fa-cog"></i>
                            Impostazioni
                          </Link>
                        </motion.li>
                      )}
                      <motion.li
                        whileHover={{ x: 5 }}
                        className="border-t border-gray-200 dark:border-gray-700"
                      >
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <i className="fas fa-sign-out-alt"></i>
                          Esci
                        </button>
                      </motion.li>
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.header>

      <SpoolModal open={showSpool} onClose={() => setShowSpool(false)} />
    </>
  );
}
