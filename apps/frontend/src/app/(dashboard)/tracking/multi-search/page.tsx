'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { trackingApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

interface SearchFilters {
  cartellino: string;
  commessa: string;
  articolo: string;
  descrizione: string;
  linea: string;
  ragioneSociale: string;
  ordine: string;
}

interface SearchResult {
  id: number;
  cartellino?: string;
  commessa?: string;
  modello?: string;
  descrizione?: string;
  ordine?: number;
  cliente?: string;
  note?: string;
}

export default function MultiSearchPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFilters>({
    cartellino: '',
    commessa: '',
    articolo: '',
    descrizione: '',
    linea: '',
    ragioneSociale: '',
    ordine: '',
  });
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const handleSearch = async (newPage = 1) => {
    // Check if at least one filter is set
    const hasFilter = Object.values(filters).some(v => v.trim());
    if (!hasFilter) {
      showError('Inserisci almeno un criterio di ricerca');
      return;
    }

    setSearching(true);
    try {
      const response = await trackingApi.searchData({
        ...filters,
        page: newPage,
        limit: 50,
      });
      setResults(response.data || []);
      setTotalPages(response.totalPages || 1);
      setTotal(response.total || 0);
      setPage(newPage);
      setSelectedIds([]);

      if ((response.data || []).length === 0) {
        showError('Nessun risultato trovato');
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore nella ricerca');
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    setFilters({
      cartellino: '',
      commessa: '',
      articolo: '',
      descrizione: '',
      linea: '',
      ragioneSociale: '',
      ordine: '',
    });
    setResults([]);
    setSelectedIds([]);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(results.map(r => r.id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const handleProceed = () => {
    if (selectedIds.length === 0) {
      showError('Seleziona almeno un cartellino');
      return;
    }
    sessionStorage.setItem('selectedCartelli', JSON.stringify(selectedIds));
    router.push('/tracking/process-links');
  };

  // Group results by articolo (modello) con descrizione
  const groupedResults: Record<string, { descrizione: string; items: SearchResult[] }> = {};
  results.forEach(r => {
    const key = r.modello || 'Senza Articolo';
    if (!groupedResults[key]) {
      groupedResults[key] = { descrizione: r.descrizione || '', items: [] };
    }
    groupedResults[key].items.push(r);
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <PageHeader
        title="Ricerca Multipla Cartellini"
        subtitle="Cerca cartellini con 7 filtri e seleziona per collegare ai lotti"
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Tracking', href: '/tracking' },
          { label: 'Ricerca Multipla' },
        ]}
      />

      {/* Search Filters */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cartellino</label>
            <input
              type="text"
              value={filters.cartellino}
              onChange={e => setFilters(prev => ({ ...prev, cartellino: e.target.value }))}
              placeholder="N. Cartellino"
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commessa</label>
            <input
              type="text"
              value={filters.commessa}
              onChange={e => setFilters(prev => ({ ...prev, commessa: e.target.value }))}
              placeholder="N. Commessa"
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Articolo</label>
            <input
              type="text"
              value={filters.articolo}
              onChange={e => setFilters(prev => ({ ...prev, articolo: e.target.value }))}
              placeholder="Cod. Articolo"
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrizione</label>
            <input
              type="text"
              value={filters.descrizione}
              onChange={e => setFilters(prev => ({ ...prev, descrizione: e.target.value }))}
              placeholder="Descrizione"
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Linea</label>
            <input
              type="text"
              value={filters.linea}
              onChange={e => setFilters(prev => ({ ...prev, linea: e.target.value }))}
              placeholder="Linea"
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ragione Sociale</label>
            <input
              type="text"
              value={filters.ragioneSociale}
              onChange={e => setFilters(prev => ({ ...prev, ragioneSociale: e.target.value }))}
              placeholder="Cliente"
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordine</label>
            <input
              type="text"
              value={filters.ordine}
              onChange={e => setFilters(prev => ({ ...prev, ordine: e.target.value }))}
              placeholder="N. Ordine"
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleSearch(1)}
            disabled={searching}
            className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-lg transition disabled:opacity-50"
          >
            {searching ? (
              <><i className="fas fa-spinner fa-spin mr-2"></i>Ricerca...</>
            ) : (
              <><i className="fas fa-search mr-2"></i>Cerca</>
            )}
          </button>
          <button
            onClick={handleClear}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <i className="fas fa-eraser mr-2"></i>Pulisci
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {total} risultati - {selectedIds.length} selezionati
              </span>
              <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">
                Seleziona tutti
              </button>
              <button onClick={deselectAll} className="text-sm text-gray-600 hover:underline">
                Deseleziona tutti
              </button>
            </div>
            <button
              onClick={handleProceed}
              disabled={selectedIds.length === 0}
              className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-arrow-right mr-2"></i>
              Procedi ({selectedIds.length})
            </button>
          </div>

          {/* Grouped Results */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Object.entries(groupedResults).map(([articolo, { descrizione, items }]) => (
              <div key={articolo}>
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 font-medium text-gray-700 dark:text-gray-300 flex items-center gap-3">
                  <span className="text-blue-600 dark:text-blue-400">{articolo}</span>
                  {descrizione && <span className="text-gray-500 dark:text-gray-400">- {descrizione}</span>}
                  <span className="ml-auto text-sm bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded">{items.length}</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className={`flex items-center px-4 py-3 cursor-pointer transition ${
                        selectedIds.includes(item.id)
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="mr-4 h-4 w-4 text-blue-600 rounded"
                      />
                      <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Cartellino:</span>{' '}
                          <span className="font-medium text-gray-900 dark:text-white">{item.cartellino || item.id}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Commessa:</span>{' '}
                          <span className="text-gray-900 dark:text-white">{item.commessa || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Ordine:</span>{' '}
                          <span className="text-gray-900 dark:text-white">{item.ordine || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Cliente:</span>{' '}
                          <span className="text-gray-900 dark:text-white">{item.cliente || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleSearch(page - 1)}
                disabled={page <= 1 || searching}
                className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Pagina {page} di {totalPages}
              </span>
              <button
                onClick={() => handleSearch(page + 1)}
                disabled={page >= totalPages || searching}
                className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
