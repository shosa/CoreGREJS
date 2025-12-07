'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { riparazioniApi } from '@/lib/api';
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

interface Numerata {
  id: number;
  idNumerata: string;
  n01?: string;
  n02?: string;
  n03?: string;
  n04?: string;
  n05?: string;
  n06?: string;
  n07?: string;
  n08?: string;
  n09?: string;
  n10?: string;
  n11?: string;
  n12?: string;
  n13?: string;
  n14?: string;
  n15?: string;
  n16?: string;
  n17?: string;
  n18?: string;
  n19?: string;
  n20?: string;
}

export default function NumeratePage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [numerate, setNumerate] = useState<Numerata[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedNumerata, setSelectedNumerata] = useState<Numerata | null>(null);

  // Form
  const [idNumerata, setIdNumerata] = useState('');
  const [taglie, setTaglie] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Handle query params for auto-opening create modal
  useEffect(() => {
    const create = searchParams.get('create');
    const idNumerataParam = searchParams.get('id_numerata');

    if (create === 'true') {
      // Initialize empty taglie
      initializeTaglie();

      // Pre-fill ID if provided
      if (idNumerataParam) {
        setIdNumerata(idNumerataParam.toUpperCase());
      } else {
        setIdNumerata('');
      }

      // Open create modal
      setShowCreateModal(true);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await riparazioniApi.getNumerate();
      setNumerate(data);
    } catch (error) {
      showError('Errore nel caricamento delle numerate');
    } finally {
      setLoading(false);
    }
  };

  const initializeTaglie = (numerata?: Numerata) => {
    const newTaglie: Record<string, string> = {};
    for (let i = 1; i <= 20; i++) {
      const field = `n${String(i).padStart(2, '0')}`;
      newTaglie[field] = numerata?.[field as keyof Numerata] || '';
    }
    setTaglie(newTaglie);
  };

  const handleCreate = async () => {
    const normalizedId = idNumerata.trim().toUpperCase();
    if (!normalizedId) {
      showError('Inserisci il codice numerata (NU)');
      return;
    }
    if (normalizedId.length > 2) {
      showError('Il codice numerata pu\u00f2 avere al massimo 2 caratteri');
      return;
    }

    try {
      setSaving(true);
      setIdNumerata(normalizedId);
      const data: any = { idNumerata: normalizedId };
      for (let i = 1; i <= 20; i++) {
        const field = `n${String(i).padStart(2, '0')}`;
        data[field] = taglie[field] || null;
      }

      await riparazioniApi.createNumerata(data);
      showSuccess('Numerata creata con successo');
      setShowCreateModal(false);
      setIdNumerata('');
      initializeTaglie();
      await fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore nella creazione');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedNumerata) return;
    const normalizedId = idNumerata.trim().toUpperCase();
    if (!normalizedId) {
      showError('Inserisci il codice numerata (NU)');
      return;
    }
    if (normalizedId.length > 2) {
      showError('Il codice numerata pu\u00f2 avere al massimo 2 caratteri');
      return;
    }

    try {
      setSaving(true);
      setIdNumerata(normalizedId);
      const data: any = { idNumerata: normalizedId };
      for (let i = 1; i <= 20; i++) {
        const field = `n${String(i).padStart(2, '0')}`;
        data[field] = taglie[field] || null;
      }

      await riparazioniApi.updateNumerata(selectedNumerata.id, data);
      showSuccess('Numerata aggiornata con successo');
      setShowEditModal(false);
      setSelectedNumerata(null);
      setIdNumerata('');
      initializeTaglie();
      await fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore nell\'aggiornamento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNumerata) return;

    try {
      await riparazioniApi.deleteNumerata(selectedNumerata.id);
      showSuccess('Numerata eliminata con successo');
      setShowDeleteModal(false);
      setSelectedNumerata(null);
      await fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore nell\'eliminazione');
    }
  };

  const openCreateModal = () => {
    initializeTaglie();
    setIdNumerata('');
    setShowCreateModal(true);
  };

  const openEditModal = (num: Numerata) => {
    setSelectedNumerata(num);
    setIdNumerata(num.idNumerata.toString());
    initializeTaglie(num);
    setShowEditModal(true);
  };

  const openDeleteModal = (num: Numerata) => {
    setSelectedNumerata(num);
    setShowDeleteModal(true);
  };

  const getNumerataPreview = (num: Numerata) => {
    const sizes: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const field = `n${String(i).padStart(2, '0')}` as keyof Numerata;
      const value = num[field];
      if (value) sizes.push(value);
    }
    return sizes.length > 0 ? sizes.join(', ') : 'Nessuna taglia definita';
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
      <PageHeader title="Gestione Numerate" subtitle="Gestisci le numerate (set di taglie)" />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Riparazioni', href: '/riparazioni' },
          { label: 'Numerate' },
        ]}
      />

      {/* Header Actions */}
      <motion.div
        variants={itemVariants}
        className="mb-6 flex justify-end"
      >
        <button
          onClick={openCreateModal}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <i className="fas fa-plus-circle mr-2"></i>
          Nuova Numerata
        </button>
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
                  ID (db)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  ID Numerata (NU)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Taglie
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <AnimatePresence>
                {numerate.map((num, index) => (
                  <motion.tr
                    key={num.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                        #{num.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                        NU {num.idNumerata}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-2xl">
                        {getNumerataPreview(num)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(num)}
                          className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                          title="Modifica"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => openDeleteModal(num)}
                          className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
                          title="Elimina"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {numerate.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-500 dark:text-gray-400"
            >
              <i className="fas fa-ruler text-4xl mb-3 opacity-50"></i>
              <p className="font-medium">Nessuna numerata trovata</p>
              <p className="text-sm mt-1">Crea la prima numerata</p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 my-8"
          >
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nuova Numerata</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Definisci le taglie per la nuova numerata</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Codice Numerata (NU)
              </label>
              <input
                type="text"
                maxLength={2}
                value={idNumerata}
                onChange={(e) => {
                  const val = e.target.value.slice(0, 2);
                  setIdNumerata(val.toUpperCase());
                }}
                placeholder="Es. A1"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <i className="fas fa-ruler mr-2 text-blue-500"></i>
                Taglie (n01 - n20)
              </h4>
              <div className="overflow-x-auto pb-2">
                <div className="inline-grid grid-cols-20 gap-2 min-w-max">
                  {Array.from({ length: 20 }, (_, i) => {
                    const field = `n${String(i + 1).padStart(2, '0')}`;
                    return (
                      <div key={field} className="w-16">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 text-center">
                          {field.toUpperCase()}
                        </label>
                        <input
                          type="text"
                          value={taglie[field] || ''}
                          onChange={(e) => setTaglie(prev => ({ ...prev, [field]: e.target.value }))}
                          placeholder={`${i+1}`}
                          className="w-full px-2 py-2 text-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={saving}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Creazione...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus-circle mr-2"></i>
                    Crea
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedNumerata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 my-8"
          >
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Modifica Numerata</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Modifica NU {selectedNumerata.idNumerata}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Codice Numerata (NU)
              </label>
              <input
                type="text"
                maxLength={2}
                value={idNumerata}
                onChange={(e) => {
                  const val = e.target.value.slice(0, 2);
                  setIdNumerata(val.toUpperCase());
                }}
                placeholder="Es. A1"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <i className="fas fa-ruler mr-2 text-blue-500"></i>
                Taglie (n01 - n20)
              </h4>
              <div className="overflow-x-auto pb-2">
                <div className="inline-grid grid-cols-20 gap-2 min-w-max">
                  {Array.from({ length: 20 }, (_, i) => {
                    const field = `n${String(i + 1).padStart(2, '0')}`;
                    return (
                      <div key={field} className="w-16">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 text-center">
                          {field.toUpperCase()}
                        </label>
                        <input
                          type="text"
                          value={taglie[field] || ''}
                          onChange={(e) => setTaglie(prev => ({ ...prev, [field]: e.target.value }))}
                          placeholder={`${i+1}`}
                          className="w-full px-2 py-2 text-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedNumerata(null);
                }}
                disabled={saving}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Salva
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedNumerata && (
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
                Sei sicuro di voler eliminare la numerata <span className="font-mono font-bold text-blue-600 dark:text-blue-400">NU {selectedNumerata.idNumerata}</span>?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedNumerata(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
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
