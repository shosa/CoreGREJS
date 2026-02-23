'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { showError } from '@/store/notifications';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Statistics {
  totalLaunches: number;
  totalPairs: number;
  byStatus: {
    inPreparation: { count: number; pairs: number };
    inProgress: { count: number; pairs: number };
    completed: { count: number; pairs: number };
    blocked: { count: number; pairs: number };
  };
}

interface Launch {
  id: number;
  numero: string;
  laboratory: {
    nome: string;
  };
  dataLancio: string;
  dataConsegna: string | null;
  stato: string;
  articles: Array<{ quantita: number }>;
  phases: Array<{ stato: string }>;
}

export default function ScmDashboardPage() {
  const router = useRouter();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [recentLaunches, setRecentLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, launchesRes] = await Promise.all([
        api.get('/scm/statistics'),
        api.get('/scm/launches?limit=10'),
      ]);

      setStatistics(statsRes.data);
      setRecentLaunches(launchesRes.data);
    } catch (error: any) {
      console.error('Errore caricamento dati SCM:', error);
      showError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (stato: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      IN_PREPARAZIONE: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-400', label: 'In Preparazione' },
      IN_LAVORAZIONE: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-400', label: 'In Lavorazione' },
      COMPLETATO: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-400', label: 'Completato' },
      BLOCCATO: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-400', label: 'Bloccato' },
    };

    const config = statusConfig[stato] || { bg: 'bg-gray-100', text: 'text-gray-800', label: stato };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const calculateProgress = (phases: Array<{ stato: string }>) => {
    if (phases.length === 0) return 0;
    const completed = phases.filter((p) => p.stato === 'COMPLETATA').length;
    return Math.round((completed / phases.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-orange-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title="Supply Chain Management"
        subtitle="Gestione lanci e monitoraggio subcontrattisti"
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'SCM' },
        ]}
      />

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/scm/launches/new">
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-800/10"></div>
              <div className="relative p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <i className="fas fa-plus-circle text-white text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      Nuovo Lancio
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Crea nuovo lancio
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/scm/launches">
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-800/10"></div>
              <div className="relative p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <i className="fas fa-rocket text-white text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      Lanci
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Gestione lanci
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Link>

        </div>
      </motion.div>

      {/* Statistics Cards */}
      {statistics && (
        <motion.div variants={itemVariants} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Total Launches */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 shadow-lg">
                  <i className="fas fa-rocket text-white"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Lanci Totali
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {statistics.totalLaunches}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {statistics.totalPairs.toLocaleString()} paia
                  </p>
                </div>
              </div>
            </div>

            {/* In Preparation */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-lg dark:border-blue-800 dark:bg-blue-900/20 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
                  <i className="fas fa-clipboard-list text-white"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    In Preparazione
                  </p>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                    {statistics.byStatus.inPreparation.count}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                    {statistics.byStatus.inPreparation.pairs.toLocaleString()} paia
                  </p>
                </div>
              </div>
            </div>

            {/* In Progress */}
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 shadow-lg dark:border-yellow-800 dark:bg-yellow-900/20 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 shadow-lg">
                  <i className="fas fa-cogs text-white"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    In Lavorazione
                  </p>
                  <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
                    {statistics.byStatus.inProgress.count}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                    {statistics.byStatus.inProgress.pairs.toLocaleString()} paia
                  </p>
                </div>
              </div>
            </div>

            {/* Completed */}
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-lg dark:border-green-800 dark:bg-green-900/20 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
                  <i className="fas fa-check-circle text-white"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Completati
                  </p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                    {statistics.byStatus.completed.count}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    {statistics.byStatus.completed.pairs.toLocaleString()} paia
                  </p>
                </div>
              </div>
            </div>

            {/* Blocked */}
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-lg dark:border-red-800 dark:bg-red-900/20 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-rose-500 shadow-lg">
                  <i className="fas fa-exclamation-triangle text-white"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Bloccati
                  </p>
                  <p className="text-2xl font-bold text-red-800 dark:text-red-300">
                    {statistics.byStatus.blocked.count}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                    {statistics.byStatus.blocked.pairs.toLocaleString()} paia
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Widget: Stato Lanci */}
      {statistics && statistics.totalLaunches > 0 && (() => {
        const stati = [
          { label: 'In Preparazione', count: statistics.byStatus.inPreparation.count, pairs: statistics.byStatus.inPreparation.pairs },
          { label: 'In Lavorazione', count: statistics.byStatus.inProgress.count, pairs: statistics.byStatus.inProgress.pairs },
          { label: 'Completati', count: statistics.byStatus.completed.count, pairs: statistics.byStatus.completed.pairs },
          { label: 'Bloccati', count: statistics.byStatus.blocked.count, pairs: statistics.byStatus.blocked.pairs },
        ];
        const maxCount = stati.reduce((m, s) => Math.max(m, s.count), 1);
        // Lanci con scadenza nei prossimi 7 giorni
        const oggi = new Date();
        const tra7gg = new Date(oggi.getTime() + 7 * 24 * 60 * 60 * 1000);
        const inScadenza = recentLaunches.filter(l => {
          if (!l.dataConsegna) return false;
          const d = new Date(l.dataConsegna);
          return d >= oggi && d <= tra7gg;
        });
        return (
          <motion.div variants={itemVariants} className="mb-6">
            <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 p-6 shadow-xl text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_60%)]" />
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Distribuzione stati */}
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Pipeline Lanci</p>
                  <h3 className="text-2xl font-extrabold mb-4">Distribuzione Stati</h3>
                  <div className="space-y-2.5">
                    {stati.map(s => (
                      <div key={s.label}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-white/80 text-sm font-medium">{s.label}</span>
                          <span className="text-white font-bold text-sm">{s.count} <span className="text-white/60 text-xs font-normal">({s.pairs.toLocaleString()} paia)</span></span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2.5">
                          <div className="bg-white h-2.5 rounded-full" style={{ width: `${Math.round((s.count / maxCount) * 100)}%`, opacity: s.count > 0 ? 1 : 0.2 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Scadenze imminenti */}
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Prossimi 7 giorni</p>
                  <h3 className="text-2xl font-extrabold mb-4">Scadenze Imminenti</h3>
                  {inScadenza.length > 0 ? (
                    <div className="space-y-2">
                      {inScadenza.slice(0, 4).map(l => {
                        const daysLeft = Math.ceil((new Date(l.dataConsegna!).getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <div key={l.id} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                            <div>
                              <span className="text-white font-bold text-sm">{l.numero}</span>
                              <span className="text-white/60 text-xs ml-2">{l.laboratory.nome}</span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${daysLeft <= 2 ? 'bg-red-200 text-red-800' : 'bg-white/20 text-white'}`}>
                              {daysLeft === 0 ? 'Oggi' : daysLeft === 1 ? 'Domani' : `${daysLeft}gg`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
                      <i className="fas fa-check-circle text-white/60 text-2xl"></i>
                      <p className="text-white/70 text-sm">Nessuna scadenza nei prossimi 7 giorni</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* Recent Launches */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/10 dark:to-slate-800/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Lanci Recenti
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ultimi 10 lanci creati</p>
            </div>
            <Link
              href="/scm/launches"
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              Vedi tutti <i className="fas fa-arrow-right ml-1"></i>
            </Link>
          </div>
        </div>

        {recentLaunches.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <i className="fas fa-inbox text-gray-300 text-5xl mb-4"></i>
            <p className="font-medium">Nessun lancio trovato</p>
            <p className="text-sm mt-1">Crea il primo lancio per iniziare</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Numero
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Laboratorio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Data Lancio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Consegna
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Paia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Progresso
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                  {recentLaunches.map((launch, index) => {
                    const totalPairs = launch.articles.reduce((sum, art) => sum + art.quantita, 0);
                    // Calculate average progress across all articles
                    const progress = launch.articles.length > 0
                      ? Math.round(launch.articles.reduce((sum, art) => sum + (art.percentuale || 0), 0) / launch.articles.length)
                      : 0;

                    return (
                      <motion.tr
                        key={launch.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {launch.numero}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {launch.laboratory.nome}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(launch.dataLancio).toLocaleDateString('it-IT')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {launch.dataConsegna
                              ? new Date(launch.dataConsegna).toLocaleDateString('it-IT')
                              : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {totalPairs.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(launch.stato)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-24">
                              <div
                                className="bg-gradient-to-r from-orange-500 to-amber-600 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 font-medium">{progress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link
                            href={`/scm/launches/${launch.id}`}
                            className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                            title="Dettagli"
                          >
                            <i className="fas fa-eye"></i>
                          </Link>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
