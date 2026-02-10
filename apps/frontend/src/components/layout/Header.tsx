'use client';

import { useState, useEffect, useRef } from 'react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);

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

        const stored = localStorage.getItem('lastSeenSpoolJobs');
        const seenIds = stored ? new Set(JSON.parse(stored)) : new Set<string>();

        const newCount = doneJobs.filter(j => !seenIds.has(j.id)).length;
        setNewFilesCount(newCount);
        setLastSeenJobIds(seenIds);
      } catch (err) {
        // Ignora errori silenziosamente
      }
    };

    checkNewFiles();
    const interval = setInterval(checkNewFiles, 3000);
    return () => clearInterval(interval);
  }, []);

  // Quando si apre lo spool, marca tutti i file come visti
  const handleOpenSpool = () => {
    setShowSpool(true);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="sticky top-0 z-50 flex w-full bg-white/95 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.05)] dark:bg-gray-800/95 dark:backdrop-blur-md dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
      >
        <div className="flex flex-grow items-center justify-between px-4 py-3 md:px-6 2xl:px-10">
          {/* Left side - Menu toggle and search */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile menu toggle */}
            <motion.button
              onClick={toggleSidebar}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="block rounded-xl border border-gray-100 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800 lg:hidden"
            >
              <i className="fas fa-bars text-gray-500 dark:text-gray-300"></i>
            </motion.button>

            {/* Search */}
            <div className="hidden sm:block group">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cerca cartellini, commesse..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-200/80 bg-gray-50/80 py-2.5 pl-10 pr-4 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-blue-500 dark:focus:bg-gray-800 xl:w-[420px]"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2">
                  <i className="fas fa-search text-gray-300 transition-colors duration-200 group-focus-within:text-blue-400"></i>
                </span>
              </div>
            </div>

            {/* Spool lavori */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleOpenSpool}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 ${
                newFilesCount > 0
                  ? 'border-blue-500 bg-blue-50 hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50'
                  : 'border-gray-200/80 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
              }`}
            >
              {/* Pulsazione se ci sono nuovi file */}
              {newFilesCount > 0 && (
                <motion.span
                  className="absolute inset-0 rounded-xl bg-blue-500 opacity-20"
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.2, 0, 0.2],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}

              <motion.i
                animate={
                  newFilesCount > 0
                    ? { rotate: [0, -6, 6, -6, 6, 0] }
                    : {}
                }
                transition={
                  newFilesCount > 0
                    ? { duration: 0.6, repeat: Infinity, repeatDelay: 3 }
                    : {}
                }
                className={newFilesCount > 0 ? "fas fa-file-alt text-blue-600 dark:text-blue-400" : "fas fa-file-alt text-gray-500 dark:text-gray-300"}
              />

              {/* Badge con conteggio */}
              {newFilesCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm shadow-red-500/30"
                >
                  {newFilesCount}
                </motion.span>
              )}
            </motion.button>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-3 2xsm:gap-7">
            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <motion.button
                onClick={() => setShowDropdown(!showDropdown)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3"
              >
                <span className="hidden text-right lg:block">
                  <span className="block text-sm font-semibold text-gray-800 dark:text-white">
                    {user?.nome}
                  </span>
                  <span className="block text-[11px] text-gray-400 dark:text-gray-400">
                    @{user?.userName}
                  </span>
                </span>

                <motion.span
                  whileHover={{ scale: 1.1 }}
                  className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white shadow-md shadow-purple-500/20 dark:ring-gray-800"
                >
                  {user?.nome?.charAt(0) || 'U'}
                </motion.span>

                <motion.i
                  animate={{ rotate: showDropdown ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="fas fa-chevron-down text-xs text-gray-400 dark:text-gray-300"
                />
              </motion.button>

              {/* Dropdown menu */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.8 }}
                    className="absolute right-0 mt-2.5 w-60 rounded-xl bg-white backdrop-blur-md border border-gray-200 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] dark:bg-gray-800 dark:border-gray-700 dark:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.4)] z-[100]"
                  >
                    <ul className="py-2">
                      <motion.li whileHover={{ x: 3, transition: { type: 'spring', stiffness: 400, damping: 20 } }}>
                        <Link
                          href="/profile"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150 rounded-lg mx-1 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                          onClick={() => setShowDropdown(false)}
                        >
                          <i className="fas fa-user text-gray-400"></i>
                          Profilo
                        </Link>
                      </motion.li>
                      {hasPermission('settings') && (
                        <motion.li whileHover={{ x: 3, transition: { type: 'spring', stiffness: 400, damping: 20 } }}>
                          <Link
                            href="/settings"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150 rounded-lg mx-1 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                            onClick={() => setShowDropdown(false)}
                          >
                            <i className="fas fa-cog text-gray-400"></i>
                            Impostazioni
                          </Link>
                        </motion.li>
                      )}
                      <motion.li
                        whileHover={{ x: 3, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                        className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1"
                      >
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-150 rounded-lg mx-1 dark:text-red-400 dark:hover:bg-red-900/20"
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
