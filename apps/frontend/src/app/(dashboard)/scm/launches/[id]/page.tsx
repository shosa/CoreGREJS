'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { showError, showSuccess } from '@/store/notifications';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface LaunchDetail {
  id: number;
  numero: string;
  laboratoryId: number;
  laboratory: {
    nome: string;
    telefono: string | null;
    email: string | null;
  };
  dataLancio: string;
  dataConsegna: string | null;
  stato: string;
  note: string | null;
  articles: Array<{
    id: number;
    codice: string;
    descrizione: string | null;
    quantita: number;
    percentuale: number;
    phases: Array<{
      id: number;
      nome: string;
      stato: string;
      dataInizio: string | null;
      dataFine: string | null;
      note: string | null;
    }>;
  }>;
}

export default function LaunchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [launch, setLaunch] = useState<LaunchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPhase, setEditingPhase] = useState<number | null>(null);
  const [phaseFormData, setPhaseFormData] = useState({
    stato: '',
    note: '',
  });

  useEffect(() => {
    if (id) {
      loadLaunch();
    }
  }, [id]);

  const loadLaunch = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/scm/launches/${id}`);
      setLaunch(response.data);
    } catch (error: any) {
      showError('Errore caricamento lancio');
      router.push('/scm/launches');
    } finally {
      setLoading(false);
    }
  };

  const handlePhaseEdit = (phase: any) => {
    setEditingPhase(phase.id);
    setPhaseFormData({
      stato: phase.stato,
      note: phase.note || '',
    });
  };

  const handlePhaseSave = async () => {
    if (!editingPhase) return;

    try {
      await api.put(`/scm/phases/${editingPhase}`, phaseFormData);
      showSuccess('Fase aggiornata');
      setEditingPhase(null);
      loadLaunch();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore aggiornamento fase');
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

  const getPhaseStatusIcon = (stato: string) => {
    switch (stato) {
      case 'NON_INIZIATA':
        return { icon: 'fa-circle', color: 'text-gray-400', bg: 'bg-gray-200 dark:bg-gray-700' };
      case 'IN_CORSO':
        return { icon: 'fa-spinner fa-spin', color: 'text-blue-600', bg: 'bg-blue-500' };
      case 'COMPLETATA':
        return { icon: 'fa-check', color: 'text-green-600', bg: 'bg-green-500' };
      case 'BLOCCATA':
        return { icon: 'fa-times', color: 'text-red-600', bg: 'bg-red-500' };
      default:
        return { icon: 'fa-circle', color: 'text-gray-400', bg: 'bg-gray-200' };
    }
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

  if (!launch) return null;

  const totalPairs = launch.articles.reduce((sum, art) => sum + art.quantita, 0);
  // Calculate average progress across all articles
  const progress = launch.articles.length > 0
    ? Math.round(launch.articles.reduce((sum, art) => sum + (art.percentuale || 0), 0) / launch.articles.length)
    : 0;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title={`Lancio ${launch.numero}`}
        subtitle={`Gestione dettaglio lancio e timeline fasi`}
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'SCM', href: '/scm' },
          { label: 'Lanci', href: '/scm/launches' },
          { label: launch.numero },
        ]}
      />

      {/* Launch Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Laboratory Info */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 shadow-lg">
              <i className="fas fa-industry text-white"></i>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Laboratorio</h3>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{launch.laboratory.nome}</p>
            </div>
          </div>
          {launch.laboratory.telefono && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <i className="fas fa-phone mr-2"></i>
              {launch.laboratory.telefono}
            </div>
          )}
          {launch.laboratory.email && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              <i className="fas fa-envelope mr-2"></i>
              {launch.laboratory.email}
            </div>
          )}
        </motion.div>

        {/* Dates */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg">
              <i className="fas fa-calendar text-white"></i>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Date</h3>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {new Date(launch.dataLancio).toLocaleDateString('it-IT')}
              </p>
            </div>
          </div>
          <div className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Consegna:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {launch.dataConsegna ? new Date(launch.dataConsegna).toLocaleDateString('it-IT') : 'N/D'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Status & Progress */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 shadow-lg">
              <i className="fas fa-chart-line text-white"></i>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Stato</h3>
              <div className="mt-1">{getStatusBadge(launch.stato)}</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Progresso</span>
              <span className="font-bold text-gray-900 dark:text-white">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-teal-500 to-cyan-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {totalPairs.toLocaleString()} paia - {launch.articles.length} articoli
            </div>
          </div>
        </motion.div>
      </div>

      {/* Articles */}
      <motion.div
        variants={itemVariants}
        className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <i className="fas fa-box text-orange-500"></i>
            Articoli ({totalPairs.toLocaleString()} paia totali)
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {launch.articles.map((article) => (
              <div
                key={article.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
                    {article.codice.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-bold text-gray-900 dark:text-white truncate">
                      {article.codice}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {article.descrizione || 'N/D'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {article.quantita.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">paia</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* TIMELINE COMPATTE CON SCROLL LATERALE */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <i className="fas fa-tasks text-blue-500"></i>
            Timeline Fasi per Articolo
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Scorrere lateralmente per vedere tutti gli articoli
          </p>
        </div>

        <div className="p-6 overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {launch.articles.map((article) => (
              <div
                key={article.id}
                className="w-80 flex-shrink-0 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Header articolo */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="font-mono text-sm font-bold text-gray-900 dark:text-white truncate">
                    {article.codice}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {article.descrizione} • {article.quantita} paia
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-gray-500">Progresso</div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {article.percentuale}%
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${article.percentuale}%` }}
                    ></div>
                  </div>
                </div>

                {/* Timeline fasi */}
                <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                  {article.phases.map((phase, index) => {
                    const isEditing = editingPhase === phase.id;
                    const phaseIcon = getPhaseStatusIcon(phase.stato);
                    const isCompleted = phase.stato === 'COMPLETATA';
                    const isInProgress = phase.stato === 'IN_CORSO';
                    const isBlocked = phase.stato === 'BLOCCATA';

                    return (
                      <div
                        key={phase.id}
                        className={`rounded-lg border p-3 cursor-pointer transition-all ${
                          isCompleted
                            ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                            : isInProgress
                            ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
                            : isBlocked
                            ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40'
                        }`}
                        onClick={() => !isEditing && handlePhaseEdit(phase)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-6 h-6 rounded-full ${phaseIcon.bg} flex items-center justify-center flex-shrink-0`}>
                            <i className={`fas ${phaseIcon.icon} text-white text-xs`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {phase.nome}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">#{index + 1}</span>
                        </div>

                        {!isEditing && (
                          <div className="text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Stato:</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  phase.stato === 'NON_INIZIATA'
                                    ? 'bg-gray-100 text-gray-700'
                                    : phase.stato === 'IN_CORSO'
                                    ? 'bg-blue-100 text-blue-700'
                                    : phase.stato === 'COMPLETATA'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {phase.stato === 'NON_INIZIATA' ? 'Da fare' : phase.stato === 'IN_CORSO' ? 'In corso' : phase.stato === 'COMPLETATA' ? 'Fatto' : 'Bloccata'}
                              </span>
                            </div>
                            {phase.dataInizio && (
                              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                                <span>Inizio:</span>
                                <span>{new Date(phase.dataInizio).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
                              </div>
                            )}
                            {phase.dataFine && (
                              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                                <span>Fine:</span>
                                <span>{new Date(phase.dataFine).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
                              </div>
                            )}
                            {phase.note && (
                              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <div className="text-gray-600 dark:text-gray-400 line-clamp-2">{phase.note}</div>
                              </div>
                            )}
                          </div>
                        )}

                        {isEditing && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                            <select
                              value={phaseFormData.stato}
                              onChange={(e) => setPhaseFormData({ ...phaseFormData, stato: e.target.value })}
                              className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value="NON_INIZIATA">Non Iniziata</option>
                              <option value="IN_CORSO">In Corso</option>
                              <option value="COMPLETATA">Completata</option>
                              <option value="BLOCCATA">Bloccata</option>
                            </select>
                            <textarea
                              value={phaseFormData.note}
                              onChange={(e) => setPhaseFormData({ ...phaseFormData, note: e.target.value })}
                              rows={2}
                              placeholder="Note..."
                              className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handlePhaseSave}
                                className="flex-1 px-2 py-1 text-xs rounded bg-green-500 text-white hover:bg-green-600"
                              >
                                <i className="fas fa-check mr-1"></i>Salva
                              </button>
                              <button
                                onClick={() => setEditingPhase(null)}
                                className="flex-1 px-2 py-1 text-xs rounded bg-gray-300 text-gray-700 hover:bg-gray-400"
                              >
                                <i className="fas fa-times mr-1"></i>Annulla
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Notes */}
      {launch.note && (
        <motion.div
          variants={itemVariants}
          className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
        >
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <i className="fas fa-file-alt text-gray-500"></i>
            Note Lancio
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{launch.note}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
