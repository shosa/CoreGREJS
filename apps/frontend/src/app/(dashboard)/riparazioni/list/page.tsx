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
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Riparazione {
  id: number;
  idRiparazione: string;
  cartellino?: string;
  data: string;
  completa: boolean;
  laboratorio?: {
    nome: string;
  };
  reparto?: {
    nome: string;
  };
  linea?: {
    nome: string;
  };
  causale?: string;
}

interface Laboratorio {
  id: number;
  nome: string;
}

interface Reparto {
  id: number;
  nome: string;
}

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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
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
    } catch (error) {
      showError('Errore nel caricamento delle riparazioni');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredRiparazioni = riparazioni.filter((rip) => {
    const matchesSearch =
      rip.idRiparazione.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rip.cartellino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rip.causale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rip.laboratorio?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rip.reparto?.nome.toLowerCase().includes(searchTerm.toLowerCase());

    // Logica completa: ESCLUDI (solo aperte), INCLUDI (tutte), SOLO (solo completate)
    let matchesCompleta = true;
    if (completaFilter === 'ESCLUDI') {
      matchesCompleta = !rip.completa;
    } else if (completaFilter === 'SOLO') {
      matchesCompleta = rip.completa;
    }
    // INCLUDI non filtra nulla

    const matchesLaboratorio = !laboratorioFilter || rip.laboratorio?.nome === laboratorioFilter;
    const matchesReparto = !repartoFilter || rip.reparto?.nome === repartoFilter;

    const ripDate = new Date(rip.data);
    const matchesDateFrom = !dateFrom || ripDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || ripDate <= new Date(dateTo);

    return matchesSearch && matchesCompleta && matchesLaboratorio && matchesReparto && matchesDateFrom && matchesDateTo;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRiparazioni.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRiparazioni = filteredRiparazioni.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenRiparazione = (id: number) => {
    router.push(`/riparazioni/${id}`);
  };

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
    } catch (error) {
      showError('Errore durante l\'eliminazione della riparazione');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setRiparazioneToDelete(null);
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
      <PageHeader title="Archivio Riparazioni" subtitle="Tutte le riparazioni esterne" />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Riparazioni', href: '/riparazioni' },
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
                  placeholder="ID, cartellino, causale..."
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

          {/* Seconda riga: Laboratorio + Reparto + Completate + Reset */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            {/* Laboratorio */}
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                <i className="fas fa-flask text-blue-500 mr-1"></i>
                Laboratorio
              </label>
              <select
                value={laboratorioFilter}
                onChange={(e) => setLaboratorioFilter(e.target.value)}
                className="w-full px-2 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tutti</option>
                {laboratori.map((lab) => (
                  <option key={lab.id} value={lab.nome}>
                    {lab.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Reparto */}
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                <i className="fas fa-industry text-blue-500 mr-1"></i>
                Reparto
              </label>
              <select
                value={repartoFilter}
                onChange={(e) => setRepartoFilter(e.target.value)}
                className="w-full px-2 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tutti</option>
                {reparti.map((rep) => (
                  <option key={rep.id} value={rep.nome}>
                    {rep.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Riparazioni Completate */}
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                <i className="fas fa-check-circle text-blue-500 mr-1"></i>
                Completate
              </label>
              <div className="flex gap-1">
                {(['ESCLUDI', 'INCLUDI', 'SOLO'] as const).map((mode) => (
                  <label
                    key={mode}
                    className={`flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-all whitespace-nowrap ${
                      completaFilter === mode
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-500 text-white shadow'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-600'
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
                    {mode === 'ESCLUDI' && 'Escludi'}
                    {mode === 'INCLUDI' && 'Tutte'}
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
                  setCompletaFilter('ESCLUDI');
                  setLaboratorioFilter('');
                  setRepartoFilter('');
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
              <span className="text-gray-600 dark:text-gray-400">Totale riparazioni:</span>
              <span className="font-bold text-gray-900 dark:text-white">{riparazioni.length}</span>
            </div>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Risultati filtrati:</span>
              <span className="font-bold text-gray-900 dark:text-white">{filteredRiparazioni.length}</span>
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
                  ID Riparazione
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Cartellino
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Laboratorio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Reparto
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
                {paginatedRiparazioni.map((rip, index) => (
                  <motion.tr
                    key={rip.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
                    onClick={() => handleOpenRiparazione(rip.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                        {rip.idRiparazione}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {rip.cartellino || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(rip.data).toLocaleDateString('it-IT')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {rip.laboratorio?.nome || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {rip.reparto?.nome || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          !rip.completa
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {rip.completa ? 'Completata' : 'Aperta'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRiparazione(rip.id);
                          }}
                          className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                          title="Visualizza"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        {!rip.completa && (
                          <button
                            onClick={(e) => handleDeleteClick(rip.id, e)}
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

          {filteredRiparazioni.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-500 dark:text-gray-400"
            >
              <i className="fas fa-inbox text-4xl mb-3 opacity-50"></i>
              <p className="font-medium">Nessuna riparazione trovata</p>
              <p className="text-sm mt-1">Prova a modificare i filtri di ricerca</p>
            </motion.div>
          )}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={filteredRiparazioni.length}
          onItemsPerPageChange={(newValue) => {
            setItemsPerPage(newValue);
            setCurrentPage(1);
          }}
        />
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
