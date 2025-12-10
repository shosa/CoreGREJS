'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { jobsApi } from '@/lib/api';
import { showError } from '@/store/notifications';

type JobStatus = 'queued' | 'running' | 'done' | 'failed';

interface JobItem {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  outputName?: string | null;
  outputMime?: string | null;
  outputSize?: number | null;
  errorMessage?: string | null;
  createdAt: string;
  finishedAt?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SpoolModal({ open, onClose }: Props) {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'inqueue' | 'history'>('files');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Reset selezione quando cambio tab
  useEffect(() => {
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  }, [activeTab]);

  const files = useMemo(
    () => jobs.filter(j => j.status === 'done' && j.outputName),
    [jobs]
  );
  const inQueue = useMemo(
    () => jobs.filter(j => j.status === 'queued' || j.status === 'running'),
    [jobs]
  );
  const history = useMemo(
    () => jobs.filter(j => j.status === 'done' || j.status === 'failed'),
    [jobs]
  );

  const fetchJobs = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await jobsApi.list();
      setJobs(data || []);
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Errore nel recupero dello spool');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchJobs();
    const interval = setInterval(() => fetchJobs(true), 5000);
    return () => clearInterval(interval);
  }, [open]);

  const handleDownload = async (job: JobItem) => {
    try {
      const response = await jobsApi.download(job.id);
      const blob = new Blob([response.data], { type: job.outputMime || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = job.outputName || `job-${job.id}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Download non disponibile');
    }
  };

  const handleDelete = async (job: JobItem) => {
    try {
      await jobsApi.delete(job.id);
      fetchJobs();
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Errore nella cancellazione');
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => jobsApi.delete(id)));
      setSelectedIds(new Set());
      fetchJobs(true);
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Errore nella cancellazione');
    }
  };

  const handleDeleteAll = async () => {
    try {
      const ids = (activeTab === 'files' ? files : activeTab === 'inqueue' ? inQueue : history).map(j => j.id);
      await Promise.all(ids.map(id => jobsApi.delete(id)));
      setSelectedIds(new Set());
      fetchJobs(true);
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Errore nella cancellazione');
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedIds.size === 0) return;
    const list = getCurrentList();
    const selectedJobs = list.filter(j => selectedIds.has(j.id));
    if (selectedJobs.length === 1) {
      await handleDownload(selectedJobs[0]);
      return;
    }
    const response = await jobsApi.downloadZip(selectedJobs.map(j => j.id));
    const blob = new Blob([response.data], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'files.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openBlobInNewTab = (blob: Blob, filename: string) => {
    // Crea un nuovo blob con il type corretto per assicurare che il browser lo riconosca
    const properBlob = new Blob([blob], { type: blob.type || 'application/pdf' });
    const url = URL.createObjectURL(properBlob);

    // Apri in una nuova finestra
    const win = window.open(url, '_blank');
    if (!win) {
      showError('Popup bloccato: consenti le nuove schede per aprire il PDF');
      URL.revokeObjectURL(url);
      return;
    }

    // Il browser userà il MIME type per determinare come aprire il file
    // Per PDF, lo aprirà nel visualizzatore integrato
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleOpenSelected = async (idsOverride?: string[]) => {
    const ids = idsOverride ?? Array.from(selectedIds);

    if (!ids.length) {
      showError('Nessun file selezionato');
      return;
    }

    try {
      const list = getCurrentList();
      const selectedJobs = list.filter(j => ids.includes(j.id));

      if (selectedJobs.length === 0) {
        showError('File non trovati');
        return;
      }

      // tutti devono essere PDF
      if (!selectedJobs.every(j => (j.outputMime || '').toLowerCase().includes('pdf'))) {
        showError('Apri funziona solo con PDF');
        return;
      }

      if (selectedJobs.length === 1) {
        const job = selectedJobs[0];
        const response = await jobsApi.download(job.id);
        const blob = new Blob([response.data], { type: job.outputMime || 'application/pdf' });
        const filename = job.outputName || 'document.pdf';
        openBlobInNewTab(blob, filename);
        return;
      }

      // multipli: merge server-side
      console.log('Merging PDFs with IDs:', selectedJobs.map(j => j.id));
      const response = await jobsApi.mergePdf(selectedJobs.map(j => j.id));
      console.log('Merge response:', response);
      console.log('Response data type:', typeof response.data);
      console.log('Response data size:', response.data?.size || response.data?.byteLength || 'unknown');

      if (!response.data || (response.data.size === 0 && response.data.byteLength === 0)) {
        showError('Risposta vuota dal server');
        return;
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      console.log('Created blob:', blob.size, 'bytes');
      const mergedFilename = `merged_${Date.now()}.pdf`;
      openBlobInNewTab(blob, mergedFilename);
    } catch (err: any) {
      console.error('Error opening PDFs:', err);
      showError(err?.response?.data?.message || err?.message || 'Errore apertura PDF');
    }
  };

  const getCurrentList = () => {
    if (activeTab === 'files') return files;
    if (activeTab === 'inqueue') return inQueue;
    return history;
  };

  const toggleSelect = (jobId: string, rowIndex: number, event: React.MouseEvent) => {
    const list = getCurrentList();
    const newSelected = new Set(selectedIds);
    const isSelected = newSelected.has(jobId);

    if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, rowIndex);
      const end = Math.max(lastSelectedIndex, rowIndex);
      for (let i = start; i <= end; i++) {
        newSelected.add(list[i].id);
      }
    } else if (event.ctrlKey || event.metaKey) {
      if (isSelected) newSelected.delete(jobId);
      else newSelected.add(jobId);
      setLastSelectedIndex(rowIndex);
    } else {
      if (isSelected && selectedIds.size === 1) {
        newSelected.clear();
        setLastSelectedIndex(null);
      } else {
        newSelected.clear();
        newSelected.add(jobId);
        setLastSelectedIndex(rowIndex);
      }
    }
    setSelectedIds(newSelected);
  };

  const statusBadge = (status: JobStatus) => {
    const map: Record<JobStatus, string> = {
      queued: 'bg-amber-100 text-amber-700',
      running: 'bg-blue-100 text-blue-700',
      done: 'bg-emerald-100 text-emerald-700',
      failed: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="w-full max-w-6xl h-[80vh] rounded-2xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
          >
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 select-none" onContextMenu={(e) => e.preventDefault()}>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Spool lavori</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>Code e documenti generati per il tuo utente</span>
                    {refreshing && <i className="fas fa-spinner fa-spin text-xs" aria-label="aggiornamento in corso"></i>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchJobs(true)}
                  className="h-9 w-9 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Aggiorna"
                >
                  <i className="fas fa-rotate-right text-gray-600 dark:text-gray-300"></i>
                </button>
                <button
                  onClick={onClose}
                  className="h-9 w-9 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Chiudi"
                >
                  <i className="fas fa-times text-gray-600 dark:text-gray-300"></i>
                </button>
              </div>
            </div>

              <div className="px-6 pt-4 flex flex-col h-[calc(80vh-120px)] overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
              <div className="mb-4 flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('files')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeTab === 'files'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  FILE
                </button>
                <button
                  onClick={() => setActiveTab('inqueue')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeTab === 'inqueue'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  IN CODA
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeTab === 'history'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  COMPLETI
                </button>
                </div>
                {activeTab === 'files' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenSelected()}
                      disabled={selectedIds.size === 0}
                      className="h-9 w-9 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
                      title="Apri (solo PDF; merge se multipli)"
                    >
                      <i className="fas fa-up-right-from-square text-gray-600 dark:text-gray-300"></i>
                    </button>
                    <button
                      onClick={handleDownloadSelected}
                      disabled={selectedIds.size === 0}
                      className="h-9 w-9 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
                      title="Scarica selezionati"
                    >
                      <i className="fas fa-download text-gray-600 dark:text-gray-300"></i>
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      disabled={selectedIds.size === 0}
                      className="h-9 w-9 rounded-full border border-red-200 dark:border-red-700 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
                      title="Cancella selezionati"
                    >
                      <i className="fas fa-trash text-red-600 dark:text-red-400"></i>
                    </button>
                    <button
                      onClick={handleDeleteAll}
                      className="h-9 w-9 rounded-full border border-red-300 dark:border-red-700 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Cancella tutti (tab corrente)"
                    >
                      <i className="fas fa-ban text-red-600 dark:text-red-400"></i>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-lg select-none" style={{ userSelect: 'none' }} onContextMenu={(e) => e.preventDefault()}>
                {loading ? (
                  <div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
                    <i className="fas fa-spinner fa-spin mr-2"></i>Caricamento...
                  </div>
                ) : (
                  <>
                    {activeTab === 'files' && (
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left">FILE</th>
                            <th className="px-4 py-3 text-left">FORMATO</th>
                            <th className="px-4 py-3 text-left">DIMENSIONE</th>
                            <th className="px-4 py-3 text-left">CREATO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {files.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                Nessun file disponibile
                              </td>
                            </tr>
                                ) : (
                                  files.map((job, idx) => (
                                    <tr
                                      key={job.id}
                                      onClick={(e) => toggleSelect(job.id, idx, e)}
                                      onDoubleClick={async () => {
                                        if (job.outputMime === 'application/pdf') {
                                          await handleOpenSelected([job.id]);
                                        } else {
                                          await handleDownload(job);
                                        }
                                      }}
                                      className={`cursor-pointer border-t border-gray-200 dark:border-gray-800 ${
                                        selectedIds.has(job.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                      }`}
                                    >
                                      <td className="px-4 py-3 text-gray-900 dark:text-white">{job.outputName || '-'}</td>
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                  {job.outputName ? (job.outputName.split('.').pop() || '').toUpperCase() : '-'}
                                </td>
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                  {job.outputSize && job.outputSize > 0 ? `${(job.outputSize / 1024).toFixed(1)} KB` : '-'}
                                </td>
                                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                        {new Date(job.createdAt).toLocaleString('it-IT')}
                                      </td>
                                    </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}

                    {activeTab === 'inqueue' && (
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left">NOME JOB</th>
                            <th className="px-4 py-3 text-left">ID</th>
                            <th className="px-4 py-3 text-left">AVVIATO</th>
                            <th className="px-4 py-3 text-left">STATO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inQueue.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                Nessun job in coda
                              </td>
                            </tr>
                          ) : (
                            inQueue.map((job, idx) => (
                              <tr
                                key={job.id}
                                onClick={(e) => toggleSelect(job.id, idx, e)}
                                className={`cursor-pointer border-t border-gray-200 dark:border-gray-800 ${
                                  selectedIds.has(job.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                              >
                                <td className="px-4 py-3 text-gray-900 dark:text-white">{job.type}</td>
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">{job.id}</td>
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                  {new Date(job.createdAt).toLocaleString('it-IT')}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(job.status)}`}>
                                    {job.status === 'queued' ? 'IN CODA' : 'IN CORSO'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}

                    {activeTab === 'history' && (
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left">NOME JOB</th>
                            <th className="px-4 py-3 text-left">ID</th>
                            <th className="px-4 py-3 text-left">AVVIATO</th>
                            <th className="px-4 py-3 text-left">TERMINATO</th>
                            <th className="px-4 py-3 text-left">ESITO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                Nessun job completato o fallito
                              </td>
                            </tr>
                          ) : (
                            history.map((job, idx) => (
                              <tr
                                key={job.id}
                                onClick={(e) => toggleSelect(job.id, idx, e)}
                                className={`cursor-pointer border-t border-gray-200 dark:border-gray-800 ${
                                  selectedIds.has(job.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                              >
                                <td className="px-4 py-3 text-gray-900 dark:text-white">{job.type}</td>
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">{job.id}</td>
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                  {new Date(job.createdAt).toLocaleString('it-IT')}
                                </td>
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                  {job.finishedAt ? new Date(job.finishedAt).toLocaleString('it-IT') : '-'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(job.status)}`}>
                                    {job.status === 'done' ? 'OK' : 'FALLITO'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
