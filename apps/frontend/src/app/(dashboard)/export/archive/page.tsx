'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { exportApi } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Pagination from '@/components/ui/Pagination';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500';

interface Document {
  id: number;
  progressivo: string;
  data: string;
  stato: string;
  terzista: { ragioneSociale: string };
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
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    setCurrentPage(1);
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
    } catch {
      showError('Errore nel caricamento dei documenti');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.progressivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.terzista.ragioneSociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.autorizzazione?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesChiusi = true;
    if (chiusiFilter === 'ESCLUDI') matchesChiusi = doc.stato !== 'Chiuso';
    else if (chiusiFilter === 'SOLO') matchesChiusi = doc.stato === 'Chiuso';

    const matchesTerzista = !terzistaFilter || doc.terzista.ragioneSociale === terzistaFilter;

    const docDate = new Date(doc.data);
    const matchesDateFrom = !dateFrom || docDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || docDate <= new Date(dateTo);

    return matchesSearch && matchesChiusi && matchesTerzista && matchesDateFrom && matchesDateTo;
  });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + itemsPerPage);

  const totalAperti = documents.filter((d) => d.stato === 'Aperto').length;
  const totalChiusi = documents.filter((d) => d.stato === 'Chiuso').length;

  const hasActiveFilters =
    !!searchTerm || chiusiFilter !== 'ESCLUDI' || !!terzistaFilter || !!dateFrom || !!dateTo;

  const handleOpenDocument = (progressivo: string) => router.push(`/export/${progressivo}`);

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
    } catch {
      showError("Errore durante l'eliminazione del documento");
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDocumentToDelete(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setChiusiFilter('ESCLUDI');
    setTerzistaFilter('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="flex flex-col h-full overflow-hidden"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="shrink-0">
          <PageHeader
            title="Archivio DDT"
            subtitle="Tutti i documenti di trasporto"
          />
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/', icon: 'fa-home' },
              { label: 'Export', href: '/export' },
              { label: 'Archivio' },
            ]}
          />
        </motion.div>

        {/* Body */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden min-h-0 mt-4"
        >
          {/* Sidebar */}
          <aside className="hidden md:flex md:w-60 shrink-0 flex-col gap-3 overflow-y-auto">
            {/* Stats */}
            <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Statistiche
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{documents.length}</p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">Totale</p>
                </div>
                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3 text-center">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{totalAperti}</p>
                  <p className="text-xs text-green-500 dark:text-green-400 mt-0.5">Aperti</p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 p-3 text-center col-span-2">
                  <p className="text-lg font-bold text-gray-600 dark:text-gray-300">{totalChiusi}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Chiusi</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Filtri
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <i className="fas fa-times mr-1"></i>Reset
                  </button>
                )}
              </div>

              {/* Search */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Ricerca</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Progressivo, terzista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={inputClass}
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

              {/* Date range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Da</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">A</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
                </div>
              </div>

              {/* Terzista */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Terzista</label>
                <select value={terzistaFilter} onChange={(e) => setTerzistaFilter(e.target.value)} className={inputClass}>
                  <option value="">Tutti</option>
                  {terzisti.map((t) => (
                    <option key={t.id} value={t.ragioneSociale}>{t.ragioneSociale}</option>
                  ))}
                </select>
              </div>

              {/* Documenti chiusi */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Documenti Chiusi</label>
                <div className="flex gap-1">
                  {(['ESCLUDI', 'INCLUDI', 'SOLO'] as const).map((mode) => (
                    <label
                      key={mode}
                      className={`flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-all ${
                        chiusiFilter === mode
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400'
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
                      {mode === 'ESCLUDI' && 'Escl.'}
                      {mode === 'INCLUDI' && 'Tutti'}
                      {mode === 'SOLO' && 'Solo'}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow">
            {/* Toolbar */}
            <div className="shrink-0 px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <i className="fas fa-file-alt text-blue-500 text-sm"></i>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Documenti
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <motion.i
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="fas fa-spinner"
                    />
                    Caricamento…
                  </span>
                ) : (
                  <>
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{filteredDocuments.length}</span>
                    {hasActiveFilters && <span className="ml-1 text-gray-400">su {documents.length}</span>}
                    {' '}risultati
                  </>
                )}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => router.push('/export/create')}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-2 text-xs font-medium text-white hover:shadow-md transition-all"
                >
                  <i className="fas fa-plus text-xs"></i>
                  Nuovo DDT
                </button>
                <button
                  onClick={fetchData}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Aggiorna"
                >
                  <i className="fas fa-sync-alt text-xs"></i>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progressivo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Terzista</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stato</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  <AnimatePresence>
                    {paginatedDocuments.map((doc, index) => (
                      <motion.tr
                        key={doc.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
                        onClick={() => handleOpenDocument(doc.progressivo)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                            {doc.progressivo}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {new Date(doc.data).toLocaleDateString('it-IT')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {doc.terzista.ragioneSociale}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            doc.stato === 'Aperto'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {doc.stato}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenDocument(doc.progressivo); }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                              title="Modifica"
                            >
                              <i className="fas fa-edit text-xs"></i>
                            </button>
                            {doc.stato === 'Aperto' && (
                              <button
                                onClick={(e) => handleDeleteClick(doc.progressivo, e)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                title="Elimina"
                              >
                                <i className="fas fa-trash text-xs"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>

              {!loading && filteredDocuments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                  <i className="fas fa-inbox text-4xl mb-3 opacity-40"></i>
                  <p className="font-medium text-sm">Nessun documento trovato</p>
                  <p className="text-xs mt-1">Prova a modificare i filtri</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="shrink-0 border-t border-gray-200 dark:border-gray-700">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredDocuments.length}
                onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>

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
                Sei sicuro di voler eliminare il documento{' '}
                <span className="font-mono font-bold text-red-600 dark:text-red-400">{documentToDelete}</span>?
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
                <i className="fas fa-trash mr-2"></i>Elimina
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
