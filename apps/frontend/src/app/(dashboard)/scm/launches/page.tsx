'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { showError, showSuccess } from '@/store/notifications';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Launch {
  id: number;
  numero: string;
  laboratory: { nome: string };
  dataLancio: string;
  dataConsegna: string | null;
  stato: string;
  articles: Array<{ quantita: number }>;
  phases: Array<{ stato: string }>;
}

export default function LaunchesPage() {
  const router = useRouter();
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStato, setFilterStato] = useState<string>('');

  useEffect(() => {
    loadLaunches();
  }, [filterStato]);

  const loadLaunches = async () => {
    try {
      setLoading(true);
      const params = filterStato ? `?stato=${filterStato}` : '';
      const response = await api.get(`/scm/launches${params}`);
      setLaunches(response.data);
    } catch (error: any) {
      showError('Errore caricamento lanci');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo lancio?')) return;
    try {
      await api.delete(`/scm/launches/${id}`);
      showSuccess('Lancio eliminato');
      loadLaunches();
    } catch (error: any) {
      showError('Errore eliminazione');
    }
  };

  const getStatusBadge = (stato: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      IN_PREPARAZIONE: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-400', label: 'In Preparazione' },
      IN_LAVORAZIONE: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-400', label: 'In Lavorazione' },
      COMPLETATO: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-400', label: 'Completato' },
      BLOCCATO: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-400', label: 'Bloccato' },
    };
    const c = config[stato] || { bg: 'bg-gray-100', text: 'text-gray-800', label: stato };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
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
          className="h-12 w-12 rounded-full border-4 border-solid border-blue-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader title="Gestione Lanci" subtitle="Gestisci i lanci di produzione" />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'SCM', href: '/scm' },
          { label: 'Lanci' },
        ]}
      />

      {/* Toolbar */}
      <motion.div
        variants={itemVariants}
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
      >
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStato('')}
              className={`px-4 py-2 rounded-lg transition-colors ${!filterStato ? 'bg-cyan-500 text-white' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600'}`}
            >
              Tutti
            </button>
            <button
              onClick={() => setFilterStato('IN_PREPARAZIONE')}
              className={`px-4 py-2 rounded-lg transition-colors ${filterStato === 'IN_PREPARAZIONE' ? 'bg-cyan-500 text-white' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600'}`}
            >
              In Preparazione
            </button>
            <button
              onClick={() => setFilterStato('IN_LAVORAZIONE')}
              className={`px-4 py-2 rounded-lg transition-colors ${filterStato === 'IN_LAVORAZIONE' ? 'bg-cyan-500 text-white' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600'}`}
            >
              In Lavorazione
            </button>
            <button
              onClick={() => setFilterStato('COMPLETATO')}
              className={`px-4 py-2 rounded-lg transition-colors ${filterStato === 'COMPLETATO' ? 'bg-cyan-500 text-white' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600'}`}
            >
              Completati
            </button>
            <button
              onClick={() => setFilterStato('BLOCCATO')}
              className={`px-4 py-2 rounded-lg transition-colors ${filterStato === 'BLOCCATO' ? 'bg-cyan-500 text-white' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600'}`}
            >
              Bloccati
            </button>
          </div>
          <Link
            href="/scm/launches/new"
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            <i className="fas fa-plus mr-2"></i> Nuovo Lancio
          </Link>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden"
      >
        {launches.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <i className="fas fa-inbox text-gray-300 text-5xl mb-4"></i>
            <p className="font-medium">Nessun lancio trovato</p>
            <p className="text-sm mt-1">Prova a modificare i criteri di ricerca</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
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
                  {launches.map((launch, index) => {
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
                        className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
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
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(launch.stato)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-24">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500">{progress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/scm/launches/${launch.id}`}
                              className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                              title="Dettagli"
                            >
                              <i className="fas fa-eye"></i>
                            </Link>
                            <button
                              onClick={() => handleDelete(launch.id)}
                              className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
                              title="Elimina"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
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
