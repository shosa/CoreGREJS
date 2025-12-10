'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { exportApi } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Document {
  id: number;
  progressivo: string;
  data: string;
  stato: string;
  terzista: {
    ragioneSociale: string;
  };
  autorizzazione?: string;
  commento?: string;
  righe?: any[];
}

interface Terzista {
  id: number;
  ragioneSociale: string;
}

export default function ArchivePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [terzisti, setTerzisti] = useState<Terzista[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [chiusiFilter, setChiusiFilter] = useState<'ESCLUDI' | 'INCLUDI' | 'SOLO'>('ESCLUDI');
  const [terzistaFilter, setTerzistaFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [searchTerm, chiusiFilter, terzistaFilter, dateFrom, dateTo]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsData, terzistiData] = await Promise.all([
        exportApi.getDocuments(),
        exportApi.getTerzisti(true),
      ]);

      const sortedDocs = [...docsData].sort((a: any, b: any) =>
        b.progressivo.localeCompare(a.progressivo, undefined, { numeric: true })
      );
      setDocuments(sortedDocs);
      setTerzisti(terzistiData);
    } catch (error) {
      showError('Errore nel caricamento dei documenti');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.progressivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.terzista.ragioneSociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.autorizzazione?.toLowerCase().includes(searchTerm.toLowerCase());

    // Logica chiusi: ESCLUDI (solo aperti), INCLUDI (tutti), SOLO (solo chiusi)
    let matchesChiusi = true;
    if (chiusiFilter === 'ESCLUDI') {
      matchesChiusi = doc.stato !== 'Chiuso';
    } else if (chiusiFilter === 'SOLO') {
      matchesChiusi = doc.stato === 'Chiuso';
    }
    // INCLUDI non filtra nulla

    const matchesTerzista = !terzistaFilter || doc.terzista.ragioneSociale === terzistaFilter;

    const docDate = new Date(doc.data);
    const matchesDateFrom = !dateFrom || docDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || docDate <= new Date(dateTo);

    return matchesSearch && matchesChiusi && matchesTerzista && matchesDateFrom && matchesDateTo;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDocument = (progressivo: string) => {
    router.push(`/export/${progressivo}`);
  };

  const handleDeleteClick = (progressivo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocumentToDelete(progressivo);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    try {
      await exportApi.deleteDocument(documentToDelete);
      showSuccess(`Documento ${documentToDelete} eliminato con successo`);
      setShowDeleteModal(false);
      setDocumentToDelete(null);
      await fetchData();
    } catch (error) {
      showError('Errore durante l\'eliminazione del documento');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDocumentToDelete(null);
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
      <PageHeader
        title="Archivio DDT"
        subtitle="Tutti i documenti di trasporto"
        actions={
          <button
            onClick={() => router.push('/export/create')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:shadow-lg transition-all duration-200"
          >
            <i className="fas fa-plus"></i>
            Nuovo DDT
          </button>
        }
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Export', href: '/export' },
          { label: 'Archivio' },
        ]}
      />

      {/* Filters */}
      <motion.div
        variants={itemVariants}
        className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow dark:border-gray-800 dark:bg-gray-800/40"
      >
        <div className="space-y-2">
          {/* Prima riga: Ricerca + Date */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            {/* Search */}
            <div className="md:col-span-6">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                <i className="fas fa-search text-blue-500 mr-1"></i>
                Ricerca
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Progressivo, terzista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <i className="fas fa-times-circle text-xs"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Date From */}
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                <i className="fas fa-calendar text-blue-500 mr-1"></i>
                Da
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-2 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date To */}
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                A
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-2 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Seconda riga: Terzista + Documenti Chiusi + Reset */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            {/* Terzista - stesso span della ricerca (6 colonne) */}
            <div className="md:col-span-6">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                <i className="fas fa-building text-blue-500 mr-1"></i>
                Terzista
              </label>
              <select
                value={terzistaFilter}
                onChange={(e) => setTerzistaFilter(e.target.value)}
                className="w-full px-2 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tutti</option>
                {terzisti.map((t) => (
                  <option key={t.id} value={t.ragioneSociale}>
                    {t.ragioneSociale}
                  </option>
                ))}
              </select>
            </div>

            {/* Documenti Chiusi */}
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                <i className="fas fa-lock text-blue-500 mr-1"></i>
                Documenti Chiusi
              </label>
              <div className="flex gap-1">
                {(['ESCLUDI', 'INCLUDI', 'SOLO'] as const).map((mode) => (
                  <label
                    key={mode}
                    className={`flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-all whitespace-nowrap ${
                      chiusiFilter === mode
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-500 text-white shadow'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="chiusiFilter"
                      value={mode}
                      checked={chiusiFilter === mode}
                      onChange={(e) => setChiusiFilter(e.target.value as any)}
                      className="sr-only"
                    />
                    {mode === 'ESCLUDI' && 'Escludi'}
                    {mode === 'INCLUDI' && 'Tutti'}
                    {mode === 'SOLO' && 'Solo'}
                  </label>
                ))}
              </div>
            </div>

            {/* Reset */}
            <div className="md:col-span-2">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setChiusiFilter('ESCLUDI');
                  setTerzistaFilter('');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="w-full px-4 py-2 text-xs font-medium rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg transition-all"
              >
                <i className="fas fa-redo mr-1.5"></i>
                Reset
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={itemVariants}
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Totale documenti:</span>
              <span className="font-bold text-gray-900 dark:text-white">{documents.length}</span>
            </div>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Risultati filtrati:</span>
              <span className="font-bold text-gray-900 dark:text-white">{filteredDocuments.length}</span>
            </div>
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            Pagina {currentPage} di {totalPages || 1}
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Progressivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Terzista
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Stato
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <AnimatePresence>
                {paginatedDocuments.map((doc, index) => (
                  <motion.tr
                    key={doc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
                    onClick={() => handleOpenDocument(doc.progressivo)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                        {doc.progressivo}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(doc.data).toLocaleDateString('it-IT')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {doc.terzista.ragioneSociale}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          doc.stato === 'Aperto'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {doc.stato}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDocument(doc.progressivo);
                          }}
                          className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                          title="Modifica"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        {doc.stato === 'Aperto' && (
                          <button
                            onClick={(e) => handleDeleteClick(doc.progressivo, e)}
                            className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
                            title="Elimina"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filteredDocuments.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-500 dark:text-gray-400"
            >
              <i className="fas fa-inbox text-4xl mb-3 opacity-50"></i>
              <p className="font-medium">Nessun documento trovato</p>
              <p className="text-sm mt-1">Prova a modificare i filtri di ricerca</p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          variants={itemVariants}
          className="mt-6 flex justify-center items-center gap-2"
        >
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-chevron-left"></i>
          </button>

          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (currentPage <= 4) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = currentPage - 3 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === pageNum
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <i className="fas fa-exclamation-triangle text-xl text-red-600 dark:text-red-400"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Conferma Eliminazione</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Questa azione è irreversibile</p>
              </div>
            </div>

            <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Sei sicuro di voler eliminare il documento <span className="font-mono font-bold text-red-600 dark:text-red-400">{documentToDelete}</span>?
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Tutti i dati associati (righe, piede, mancanti, lanci) verranno eliminati definitivamente.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg"
              >
                <i className="fas fa-trash mr-2"></i>
                Elimina
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
