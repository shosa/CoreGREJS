"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { produzioneApi } from "@/lib/api";
import { showError } from "@/store/notifications";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

type Stats = {
  registrazioniOggi?: number;
  repartiAttivi?: number;
  registrazioniMese?: number;
};

export default function ProduzioneDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    registrazioniOggi: 0,
    repartiAttivi: 0,
    registrazioniMese: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // TODO: Implementare API per statistiche produzione
      // const data = await produzioneApi.getStats();
      // setStats(data);

      // Mock data temporaneo
      setStats({
        registrazioniOggi: 0,
        repartiAttivi: 0,
        registrazioniMese: 0,
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
          className="h-12 w-12 rounded-full border-4 border-solid border-yellow-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader title="Produzione" subtitle="Registrazione produzioni giornaliere dei reparti" />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Produzione" },
        ]}
      />

      {/* 3 Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg">
              <i className="fas fa-calendar-day text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Registrazioni Oggi
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.registrazioniOggi?.toLocaleString() || 0}
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
              <i className="fas fa-industry text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Reparti Attivi
              </p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                {stats.repartiAttivi?.toLocaleString() || 0}
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
              <i className="fas fa-calendar-alt text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-400">
                Registrazioni Mese
              </p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-300">
                {stats.registrazioniMese?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation + Support layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonna 1-2: Cards principali */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-2">
          {/* Nuova Produzione */}
          <motion.div variants={itemVariants}>
            <div className="group relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg transition-all duration-300 hover:shadow-xl dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-orange-50 opacity-60 dark:from-yellow-900/10 dark:to-orange-800/10" />
              <div className="relative p-8">
                <Link href="/produzione/new" className="mb-4 block">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                    <i className="fas fa-plus-circle text-xl" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Nuova Produzione
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Inserisci una nuova produzione giornaliera.
                  </p>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Calendario */}
          <motion.div variants={itemVariants}>
            <div className="group relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg transition-all duration-300 hover:shadow-xl dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-60 dark:from-blue-900/10 dark:to-indigo-800/10" />
              <div className="relative p-8">
                <Link href="/produzione/calendario" className="mb-4 block">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                    <i className="fas fa-calendar-alt text-xl" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Calendario
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Visualizza il calendario della produzione.
                  </p>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Colonna 3: Cards supporto */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col gap-4 lg:row-span-2"
        >
          <Link
            href="/produzione/statistics"
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-800/10"></div>
            <div className="relative p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <i className="fas fa-chart-line text-white text-xl"></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    Statistiche
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Report e analisi produzione
                  </p>
                </div>
              </div>
              <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium text-sm group-hover:translate-x-2 transition-transform duration-300">
                Apri <i className="fas fa-arrow-right ml-2"></i>
              </div>
            </div>
          </Link>

          <Link
            href="/produzione/config"
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-800/10"></div>
            <div className="relative p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <i className="fas fa-cog text-white text-xl"></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    Configurazione
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Impostazioni reparti e fasi
                  </p>
                </div>
              </div>
              <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium text-sm group-hover:translate-x-2 transition-transform duration-300">
                Apri <i className="fas fa-arrow-right ml-2"></i>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Riga successiva: Elenco Commesse */}
        <motion.div
          variants={itemVariants}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm lg:col-span-2"
        >
          <div className="border-b border-gray-100 px-6 py-4 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-200">
            Registrazioni Recenti
          </div>
          <div className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
            Nessuna registrazione recente.
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
