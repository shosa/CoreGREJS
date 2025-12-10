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

      {/* 4 Stats Cards - Legacy Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
              <i className="fas fa-link text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Collegamenti Totali</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalLinks.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 shadow-lg dark:border-yellow-800 dark:bg-yellow-900/20 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg">
              <i className="fas fa-file-invoice text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Lotti senza DDT</p>
              <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
                {stats.lotsWithoutDdt.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-lg dark:border-orange-800 dark:bg-orange-900/20 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
              <i className="fas fa-calendar-times text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Ordini senza Date</p>
              <p className="text-2xl font-bold text-orange-800 dark:text-orange-300">
                {stats.ordersWithoutDate.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-lg dark:border-red-800 dark:bg-red-900/20 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-pink-500 shadow-lg">
              <i className="fas fa-barcode text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Articoli senza SKU</p>
              <p className="text-2xl font-bold text-red-800 dark:text-red-300">
                {stats.articlesWithoutSku.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 5 Navigation Cards - Legacy Structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* 1. Ricerca Multipla (Multisearch) */}
        <motion.div variants={itemVariants}>
          <Link href="/tracking/multi-search">
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-800/10"></div>
              <div className="relative p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-search text-white text-2xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Ricerca Multipla
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Cerca cartellini per Commessa, Articolo, Cliente e altri 7 filtri
                </p>
                <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                  Apri <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* 2. Inserimento Manuale (Ordersearch) */}
        <motion.div variants={itemVariants}>
          <Link href="/tracking/order-search">
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-800/10"></div>
              <div className="relative p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-600 shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-keyboard text-white text-2xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Inserimento Manuale
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Inserisci cartellini manualmente con verifica real-time
                </p>
                <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                  Apri <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* 3. Albero Collegamenti (TreeView) */}
        <motion.div variants={itemVariants}>
          <Link href="/tracking/tree-view">
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-800/10"></div>
              <div className="relative p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-sitemap text-white text-2xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Albero Collegamenti
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Visualizza e modifica collegamenti Cartellino - Tipo - Lotti
                </p>
                <div className="flex items-center text-green-600 dark:text-green-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                  Apri <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* 4. Dettagli Lotti (LotDetail - 3 tabs) */}
        <motion.div variants={itemVariants}>
          <Link href="/tracking/lot-detail">
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-800/10"></div>
              <div className="relative p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-edit text-white text-2xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Dettagli Mancanti
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Compila DDT, date ordini e SKU mancanti (3 tab)
                </p>
                <div className="flex items-center text-yellow-600 dark:text-yellow-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                  Apri <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* 5. Report e Stampe (PackingList + MakeFiches) */}
        <motion.div variants={itemVariants}>
          <Link href="/tracking/reports">
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/10 dark:to-pink-800/10"></div>
              <div className="relative p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-red-500 to-pink-600 shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-file-pdf text-white text-2xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Report e Stampe
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Genera PDF/Excel per lotti, cartellini e fiches dettagliate
                </p>
                <div className="flex items-center text-red-600 dark:text-red-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                  Apri <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
