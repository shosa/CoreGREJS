"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { analiticheApi } from "@/lib/api";
import { showError, showSuccess } from "@/store/notifications";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface ImportRecord {
  id: number;
  fileName: string;
  fileSize: number | null;
  recordsCount: number;
  stato: string;
  errorMessage: string | null;
  userId: number | null;
  createdAt: string;
}

export default function ImportsPage() {
  const [loading, setLoading] = useState(true);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<ImportRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadImports();
  }, [pagination.page]);

  const loadImports = async () => {
    try {
      setLoading(true);
      const result = await analiticheApi.getImports(pagination.page, pagination.limit);
      setImports(result.data);
      setPagination(prev => ({ ...prev, ...result.pagination }));
    } catch (error) {
      showError("Errore nel caricamento dello storico import");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (importRecord: ImportRecord) => {
    try {
      setDeleting(true);
      await analiticheApi.deleteImport(importRecord.id);
      showSuccess(`Import eliminato. ${importRecord.recordsCount} record rimossi.`);
      setShowDeleteConfirm(null);
      loadImports();
    } catch (error: any) {
      showError(error.message || "Errore durante l'eliminazione");
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (bytes === null || bytes === undefined) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (stato: string) => {
    switch (stato) {
      case "completato":
        return (
          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium">
            <i className="fas fa-check mr-1"></i>Completato
          </span>
        );
      case "errore":
        return (
          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium">
            <i className="fas fa-times mr-1"></i>Errore
          </span>
        );
      case "in_corso":
        return (
          <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium">
            <i className="fas fa-spinner fa-spin mr-1"></i>In corso
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-xs font-medium">
            {stato}
          </span>
        );
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title="Storico Import"
        subtitle="Visualizza e gestisci le importazioni Excel"
      />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Analitiche", href: "/analitiche" },
          { label: "Storico Import" },
        ]}
      />

      {/* Statistiche */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
      >
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <i className="fas fa-file-excel text-blue-500 text-lg"></i>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{pagination.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Import Totali</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <i className="fas fa-check-circle text-green-500 text-lg"></i>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {imports.filter(i => i.stato === "completato").length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Completati (pagina)</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <i className="fas fa-database text-emerald-500 text-lg"></i>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {imports.reduce((sum, i) => sum + i.recordsCount, 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Record (pagina)</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <i className="fas fa-exclamation-triangle text-red-500 text-lg"></i>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {imports.filter(i => i.stato === "errore").length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Errori (pagina)</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabella Import */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent"
            />
          </div>
        ) : imports.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <i className="fas fa-history text-4xl mb-4 text-gray-300 dark:text-gray-600"></i>
            <p>Nessun import effettuato</p>
            <a
              href="/analitiche/upload"
              className="mt-4 inline-block px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              Carica il primo file
            </a>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Data/Ora</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">File</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Dimensione</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Record</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Stato</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {imports.map((importRecord) => (
                    <tr
                      key={importRecord.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                        #{importRecord.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(importRecord.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-file-excel text-green-500"></i>
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[250px]">
                            {importRecord.fileName}
                          </span>
                        </div>
                        {importRecord.errorMessage && (
                          <p className="text-xs text-red-500 mt-1 truncate max-w-[300px]" title={importRecord.errorMessage}>
                            {importRecord.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                        {formatFileSize(importRecord.fileSize)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">
                          {importRecord.recordsCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(importRecord.stato)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <a
                            href={`/analitiche/records?importId=${importRecord.id}`}
                            className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                            title="Visualizza record"
                          >
                            <i className="fas fa-eye"></i>
                          </a>
                          <button
                            onClick={() => setShowDeleteConfirm(importRecord)}
                            className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
                            title="Elimina import e record associati"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginazione */}
            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Pagina {pagination.page} di {pagination.totalPages} ({pagination.total} totali)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <button
                    onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Modal Conferma Eliminazione */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4"
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                  <i className="fas fa-exclamation-triangle text-red-500 text-xl"></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Conferma Eliminazione
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Questa azione non può essere annullata
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Stai per eliminare l'import:
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  <i className="fas fa-file-excel text-green-500 mr-2"></i>
                  {showDeleteConfirm.fileName}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  <i className="fas fa-warning mr-1"></i>
                  Verranno eliminati anche <strong>{showDeleteConfirm.recordsCount.toLocaleString()}</strong> record associati.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? (
                    <span><i className="fas fa-spinner fa-spin mr-2"></i>Eliminazione...</span>
                  ) : (
                    <span><i className="fas fa-trash mr-2"></i>Elimina</span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
