'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth';
import { dashboardApi } from '@/lib/api';

interface DashboardStats {
  riparazioniAperte: number;
  riparazioniMie: number;
  qualityRecordsToday: number;
  ddtBozze: number;
  scmLanciAttivi: number;
  produzioneSettimana: number;
  produzioneMese: number;
}

interface Activity {
  id: number;
  action: string;
  description: string;
  icon: string;
  createdAt: string;
  user: { nome: string };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

const cardHover = {
  scale: 1.02,
  y: -4,
  transition: { duration: 0.2 },
};

export default function DashboardPage() {
  const { user, hasPermission } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const fetchData = async () => {
    try {
      const statsData = await dashboardApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const activitiesData = await dashboardApi.getActivities();
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchActivities();

    // Auto refresh ogni 5 minuti
    const interval = setInterval(() => {
      fetchData();
      fetchActivities();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const currentDate = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-blue-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      {/* Dashboard Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Benvenuto, {user?.nome}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              <i className="far fa-calendar-alt mr-1"></i>
              {currentDate}
            </span>
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all"
            >
              <i className="fas fa-cog mr-2"></i>
              Personalizza Widget
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Stats Widget Grid */}
      <motion.div
        variants={containerVariants}
        className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4"
      >
        {/* Riparazioni Aperte */}
        <motion.div
          variants={itemVariants}
          whileHover={cardHover}
          onClick={() => window.location.href = '/riparazioni'}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800/40 backdrop-blur-sm cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Riparazioni Aperte
              </p>
              <motion.h3
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                className="mt-2 text-3xl font-bold text-gray-900 dark:text-white"
              >
                {stats?.riparazioniAperte || 0}
              </motion.h3>
            </div>
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg"
            >
              <i className="fas fa-tools text-white"></i>
            </motion.div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              {stats?.riparazioniMie || 0} mie
            </span>
            <span className="text-gray-400 mx-2">•</span>
            <Link href="/riparazioni" className="text-primary hover:underline">
              Visualizza tutto →
            </Link>
          </div>
        </motion.div>

        {/* Quality Records Today */}
        <motion.div
          variants={itemVariants}
          whileHover={cardHover}
          onClick={() => window.location.href = '/quality'}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800/40 backdrop-blur-sm cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Controlli QC Oggi
              </p>
              <motion.h3
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                className="mt-2 text-3xl font-bold text-gray-900 dark:text-white"
              >
                {stats?.qualityRecordsToday || 0}
              </motion.h3>
            </div>
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg"
            >
              <i className="fas fa-check-circle text-white"></i>
            </motion.div>
          </div>
          <div className="mt-4">
            <Link href="/quality" className="text-sm font-medium text-primary hover:underline">
              Visualizza tutto →
            </Link>
          </div>
        </motion.div>

        {/* Produzione */}
        <motion.div
          variants={itemVariants}
          whileHover={cardHover}
          onClick={() => window.location.href = '/produzione'}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800/40 backdrop-blur-sm cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Produzione Settimana
              </p>
              <motion.h3
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                className="mt-2 text-3xl font-bold text-gray-900 dark:text-white"
              >
                {stats?.produzioneSettimana || 0}
              </motion.h3>
            </div>
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg"
            >
              <i className="fas fa-industry text-white"></i>
            </motion.div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-yellow-600 dark:text-yellow-400 font-medium">
              {stats?.produzioneMese || 0} mese
            </span>
            <span className="text-gray-400 mx-2">•</span>
            <Link href="/produzione" className="text-primary hover:underline">
              Visualizza tutto →
            </Link>
          </div>
        </motion.div>

        {/* SCM Lanci Attivi */}
        <motion.div
          variants={itemVariants}
          whileHover={cardHover}
          onClick={() => window.location.href = '/scm-admin'}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800/40 backdrop-blur-sm cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Lanci SCM Attivi
              </p>
              <motion.h3
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
                className="mt-2 text-3xl font-bold text-gray-900 dark:text-white"
              >
                {stats?.scmLanciAttivi || 0}
              </motion.h3>
            </div>
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-red-500 shadow-lg"
            >
              <i className="fas fa-rocket text-white"></i>
            </motion.div>
          </div>
          <div className="mt-4">
            <Link href="/scm-admin" className="text-sm font-medium text-primary hover:underline">
              Visualizza tutto →
            </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* Quick Actions & Recent Activity */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        {/* Azioni Rapide */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800/40 backdrop-blur-sm"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <i className="fas fa-bolt mr-3 text-yellow-500"></i>
              Azioni Rapide
            </h3>
          </div>
          <div className="space-y-3">
            {hasPermission('riparazioni') && (
              <Link href="/riparazioni/create">
                <motion.div
                  whileHover={{ scale: 1.02, y: -2, backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center p-4 border border-gray-200 rounded-xl dark:border-gray-700 transition-all duration-200 shadow-md hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500"
                >
                  <motion.div
                    whileHover={{ rotate: 10 }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 shadow-md"
                  >
                    <i className="fas fa-hammer text-white"></i>
                  </motion.div>
                  <span className="ml-3 font-medium text-gray-900 dark:text-white">
                    Nuova Riparazione
                  </span>
                </motion.div>
              </Link>
            )}

            {hasPermission('produzione') && (
              <Link href="/produzione/new">
                <motion.div
                  whileHover={{ scale: 1.02, y: -2, backgroundColor: 'rgba(234, 179, 8, 0.05)' }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center p-4 border border-gray-200 rounded-xl dark:border-gray-700 transition-all duration-200 shadow-md hover:shadow-lg hover:border-yellow-300 dark:hover:border-yellow-500"
                >
                  <motion.div
                    whileHover={{ rotate: 10 }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 shadow-md"
                  >
                    <i className="fas fa-industry text-white"></i>
                  </motion.div>
                  <span className="ml-3 font-medium text-gray-900 dark:text-white">
                    Nuova Produzione
                  </span>
                </motion.div>
              </Link>
            )}

            {hasPermission('export') && (
              <Link href="/export/create">
                <motion.div
                  whileHover={{ scale: 1.02, y: -2, backgroundColor: 'rgba(168, 85, 247, 0.05)' }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center p-4 border border-gray-200 rounded-xl dark:border-gray-700 transition-all duration-200 shadow-md hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-500"
                >
                  <motion.div
                    whileHover={{ rotate: 10 }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 shadow-md"
                  >
                    <i className="fas fa-file-export text-white"></i>
                  </motion.div>
                  <span className="ml-3 font-medium text-gray-900 dark:text-white">
                    Nuovo Export/DDT
                  </span>
                </motion.div>
              </Link>
            )}

            {hasPermission('scm_admin') && (
              <Link href="/scm-admin/launches/create">
                <motion.div
                  whileHover={{ scale: 1.02, y: -2, backgroundColor: 'rgba(249, 115, 22, 0.05)' }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center p-4 border border-gray-200 rounded-xl dark:border-gray-700 transition-all duration-200 shadow-md hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-500"
                >
                  <motion.div
                    whileHover={{ rotate: 10 }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-red-500 shadow-md"
                  >
                    <i className="fas fa-rocket text-white"></i>
                  </motion.div>
                  <span className="ml-3 font-medium text-gray-900 dark:text-white">
                    Nuovo Lancio SCM
                  </span>
                </motion.div>
              </Link>
            )}

            <Link href="/tracking">
              <motion.div
                whileHover={{ scale: 1.02, y: -2, backgroundColor: 'rgba(236, 72, 153, 0.05)' }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center p-4 border border-gray-200 rounded-xl dark:border-gray-700 transition-all duration-200 shadow-md hover:shadow-lg hover:border-pink-300 dark:hover:border-pink-500"
              >
                <motion.div
                  whileHover={{ rotate: 10 }}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 shadow-md"
                >
                  <i className="fas fa-search text-white"></i>
                </motion.div>
                <span className="ml-3 font-medium text-gray-900 dark:text-white">
                  Cerca Tracking
                </span>
              </motion.div>
            </Link>
          </div>
        </motion.div>

        {/* Attività Recenti */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800/40 backdrop-blur-sm"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <i className="fas fa-history mr-3 text-gray-500 dark:text-gray-400"></i>
              Attività Recenti
            </h3>
          </div>
          <div className="space-y-4">
            {activitiesLoading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <motion.i
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="fas fa-spinner text-2xl mb-2"
                />
                <p>Caricamento attività...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <i className="far fa-calendar-times text-2xl mb-2"></i>
                <p>Nessuna attività recente</p>
              </div>
            ) : (
              <AnimatePresence>
                {activities.slice(0, 6).map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 5, backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                    className="flex items-start space-x-3 p-3 rounded-xl transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20"
                      >
                        <i className={`fas fa-${activity.icon || 'history'} text-sm text-blue-600 dark:text-blue-400`}></i>
                      </motion.div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate uppercase">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.user?.nome} • {new Date(activity.createdAt).toLocaleString('it-IT', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
          {activities.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <Link href="/logs" className="text-sm font-medium text-primary hover:underline flex items-center justify-center">
                Visualizza tutte le attività
                <i className="fas fa-arrow-right ml-2"></i>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* DDT in Bozza - Alert Card */}
      {stats?.ddtBozze && stats.ddtBozze > 0 && (
        <motion.div
          variants={itemVariants}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6"
        >
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20"
          >
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/40">
                <i className="fas fa-exclamation-triangle text-yellow-600 dark:text-yellow-400"></i>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Hai {stats.ddtBozze} DDT in bozza da completare
                </p>
              </div>
              <Link href="/export">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 dark:text-yellow-200 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/60"
                >
                  Visualizza
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
