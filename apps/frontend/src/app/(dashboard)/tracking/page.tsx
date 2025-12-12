'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { trackingApi } from '@/lib/api';
import { showError } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface TrackingStats {
  totalLinks: number;
  lotsWithoutDdt: number;
  ordersWithoutDate: number;
  articlesWithoutSku: number;
}

export default function TrackingPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TrackingStats>({
    totalLinks: 0,
    lotsWithoutDdt: 0,
    ordersWithoutDate: 0,
    articlesWithoutSku: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await trackingApi.getStats();
      setStats(data);
    } catch (error) {
      showError('Errore nel caricamento delle statistiche');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-purple-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title="Tracking Lotti e Cartellini"
        subtitle="Sistema di tracciabilita materiali e collegamenti"
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Tracking' },
        ]}
      />

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          variants={itemVariants}
          className="group rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm transition-all hover:shadow-lg dark:border-gray-700 dark:from-blue-900/20 dark:to-indigo-900/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Collegamenti Totali</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalLinks.toLocaleString()}
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg transition-transform group-hover:scale-110">
              <i className="fas fa-link text-xl text-white"></i>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="group rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 p-6 shadow-sm transition-all hover:shadow-lg dark:border-yellow-800 dark:from-yellow-900/20 dark:to-orange-900/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Lotti senza DDT</p>
              <p className="mt-2 text-3xl font-bold text-yellow-800 dark:text-yellow-300">
                {stats.lotsWithoutDdt.toLocaleString()}
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg transition-transform group-hover:scale-110">
              <i className="fas fa-file-invoice text-xl text-white"></i>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="group rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 p-6 shadow-sm transition-all hover:shadow-lg dark:border-orange-800 dark:from-orange-900/20 dark:to-red-900/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Ordini senza Date</p>
              <p className="mt-2 text-3xl font-bold text-orange-800 dark:text-orange-300">
                {stats.ordersWithoutDate.toLocaleString()}
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg transition-transform group-hover:scale-110">
              <i className="fas fa-calendar-times text-xl text-white"></i>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="group rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-pink-50 p-6 shadow-sm transition-all hover:shadow-lg dark:border-red-800 dark:from-red-900/20 dark:to-pink-900/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Articoli senza SKU</p>
              <p className="mt-2 text-3xl font-bold text-red-800 dark:text-red-300">
                {stats.articlesWithoutSku.toLocaleString()}
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 shadow-lg transition-transform group-hover:scale-110">
              <i className="fas fa-barcode text-xl text-white"></i>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation Cards - Layout: 2 Large Side-by-Side + 3 Small Stacked */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 1. Ricerca Multipla - LARGE CARD */}
        <motion.div variants={itemVariants}>
          <Link href="/tracking/multi-search">
            <div className="group relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 dark:border-gray-700 dark:bg-gray-800">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-indigo-50 opacity-50 dark:from-purple-900/20 dark:to-indigo-900/20"></div>
              <div className="relative">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg transition-transform group-hover:scale-110">
                  <i className="fas fa-search text-2xl text-white"></i>
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                  Ricerca Multipla
                </h3>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  Cerca cartellini per Commessa, Articolo, Cliente e altri 7 filtri avanzati
                </p>
                <div className="flex items-center font-medium text-purple-600 transition-transform group-hover:translate-x-2 dark:text-purple-400">
                  Apri <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* 2. Inserimento Manuale - LARGE CARD */}
        <motion.div variants={itemVariants}>
          <Link href="/tracking/order-search">
            <div className="group relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 dark:border-gray-700 dark:bg-gray-800">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-50 dark:from-blue-900/20 dark:to-cyan-900/20"></div>
              <div className="relative">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-600 shadow-lg transition-transform group-hover:scale-110">
                  <i className="fas fa-keyboard text-2xl text-white"></i>
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                  Inserimento Manuale
                </h3>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  Inserisci cartellini manualmente con verifica e validazione real-time
                </p>
                <div className="flex items-center font-medium text-blue-600 transition-transform group-hover:translate-x-2 dark:text-blue-400">
                  Apri <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Right Column: 3 Small Cards Stacked */}
        <div className="grid grid-cols-1 gap-6 md:col-span-2 lg:col-span-1">
          {/* 3. Albero Collegamenti - SMALL CARD */}
          <motion.div variants={itemVariants}>
            <Link href="/tracking/tree-view">
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 dark:border-gray-700 dark:bg-gray-800">
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-50 dark:from-green-900/20 dark:to-emerald-900/20"></div>
                <div className="relative">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg transition-transform group-hover:scale-110">
                    <i className="fas fa-sitemap text-lg text-white"></i>
                  </div>
                  <h3 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
                    Albero Collegamenti
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Visualizza e modifica collegamenti
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* 4. Dettagli Mancanti - SMALL CARD */}
          <motion.div variants={itemVariants}>
            <Link href="/tracking/lot-detail">
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 dark:border-gray-700 dark:bg-gray-800">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-orange-50 opacity-50 dark:from-yellow-900/20 dark:to-orange-900/20"></div>
                <div className="relative">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg transition-transform group-hover:scale-110">
                    <i className="fas fa-edit text-lg text-white"></i>
                  </div>
                  <h3 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
                    Dettagli Mancanti
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Compila DDT, date e SKU
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* 5. Report e Stampe - SMALL CARD */}
          <motion.div variants={itemVariants}>
            <Link href="/tracking/reports">
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 dark:border-gray-700 dark:bg-gray-800">
                <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-pink-50 opacity-50 dark:from-red-900/20 dark:to-pink-900/20"></div>
                <div className="relative">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-red-500 to-pink-600 shadow-lg transition-transform group-hover:scale-110">
                    <i className="fas fa-file-pdf text-lg text-white"></i>
                  </div>
                  <h3 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
                    Report e Stampe
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Genera PDF e Excel
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
