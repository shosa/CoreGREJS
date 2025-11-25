"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { exportApi } from "@/lib/api";
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

interface ExportStats {
  totalDocuments: number;
  openDocuments: number;
  closedDocuments: number;
}

export default function ExportPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ExportStats>({
    totalDocuments: 0,
    openDocuments: 0,
    closedDocuments: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const allDocs = await exportApi.getDocuments();
      const openDocs = await exportApi.getDocuments({ stato: "Aperto" });
      const closedDocs = await exportApi.getDocuments({ stato: "Chiuso" });

      setStats({
        totalDocuments: allDocs.length,
        openDocuments: openDocs.length,
        closedDocuments: closedDocs.length,
      });
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
          className="h-12 w-12 rounded-full border-4 border-solid border-blue-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title="Export / DDT"
        subtitle="Gestione documenti di trasporto e terzisti"
      />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Export" },
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
              <i className="fas fa-file-alt text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                DDT Totali
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalDocuments.toLocaleString()}
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
              <i className="fas fa-folder-open text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                DDT Aperti
              </p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                {stats.openDocuments.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800/20 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 shadow-lg">
              <i className="fas fa-archive text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-400">
                DDT Chiusi
              </p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-300">
                {stats.closedDocuments.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* 2. Nuovo DDT */}
        <motion.div variants={itemVariants}>
          <Link href="/export/create">
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-800/10"></div>
              <div className="relative p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-plus-circle text-white text-2xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Nuovo DDT
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Crea un nuovo documento di trasporto con procedura guidata (3
                  step)
                </p>
                <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                  Apri <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* 3. Archivio DDT */}
        <motion.div variants={itemVariants}>
          <Link href="/export/archive">
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/10 dark:to-slate-800/10"></div>
              <div className="relative p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-gray-500 to-slate-600 shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-archive text-white text-2xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Elenco DDT
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Visualizza tutti i DDT con ricerca e filtri avanzati
                </p>
                <div className="flex items-center text-gray-600 dark:text-gray-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                  Apri <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* 4 + 5 → colonna verticale più piccola */}
        <div className="flex flex-col gap-6 scale-95">
          {/* 4. Terzisti */}
          <motion.div variants={itemVariants}>
            <Link href="/export/terzisti">
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-800/10"></div>
                <div className="relative p-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                    <i className="fas fa-truck text-white text-2xl"></i>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    Gestione Terzisti
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Gestisci fornitori, indirizzi e autorizzazioni
                  </p>
                  <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                    Apri <i className="fas fa-arrow-right ml-2"></i>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* 5. Articoli Master */}
          <motion.div variants={itemVariants}>
            <Link href="/export/articles">
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-800/10"></div>
                <div className="relative p-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                    <i className="fas fa-box text-white text-2xl"></i>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    Gestione Anagrafiche
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Catalogo articoli con voci doganali, UM e prezzi
                  </p>
                  <div className="flex items-center text-orange-600 dark:text-orange-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
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
