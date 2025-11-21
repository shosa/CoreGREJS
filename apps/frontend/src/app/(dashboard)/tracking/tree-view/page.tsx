'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackingApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

interface LotItem {
  id: number;
  lot: string;
  note?: string;
  timestamp: string;
}

interface TypeGroup {
  type: { id: number; name: string; note?: string };
  lots: LotItem[];
}

interface TreeItem {
  cartel: number;
  types: TypeGroup[];
}

export default function TreeViewPage() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedCartelli, setExpandedCartelli] = useState<Set<number>>(new Set());
  const [editingLot, setEditingLot] = useState<{ id: number; lot: string } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleSearch = async (newPage = 1) => {
    if (!search.trim()) {
      showError('Inserisci un criterio di ricerca o "*" per vedere tutto');
      return;
    }

    setLoading(true);
    try {
      const result = await trackingApi.getTreeData(search, newPage, 100);
      setTree(result.tree || []);
      setTotalPages(result.totalPages || 1);
      setTotal(result.total || 0);
      setPage(newPage);
      // Expand all by default
      setExpandedCartelli(new Set((result.tree || []).map((t: TreeItem) => t.cartel)));
    } catch (error) {
      showError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (cartel: number) => {
    setExpandedCartelli(prev => {
      const next = new Set(prev);
      if (next.has(cartel)) {
        next.delete(cartel);
      } else {
        next.add(cartel);
      }
      return next;
    });
  };

  const handleEditLot = async () => {
    if (!editingLot) return;
    try {
      await trackingApi.updateLot(editingLot.id, editingLot.lot);
      showSuccess('Lotto aggiornato');
      setEditingLot(null);
      handleSearch(page);
    } catch (error) {
      showError('Errore nell\'aggiornamento');
    }
  };

  const handleDeleteLot = async (id: number) => {
    if (!confirm('Eliminare questo collegamento?')) return;
    setDeleting(id);
    try {
      await trackingApi.deleteLink(id);
      showSuccess('Collegamento eliminato');
      handleSearch(page);
    } catch (error) {
      showError('Errore nell\'eliminazione');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <PageHeader
        title="Albero Collegamenti"
        subtitle="Visualizza e modifica collegamenti Cartellino > Tipo > Lotti"
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Tracking', href: '/tracking' },
          { label: 'Albero Collegamenti' },
        ]}
      />

      {/* Search Bar */}
      <div className="flex gap-4 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch(1)}
          placeholder="Cerca per lotto o cartellino (* per mostrare tutto)"
          className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
        />
        <button
          onClick={() => handleSearch(1)}
          disabled={loading}
          className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg transition disabled:opacity-50"
        >
          {loading ? (
            <><i className="fas fa-spinner fa-spin mr-2"></i>Caricamento...</>
          ) : (
            <><i className="fas fa-search mr-2"></i>Cerca</>
          )}
        </button>
      </div>

      {/* Results */}
      {tree.length > 0 && (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {total} collegamenti trovati - {tree.length} cartellini
            </span>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {tree.map(item => (
              <div key={item.cartel}>
                {/* Cartellino Header */}
                <div
                  onClick={() => toggleExpand(item.cartel)}
                  className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
                >
                  <i className={`fas fa-chevron-${expandedCartelli.has(item.cartel) ? 'down' : 'right'} mr-3 text-gray-400`}></i>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-tag text-blue-500"></i>
                    <span className="font-bold text-gray-900 dark:text-white">Cartellino #{item.cartel}</span>
                    <span className="text-sm text-gray-500">({item.types.length} tipi)</span>
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedCartelli.has(item.cartel) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {item.types.map(typeGroup => (
                        <div key={typeGroup.type.id} className="ml-8 border-l-2 border-gray-200 dark:border-gray-600">
                          {/* Type Header */}
                          <div className="flex items-center px-4 py-2 bg-gray-50 dark:bg-gray-700/30">
                            <i className="fas fa-folder text-yellow-500 mr-2"></i>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{typeGroup.type.name}</span>
                            <span className="ml-2 text-xs text-gray-500">({typeGroup.lots.length} lotti)</span>
                          </div>

                          {/* Lots */}
                          <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {typeGroup.lots.map(lot => (
                              <div
                                key={lot.id}
                                className="flex items-center px-4 py-2 ml-4 hover:bg-gray-50 dark:hover:bg-gray-700/20"
                              >
                                <i className="fas fa-cube text-purple-500 mr-3"></i>
                                {editingLot?.id === lot.id ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <input
                                      type="text"
                                      value={editingLot.lot}
                                      onChange={e => setEditingLot({ ...editingLot, lot: e.target.value })}
                                      className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                                      autoFocus
                                    />
                                    <button
                                      onClick={handleEditLot}
                                      className="px-2 py-1 text-xs text-white bg-green-500 hover:bg-green-600 rounded"
                                    >
                                      <i className="fas fa-check"></i>
                                    </button>
                                    <button
                                      onClick={() => setEditingLot(null)}
                                      className="px-2 py-1 text-xs text-gray-600 bg-gray-200 hover:bg-gray-300 rounded"
                                    >
                                      <i className="fas fa-times"></i>
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="flex-1 text-sm text-gray-900 dark:text-white">{lot.lot}</span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => setEditingLot({ id: lot.id, lot: lot.lot })}
                                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                      >
                                        <i className="fas fa-edit"></i>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLot(lot.id)}
                                        disabled={deleting === lot.id}
                                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                                      >
                                        {deleting === lot.id ? (
                                          <i className="fas fa-spinner fa-spin"></i>
                                        ) : (
                                          <i className="fas fa-trash"></i>
                                        )}
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleSearch(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Pagina {page} di {totalPages}
              </span>
              <button
                onClick={() => handleSearch(page + 1)}
                disabled={page >= totalPages || loading}
                className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && tree.length === 0 && search && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <i className="fas fa-search text-4xl mb-4 block"></i>
          <p>Cerca per visualizzare l'albero dei collegamenti</p>
          <p className="text-sm mt-2">Usa "*" per visualizzare tutti i collegamenti (max 1000)</p>
        </div>
      )}
    </motion.div>
  );
}
