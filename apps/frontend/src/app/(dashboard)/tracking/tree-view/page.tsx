'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackingApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

// Simple Confirm Dialog Component
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg transition"
            >
              Annulla
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
            >
              Elimina
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

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
  commessa: string;
  articolo: string;
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
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });

  const handleSearch = async (newPage = 1) => {
    if (!search.trim()) {
      showError('Inserisci un criterio di ricerca o "*" per vedere tutto');
      return;
    }

    setLoading(true);
    try {
      const result = await trackingApi.getTreeData(search, newPage, 25);
      setTree(result.tree || []);
      setTotalPages(result.totalPages || 1);
      setTotal(result.total || 0);
      setPage(newPage);
      // Don't expand by default - let user expand manually
      setExpandedCartelli(new Set());
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

  const handleDeleteLot = async () => {
    if (!confirmDelete.id) return;

    setDeleting(confirmDelete.id);
    setConfirmDelete({ open: false, id: null });

    try {
      await trackingApi.deleteLink(confirmDelete.id);
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
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden font-mono">
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
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
                >
                  <div className="flex items-center gap-2">
                    <i className={`fas fa-chevron-${expandedCartelli.has(item.cartel) ? 'down' : 'right'} mr-3 text-gray-400`}></i>
                    <i className="fas fa-tag text-blue-500"></i>
                    <span className="font-bold text-gray-900 dark:text-white">Cartellino #{item.cartel}</span>
                    {item.commessa && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">({item.commessa})</span>
                    )}
                    <span className="text-sm text-gray-500">• {item.types.length} link</span>
                  </div>
                  {item.articolo && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">{item.articolo}</span>
                  )}
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
                                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition"
                                      >
                                        <i className="fas fa-edit text-sm"></i>
                                      </button>
                                      <button
                                        onClick={() => setConfirmDelete({ open: true, id: lot.id })}
                                        disabled={deleting === lot.id}
                                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition disabled:opacity-50"
                                      >
                                        {deleting === lot.id ? (
                                          <i className="fas fa-spinner fa-spin text-sm"></i>
                                        ) : (
                                          <i className="fas fa-trash text-sm"></i>
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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDelete.open}
        title="Elimina Collegamento"
        message="Sei sicuro di voler eliminare questo collegamento? Questa azione non può essere annullata."
        onConfirm={handleDeleteLot}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
      />
    </motion.div>
  );
}
