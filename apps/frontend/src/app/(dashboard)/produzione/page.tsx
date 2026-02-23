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

type RecentRecord = {
  id: number;
  productionDate: string;
  total: number;
  creator: {
    id: number;
    nome: string;
    userName: string;
  } | null;
  createdAt: string;
};

export default function ProduzioneDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    registrazioniOggi: 0,
    repartiAttivi: 0,
    registrazioniMese: 0,
  });
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentRecords();
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

  const fetchRecentRecords = async () => {
    try {
      const data = await produzioneApi.getRecentRecords(5);
      setRecentRecords(data);
    } catch (error) {
      showError("Errore nel caricamento delle registrazioni recenti");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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

      {/* Widget: Produzione Recente */}
      {recentRecords.length > 0 && (() => {
        const grouped: Record<string, number> = {};
        recentRecords.forEach(r => {
          const day = new Date(r.productionDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
          grouped[day] = (grouped[day] || 0) + r.total;
        });
        const days = Object.entries(grouped).slice(-7);
        const maxVal = days.reduce((m, [, v]) => Math.max(m, v), 1);
        const totalPezzi = days.reduce((s, [, v]) => s + v, 0);
        const media = Math.round(totalPezzi / days.length);
        const picco = maxVal;
        return (
          <motion.div variants={itemVariants} className="mb-8">
            <div className="rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 p-6 shadow-xl text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_60%)]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Produzione Recente</p>
                    <h3 className="text-2xl font-extrabold">Pezzi per Giorno</h3>
                  </div>
                  <div className="flex gap-6 text-right">
                    <div>
                      <p className="text-white/60 text-xs uppercase tracking-wide">Media</p>
                      <p className="text-xl font-bold">{media.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-xs uppercase tracking-wide">Picco</p>
                      <p className="text-xl font-bold">{picco.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-end gap-2 h-24">
                  {days.map(([day, val]) => {
                    const pct = Math.round((val / maxVal) * 100);
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                          <div
                            className="w-full bg-white rounded-t-md transition-all duration-500"
                            style={{ height: `${pct}%`, minHeight: '4px', opacity: 0.9 }}
                          />
                        </div>
                        <span className="text-white/70 text-[10px] font-medium">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })()}

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
            href="/produzione/csv"
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-50 dark:from-orange-900/10 dark:to-orange-800/10"></div>
            <div className="relative p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <i className="fas fa-file-csv text-white text-xl"></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    Report da CSV
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                   Genera report di produzione da file CSV  
                  </p>
                </div>
              </div>
              <div className="flex items-center text-orange-600 dark:text-orange-400 font-medium text-sm group-hover:translate-x-2 transition-transform duration-300">
                Apri <i className="fas fa-arrow-right ml-2"></i>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Riga successiva: Registrazioni Recenti */}
        <motion.div
          variants={itemVariants}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm lg:col-span-2"
        >
          <div className="border-b border-gray-100 px-6 py-4 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-200">
            Registrazioni Recenti
          </div>
          <div className="px-6 py-6">
            {recentRecords.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Nessuna registrazione recente.
              </div>
            ) : (
              <div className="space-y-3">
                {recentRecords.map((record) => (
                  <Link
                    key={record.id}
                    href={`/produzione/${new Date(record.productionDate).toISOString().split('T')[0]}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:border-yellow-500 hover:bg-yellow-50 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:border-yellow-600 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md">
                        <i className="fas fa-calendar-alt"></i>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {formatDate(record.productionDate)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {record.creator ? `Creato da ${record.creator.nome}` : 'Creatore sconosciuto'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {record.total.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Pezzi totali
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
