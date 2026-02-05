"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { analiticheApi } from "@/lib/api";
import { showError } from "@/store/notifications";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface AnaliticheStats {
  totalRecords: number;
  totalImports: number;
  repartiCount: number;
  recordsByTipo: Array<{ tipoDocumento: string | null; _count: { id: number } }>;
}

interface RecentImport {
  id: number;
  fileName: string;
  recordsCount: number;
  stato: string;
  createdAt: string;
}

export default function AnalitichePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnaliticheStats>({
    totalRecords: 0,
    totalImports: 0,
    repartiCount: 0,
    recordsByTipo: [],
  });
  const [recentImports, setRecentImports] = useState<RecentImport[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [statsData, importsData] = await Promise.all([
        analiticheApi.getStats(),
        analiticheApi.getImports(1, 5),
      ]);

      setStats(statsData);
      setRecentImports(importsData.data || []);
    } catch (error) {
      showError("Errore nel caricamento delle statistiche");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-solid border-emerald-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title="Analitiche"
        subtitle="Gestione dati reportistici e statistici di produzione"
      />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Analitiche" },
        ]}
      />

      {/* 3 Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg">
              <i className="fas fa-database text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Record Totali
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalRecords.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-lg dark:border-blue-800 dark:bg-blue-900/20 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg">
              <i className="fas fa-file-import text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                Import Effettuati
              </p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                {stats.totalImports.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-purple-200 bg-purple-50 p-6 shadow-lg dark:border-purple-700 dark:bg-purple-800/20 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
              <i className="fas fa-building text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-700 dark:text-purple-400">
                Reparti Attivi
              </p>
              <p className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                {stats.repartiCount.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* 1. Reportistica - Card principale */}
        <motion.div variants={itemVariants}>
          <div className="group relative overflow-hidden rounded-2xl border-2 border-blue-300 bg-white shadow-xl hover:shadow-2xl transition-all duration-300 dark:border-blue-600 dark:bg-gray-800/40 backdrop-blur-sm h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20"></div>
            <div className="relative p-8">
              <Link href="/analitiche/reports" className="block mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-chart-bar text-white text-2xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Reportistica
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Genera report PDF ed Excel per analisi costi e reparti
                </p>
              </Link>

              {/* Report types preview */}
              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                <div className="flex gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium">
                    <i className="fas fa-file-pdf"></i> PDF
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium">
                    <i className="fas fa-file-excel"></i> Excel
                  </span>
                </div>
              </div>

              <Link href="/analitiche/reports" className="block mt-4">
                <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                  Genera report <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* 2. Elenco Record */}
        <motion.div variants={itemVariants}>
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/10 dark:to-slate-800/10"></div>
            <div className="relative p-8">
              <Link href="/analitiche/records" className="block mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-gray-500 to-slate-600 shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-list text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Elenco Record
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Visualizza e gestisci tutti i dati importati
                </p>
              </Link>

              {/* Widget ultimo import */}
              {recentImports.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                    Ultimo Import
                  </h4>
                  <Link
                    href={`/analitiche/imports`}
                    className="block group/doc"
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/30 dark:hover:bg-gray-700/50 transition-colors border border-gray-200 dark:border-gray-700">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-bold text-gray-900 dark:text-white truncate">
                            {recentImports[0].fileName}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${
                              recentImports[0].stato === "completato"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : recentImports[0].stato === "errore"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }`}
                          >
                            {recentImports[0].stato}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {recentImports[0].recordsCount} record importati
                        </p>
                      </div>
                      <i className="fas fa-arrow-right text-sm text-gray-400 group-hover/doc:text-gray-600 dark:group-hover/doc:text-gray-300 transition-colors"></i>
                    </div>
                  </Link>
                </div>
              )}

              <Link href="/analitiche/records" className="block mt-4">
                <div className="flex items-center text-gray-600 dark:text-gray-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                  Apri elenco completo <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* 3. Carica Dati Excel - Card secondaria */}
        <motion.div variants={itemVariants}>
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-800/10"></div>
            <div className="relative p-8">
              <Link href="/analitiche/upload" className="block mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-file-upload text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Carica Dati Excel
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Importa dati dall'ERP tramite file Excel
                </p>
              </Link>

              <Link href="/analitiche/upload" className="block mt-4">
                <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                  Vai all'upload <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Colonna con card più piccole */}
        <div className="flex flex-col gap-6 scale-95">
          {/* 4. Reparti */}
          <motion.div variants={itemVariants}>
            <Link href="/analitiche/reparti">
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-800/10"></div>
                <div className="relative p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      <i className="fas fa-building text-white text-xl"></i>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        Gestione Reparti
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Configura i reparti per l'analisi costi
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium text-sm group-hover:translate-x-2 transition-transform duration-300">
                    Apri <i className="fas fa-arrow-right ml-2"></i>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* 5. Storico Import */}
          <motion.div variants={itemVariants}>
            <Link href="/analitiche/imports">
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-800/10"></div>
                <div className="relative p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      <i className="fas fa-history text-white text-xl"></i>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        Storico Import
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Cronologia delle importazioni Excel
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-orange-600 dark:text-orange-400 font-medium text-sm group-hover:translate-x-2 transition-transform duration-300">
                    Apri <i className="fas fa-arrow-right ml-2"></i>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
