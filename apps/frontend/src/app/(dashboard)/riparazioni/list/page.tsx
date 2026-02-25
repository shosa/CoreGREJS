'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { riparazioniApi } from '@/lib/api';
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

interface Riparazione {
  id: number;
  idRiparazione: string;
  cartellino?: string;
  data: string;
  completa: boolean;
  qtaTotale: number;
  laboratorio?: { nome: string };
  reparto?: { nome: string };
  linea?: { nome: string };
  causale?: string;
  codiceArticolo?: string;
  descrizioneArticolo?: string;
  cliente?: string;
  commessa?: string;
}

interface Laboratorio { id: number; nome: string; }
interface Reparto { id: number; nome: string; }

export default function RiparazioniListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [riparazioni, setRiparazioni] = useState<Riparazione[]>([]);
  const [laboratori, setLaboratori] = useState<Laboratorio[]>([]);
  const [reparti, setReparti] = useState<Reparto[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [completaFilter, setCompletaFilter] = useState<'ESCLUDI' | 'INCLUDI' | 'SOLO'>('ESCLUDI');
  const [laboratorioFilter, setLaboratorioFilter] = useState('');
  const [repartoFilter, setRepartoFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [riparazioneToDelete, setRiparazioneToDelete] = useState<number | null>(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, completaFilter, laboratorioFilter, repartoFilter, dateFrom, dateTo]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ripData, labData, repData] = await Promise.all([
        riparazioniApi.getRiparazioni(),
        riparazioniApi.getLaboratori(),
        riparazioniApi.getReparti(),
      ]);
      const sortedRip = [...ripData.data].sort((a: any, b: any) =>
        b.idRiparazione.localeCompare(a.idRiparazione, undefined, { numeric: true })
      );
      setRiparazioni(sortedRip);
      setLaboratori(labData);
      setReparti(repData);
    } catch {
      showError('Errore nel caricamento delle riparazioni');
    } finally {
      setLoading(false);
    }
  };

  const filteredRiparazioni = riparazioni.filter((rip) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      rip.idRiparazione.toLowerCase().includes(search) ||
      rip.cartellino?.toLowerCase().includes(search) ||
      rip.causale?.toLowerCase().includes(search) ||
      rip.laboratorio?.nome.toLowerCase().includes(search) ||
      rip.reparto?.nome.toLowerCase().includes(search) ||
      rip.codiceArticolo?.toLowerCase().includes(search) ||
      rip.descrizioneArticolo?.toLowerCase().includes(search) ||
      rip.cliente?.toLowerCase().includes(search) ||
      rip.commessa?.toLowerCase().includes(search);

    let matchesCompleta = true;
    if (completaFilter === 'ESCLUDI') matchesCompleta = !rip.completa;
    else if (completaFilter === 'SOLO') matchesCompleta = rip.completa;

    const matchesLaboratorio = !laboratorioFilter || rip.laboratorio?.nome === laboratorioFilter;
    const matchesReparto = !repartoFilter || rip.reparto?.nome === repartoFilter;

    const ripDate = new Date(rip.data);
    const matchesDateFrom = !dateFrom || ripDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || ripDate <= new Date(dateTo);

    return matchesSearch && matchesCompleta && matchesLaboratorio && matchesReparto && matchesDateFrom && matchesDateTo;
  });

  const totalPages = Math.ceil(filteredRiparazioni.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRiparazioni = filteredRiparazioni.slice(startIndex, startIndex + itemsPerPage);

  const totalAperte = riparazioni.filter((r) => !r.completa).length;
  const totalChiuse = riparazioni.filter((r) => r.completa).length;

  const hasActiveFilters =
    !!searchTerm || completaFilter !== 'ESCLUDI' || !!laboratorioFilter || !!repartoFilter || !!dateFrom || !!dateTo;

  const handleOpenRiparazione = (id: number) => router.push(`/riparazioni/${id}`);

  const handleDeleteClick = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setRiparazioneToDelete(id);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!riparazioneToDelete) return;
    try {
      await riparazioniApi.deleteRiparazione(riparazioneToDelete);
      showSuccess('Riparazione eliminata con successo');
      setShowDeleteModal(false);
      setRiparazioneToDelete(null);
      await fetchData();
    } catch {
      showError("Errore durante l'eliminazione della riparazione");
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setRiparazioneToDelete(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCompletaFilter('ESCLUDI');
    setLaboratorioFilter('');
    setRepartoFilter('');
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
          <PageHeader title="Archivio Riparazioni" subtitle="Tutte le riparazioni esterne" />
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/', icon: 'fa-home' },
              { label: 'Riparazioni', href: '/riparazioni' },
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
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{riparazioni.length}</p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">Totale</p>
                </div>
                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3 text-center">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{totalAperte}</p>
                  <p className="text-xs text-green-500 dark:text-green-400 mt-0.5">Aperte</p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 p-3 text-center col-span-2">
                  <p className="text-lg font-bold text-gray-600 dark:text-gray-300">{totalChiuse}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Chiuse</p>
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
                    placeholder="ID, cartellino..."
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

              {/* Laboratorio */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Laboratorio</label>
                <select value={laboratorioFilter} onChange={(e) => setLaboratorioFilter(e.target.value)} className={inputClass}>
                  <option value="">Tutti</option>
                  {laboratori.map((lab) => (
                    <option key={lab.id} value={lab.nome}>{lab.nome}</option>
                  ))}
                </select>
              </div>

              {/* Reparto */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Reparto</label>
                <select value={repartoFilter} onChange={(e) => setRepartoFilter(e.target.value)} className={inputClass}>
                  <option value="">Tutti</option>
                  {reparti.map((rep) => (
                    <option key={rep.id} value={rep.nome}>{rep.nome}</option>
                  ))}
                </select>
              </div>

              {/* Completate */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Completate</label>
                <div className="flex gap-1">
                  {(['ESCLUDI', 'INCLUDI', 'SOLO'] as const).map((mode) => (
                    <label
                      key={mode}
                      className={`flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-all ${
                        completaFilter === mode
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="completaFilter"
                        value={mode}
                        checked={completaFilter === mode}
                        onChange={(e) => setCompletaFilter(e.target.value as any)}
                        className="sr-only"
                      />
                      {mode === 'ESCLUDI' && 'Escl.'}
                      {mode === 'INCLUDI' && 'Tutte'}
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
              <i className="fas fa-tools text-blue-500 text-sm"></i>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Riparazioni
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
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{filteredRiparazioni.length}</span>
                    {hasActiveFilters && <span className="ml-1 text-gray-400">su {riparazioni.length}</span>}
                    {' '}risultati
                  </>
                )}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => router.push('/riparazioni/new')}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-2 text-xs font-medium text-white hover:shadow-md transition-all"
                >
                  <i className="fas fa-plus text-xs"></i>
                  Nuova Riparazione
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cartellino</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Articolo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qta</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Laboratorio</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stato</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  <AnimatePresence>
                    {paginatedRiparazioni.map((rip, index) => (
                      <motion.tr
                        key={rip.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
                        onClick={() => handleOpenRiparazione(rip.id)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                            {rip.idRiparazione}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {rip.cartellino || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-400 dark:text-gray-500">{rip.codiceArticolo || '-'}</div>
                          <div className="text-sm text-gray-700 dark:text-gray-200 truncate max-w-[180px]" title={rip.descrizioneArticolo}>
                            {rip.descrizioneArticolo || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[130px] block" title={rip.cliente}>
                            {rip.cliente || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{rip.qtaTotale}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{rip.laboratorio?.nome || '-'}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {new Date(rip.data).toLocaleDateString('it-IT')}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            !rip.completa
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {rip.completa ? 'Chiusa' : 'Aperta'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenRiparazione(rip.id); }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                              title="Visualizza"
                            >
                              <i className="fas fa-eye text-xs"></i>
                            </button>
                            {!rip.completa && (
                              <button
                                onClick={(e) => handleDeleteClick(rip.id, e)}
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

              {!loading && filteredRiparazioni.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                  <i className="fas fa-inbox text-4xl mb-3 opacity-40"></i>
                  <p className="font-medium text-sm">Nessuna riparazione trovata</p>
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
                totalItems={filteredRiparazioni.length}
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
                Sei sicuro di voler eliminare questa riparazione?
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Tutti i dati associati verranno eliminati definitivamente.
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
