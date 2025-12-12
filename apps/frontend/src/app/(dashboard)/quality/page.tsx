"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { qualityApi } from "@/lib/api";
import { showError } from "@/store/notifications";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

type DashboardStats = {
  recordsToday: number;
  exceptionsThisMonth: number;
  recordsThisWeek: number;
  activeDepartments: number;
};

type QualityRecord = {
  id: number;
  numeroCartellino: string;
  reparto: string | null;
  dataControllo: string;
  operatore: string;
  tipoCq: string;
  haEccezioni: boolean;
  articolo: string;
};

export default function QualityDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    recordsToday: 0,
    exceptionsThisMonth: 0,
    recordsThisWeek: 0,
    activeDepartments: 0,
  });
  const [recentRecords, setRecentRecords] = useState<QualityRecord[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, recordsData] = await Promise.all([
        qualityApi.getDashboardStats(),
        qualityApi.getRecords({ limit: 5 }),
      ]);
      setStats(statsData);
      setRecentRecords(recordsData.slice(0, 5));
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
          className="h-12 w-12 rounded-full border-4 border-solid border-primary border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title="Controllo Qualità"
        subtitle="Sistema di gestione controlli qualità Hermes"
      />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Controllo Qualità" },
        ]}
      />

      {/* 3 Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
              <i className="fas fa-check-circle text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Controlli Oggi
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.recordsToday.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-lg dark:border-red-800 dark:bg-red-900/20 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-rose-500 shadow-lg">
              <i className="fas fa-exclamation-triangle text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Eccezioni Mese
              </p>
              <p className="text-2xl font-bold text-red-800 dark:text-red-300">
                {stats.exceptionsThisMonth.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-lg dark:border-green-800 dark:bg-green-900/20 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
              <i className="fas fa-calendar-week text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Controlli Settimana
              </p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                {stats.recordsThisWeek.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* 1. Ultimi Controlli */}
        <motion.div variants={itemVariants}>
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-800/10"></div>
            <div className="relative p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg">
                  <i className="fas fa-list text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Ultimi Controlli
                </h3>
              </div>

              {/* Widget Ultimi 5 Controlli */}
              {recentRecords.length > 0 ? (
                <div className="space-y-2">
                  {recentRecords.map((record, index) => (
                    <div
                      key={record.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex-shrink-0 shadow-sm">
                        <span className="text-white text-xs font-bold">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs font-bold text-gray-900 dark:text-white truncate">
                            {record.numeroCartellino}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${
                              record.haEccezioni
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            }`}
                          >
                            {record.haEccezioni ? "KO" : "OK"}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
                          {record.operatore} • {record.reparto || "N/D"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <i className="fas fa-inbox text-3xl mb-2"></i>
                  <p className="text-sm">Nessun controllo presente</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* 2. Consulto Record */}
        <motion.div variants={itemVariants}>
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/10 dark:to-slate-800/10"></div>
            <div className="relative p-8">
              <Link href="/quality/records" className="block mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-gray-500 to-slate-600 shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-clipboard-list text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Consulto Record
                </h3>
              </Link>

              {/* Widget Ultimo Record */}
              {recentRecords.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                    Record Recente
                  </h4>
                  <Link
                    href="/quality/records"
                    className="block group/doc"
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/30 dark:hover:bg-gray-700/50 transition-colors border border-gray-200 dark:border-gray-700">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                            {recentRecords[0].numeroCartellino}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${
                              recentRecords[0].haEccezioni
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            }`}
                          >
                            {recentRecords[0].haEccezioni ? "Eccezioni" : "OK"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {recentRecords[0].articolo} - {recentRecords[0].operatore}
                        </p>
                      </div>
                      <i className="fas fa-arrow-right text-sm text-gray-400 group-hover/doc:text-gray-600 dark:group-hover/doc:text-gray-300 transition-colors"></i>
                    </div>
                  </Link>
                </div>
              )}

              <Link href="/quality/records" className="block mt-4">
                <div className="flex items-center text-gray-600 dark:text-gray-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                  Apri archivio completo <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* 3 + 4 + 5 → colonna verticale più piccola */}
        <div className="flex flex-col gap-6 scale-95">
          {/* 3. Gestione Reparti */}
          <motion.div variants={itemVariants}>
            <Link href="/quality/reparti">
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
                        {stats.activeDepartments} reparti attivi
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

          {/* 4. Tipi Difetti */}
          <motion.div variants={itemVariants}>
            <Link href="/quality/difetti">
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-800/10"></div>
                <div className="relative p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      <i className="fas fa-exclamation-circle text-white text-xl"></i>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        Tipi Difetti
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Gestisci tipologie difetti
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

          {/* 5. Reportistica */}
          <motion.div variants={itemVariants}>
            <Link href="/quality/reports">
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/10 dark:to-cyan-800/10"></div>
                <div className="relative p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      <i className="fas fa-chart-bar text-white text-xl"></i>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        Reportistica
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Analisi e report PDF
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-teal-600 dark:text-teal-400 font-medium text-sm group-hover:translate-x-2 transition-transform duration-300">
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
