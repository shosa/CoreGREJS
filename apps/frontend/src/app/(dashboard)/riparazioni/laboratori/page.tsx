'use client';

import { useEffect, useState } from 'react';
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

interface Laboratorio {
  id: number;
  nome: string;
  attivo: boolean;
}

export default function LaboratoriPage() {
  const [loading, setLoading] = useState(true);
  const [laboratori, setLaboratori] = useState<Laboratorio[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLaboratorio, setSelectedLaboratorio] = useState<Laboratorio | null>(null);

  // Form
  const [nome, setNome] = useState('');
  const [attivo, setAttivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await riparazioniApi.getLaboratori();
      setLaboratori(data);
    } catch (error) {
      showError('Errore nel caricamento dei laboratori');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!nome.trim()) {
      showError('Inserisci un nome');
      return;
    }

    try {
      setSaving(true);
      await riparazioniApi.createLaboratorio({ nome, attivo });
      showSuccess('Laboratorio creato con successo');
      setShowCreateModal(false);
      setNome('');
      setAttivo(true);
      await fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore nella creazione');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedLaboratorio || !nome.trim()) return;

    try {
      setSaving(true);
      await riparazioniApi.updateLaboratorio(selectedLaboratorio.id, { nome, attivo });
      showSuccess('Laboratorio aggiornato con successo');
      setShowEditModal(false);
      setSelectedLaboratorio(null);
      setNome('');
      setAttivo(true);
      await fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore nell\'aggiornamento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLaboratorio) return;

    try {
      await riparazioniApi.deleteLaboratorio(selectedLaboratorio.id);
      showSuccess('Laboratorio eliminato con successo');
      setShowDeleteModal(false);
      setSelectedLaboratorio(null);
      await fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore nell\'eliminazione');
    }
  };

  const openEditModal = (lab: Laboratorio) => {
    setSelectedLaboratorio(lab);
    setNome(lab.nome);
    setAttivo(lab.attivo);
    setShowEditModal(true);
  };

  const openDeleteModal = (lab: Laboratorio) => {
    setSelectedLaboratorio(lab);
    setShowDeleteModal(true);
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
      <PageHeader title="Gestione Laboratori" subtitle="Gestisci i laboratori di destinazione" />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Riparazioni', href: '/riparazioni' },
          { label: 'Laboratori' },
        ]}
      />

      {/* Header Actions */}
      <motion.div
        variants={itemVariants}
        className="mb-6 flex justify-end"
      >
        <button
          onClick={() => {
            setNome('');
            setAttivo(true);
            setShowCreateModal(true);
          }}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <i className="fas fa-plus-circle mr-2"></i>
          Nuovo Laboratorio
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
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Nome
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
                {laboratori.map((lab, index) => (
                  <motion.tr
                    key={lab.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                        {lab.id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {lab.nome}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          lab.attivo
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {lab.attivo ? 'Attivo' : 'Inattivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(lab)}
                          className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                          title="Modifica"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => openDeleteModal(lab)}
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

          {laboratori.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-500 dark:text-gray-400"
            >
              <i className="fas fa-flask text-4xl mb-3 opacity-50"></i>
              <p className="font-medium">Nessun laboratorio trovato</p>
              <p className="text-sm mt-1">Crea il primo laboratorio</p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nuovo Laboratorio</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Crea un nuovo laboratorio</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome laboratorio..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="attivo-create"
                  checked={attivo}
                  onChange={(e) => setAttivo(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="attivo-create" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Attivo
                </label>
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
                disabled={saving || !nome.trim()}
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
      {showEditModal && selectedLaboratorio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Modifica Laboratorio</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Modifica {selectedLaboratorio.nome}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome laboratorio..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="attivo-edit"
                  checked={attivo}
                  onChange={(e) => setAttivo(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="attivo-edit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Attivo
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedLaboratorio(null);
                }}
                disabled={saving}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleEdit}
                disabled={saving || !nome.trim()}
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
      {showDeleteModal && selectedLaboratorio && (
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
                Sei sicuro di voler eliminare il laboratorio <span className="font-bold">{selectedLaboratorio.nome}</span>?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedLaboratorio(null);
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
