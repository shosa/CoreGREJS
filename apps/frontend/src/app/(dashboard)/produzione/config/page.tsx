'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { produzioneApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Available colors for phases
const AVAILABLE_COLORS = [
  { value: 'blue', label: 'Blu', class: 'bg-blue-500' },
  { value: 'green', label: 'Verde', class: 'bg-green-500' },
  { value: 'purple', label: 'Viola', class: 'bg-purple-500' },
  { value: 'orange', label: 'Arancione', class: 'bg-orange-500' },
  { value: 'red', label: 'Rosso', class: 'bg-red-500' },
];

// Available icons
const AVAILABLE_ICONS = [
  { value: 'fa-industry', label: 'Industria' },
  { value: 'fa-cog', label: 'Ingranaggio' },
  { value: 'fa-cut', label: 'Taglio' },
  { value: 'fa-hammer', label: 'Martello' },
  { value: 'fa-tools', label: 'Attrezzi' },
  { value: 'fa-wrench', label: 'Chiave' },
  { value: 'fa-cogs', label: 'Ingranaggi' },
  { value: 'fa-box', label: 'Scatola' },
];

export default function ProduzioneConfigPage() {
  const [loading, setLoading] = useState(true);
  const [phases, setPhases] = useState<any[]>([]);
  const [editingPhase, setEditingPhase] = useState<any>(null);
  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);

  // Form states
  const [phaseForm, setPhaseForm] = useState({
    nome: '',
    codice: '',
    colore: 'blue',
    icona: 'fa-cog',
    descrizione: '',
    ordine: 0,
  });

  const [departmentForm, setDepartmentForm] = useState({
    nome: '',
    codice: '',
    descrizione: '',
    ordine: 0,
  });

  useEffect(() => {
    fetchPhases();
  }, []);

  const fetchPhases = async () => {
    try {
      setLoading(true);
      const data = await produzioneApi.getPhases();
      setPhases(data);
    } catch (error) {
      showError('Errore nel caricamento delle fasi');
    } finally {
      setLoading(false);
    }
  };

  // Phase handlers
  const handleAddPhase = () => {
    setEditingPhase(null);
    setPhaseForm({
      nome: '',
      codice: '',
      colore: 'blue',
      icona: 'fa-cog',
      descrizione: '',
      ordine: phases.length,
    });
    setShowPhaseModal(true);
  };

  const handleEditPhase = (phase: any) => {
    setEditingPhase(phase);
    setPhaseForm({
      nome: phase.nome,
      codice: phase.codice || '',
      colore: phase.colore || 'blue',
      icona: phase.icona || 'fa-cog',
      descrizione: phase.descrizione || '',
      ordine: phase.ordine || 0,
    });
    setShowPhaseModal(true);
  };

  const handleSavePhase = async () => {
    try {
      if (editingPhase) {
        await produzioneApi.updatePhase(editingPhase.id, phaseForm);
        showSuccess('Fase aggiornata con successo');
      } else {
        await produzioneApi.createPhase(phaseForm);
        showSuccess('Fase creata con successo');
      }
      setShowPhaseModal(false);
      fetchPhases();
    } catch (error) {
      showError('Errore nel salvataggio della fase');
    }
  };

  const handleDeletePhase = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa fase? Verranno eliminati anche tutti i reparti associati.')) {
      return;
    }
    try {
      await produzioneApi.deletePhase(id);
      showSuccess('Fase eliminata con successo');
      fetchPhases();
    } catch (error) {
      showError('Errore nell\'eliminazione della fase');
    }
  };

  // Department handlers
  const handleAddDepartment = (phaseId: number) => {
    setSelectedPhaseId(phaseId);
    setEditingDepartment(null);
    const phase = phases.find(p => p.id === phaseId);
    setDepartmentForm({
      nome: '',
      codice: '',
      descrizione: '',
      ordine: phase?.reparti?.length || 0,
    });
    setShowDepartmentModal(true);
  };

  const handleEditDepartment = (department: any, phaseId: number) => {
    setSelectedPhaseId(phaseId);
    setEditingDepartment(department);
    setDepartmentForm({
      nome: department.nome,
      codice: department.codice || '',
      descrizione: department.descrizione || '',
      ordine: department.ordine || 0,
    });
    setShowDepartmentModal(true);
  };

  const handleSaveDepartment = async () => {
    try {
      const data = { ...departmentForm, phaseId: selectedPhaseId };
      if (editingDepartment) {
        await produzioneApi.updateDepartment(editingDepartment.id, data);
        showSuccess('Reparto aggiornato con successo');
      } else {
        await produzioneApi.createDepartment(data);
        showSuccess('Reparto creato con successo');
      }
      setShowDepartmentModal(false);
      fetchPhases();
    } catch (error) {
      showError('Errore nel salvataggio del reparto');
    }
  };

  const handleDeleteDepartment = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo reparto?')) {
      return;
    }
    try {
      await produzioneApi.deleteDepartment(id);
      showSuccess('Reparto eliminato con successo');
      fetchPhases();
    } catch (error) {
      showError('Errore nell\'eliminazione del reparto');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-orange-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Configurazione Produzione
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Gestisci fasi e reparti di produzione
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <motion.button
              onClick={handleAddPhase}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-medium text-white hover:from-orange-600 hover:to-orange-700 shadow-md"
            >
              <i className="fas fa-plus mr-2"></i>
              Nuova Fase
            </motion.button>
            <Link href="/produzione">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Calendario
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Breadcrumb */}
      <motion.nav variants={itemVariants} className="flex mb-8">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li>
            <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400">
              <i className="fas fa-home mr-2"></i>Dashboard
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <i className="fas fa-chevron-right text-gray-400 mx-2"></i>
              <Link href="/produzione" className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400">
                Produzione
              </Link>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <i className="fas fa-chevron-right text-gray-400 mx-2"></i>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Configurazione</span>
            </div>
          </li>
        </ol>
      </motion.nav>

      {/* Phases List */}
      <div className="space-y-6">
        {phases.length === 0 ? (
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <i className="fas fa-folder-open text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-500 dark:text-gray-400">
              Nessuna fase configurata. Clicca su "Nuova Fase" per iniziare.
            </p>
          </motion.div>
        ) : (
          phases.map((phase) => (
            <motion.div
              key={phase.id}
              variants={itemVariants}
              className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 overflow-hidden"
            >
              {/* Phase Header */}
              <div className={`p-4 bg-${phase.colore || 'blue'}-50 dark:bg-${phase.colore || 'blue'}-900/20 border-b border-gray-200 dark:border-gray-700`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-lg bg-${phase.colore || 'blue'}-500 flex items-center justify-center text-white mr-3`}>
                      <i className={`fas ${phase.icona || 'fa-cog'}`}></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {phase.nome}
                      </h3>
                      {phase.codice && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Codice: {phase.codice}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleAddDepartment(phase.id)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg dark:text-green-400 dark:hover:bg-green-900/30"
                      title="Aggiungi reparto"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                    <button
                      onClick={() => handleEditPhase(phase)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg dark:text-blue-400 dark:hover:bg-blue-900/30"
                      title="Modifica fase"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDeletePhase(phase.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg dark:text-red-400 dark:hover:bg-red-900/30"
                      title="Elimina fase"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Departments List */}
              <div className="p-4">
                {phase.reparti && phase.reparti.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {phase.reparti.map((dept: any) => (
                      <div
                        key={dept.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {dept.nome}
                          </span>
                          {dept.codice && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              ({dept.codice})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleEditDepartment(dept, phase.id)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded dark:text-blue-400 dark:hover:bg-blue-900/30"
                          >
                            <i className="fas fa-edit text-xs"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteDepartment(dept.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded dark:text-red-400 dark:hover:bg-red-900/30"
                          >
                            <i className="fas fa-trash text-xs"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                    Nessun reparto. Clicca + per aggiungerne uno.
                  </p>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Phase Modal */}
      <AnimatePresence>
        {showPhaseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowPhaseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingPhase ? 'Modifica Fase' : 'Nuova Fase'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={phaseForm.nome}
                    onChange={(e) => setPhaseForm({ ...phaseForm, nome: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Es: Montaggio"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Codice
                  </label>
                  <input
                    type="text"
                    value={phaseForm.codice}
                    onChange={(e) => setPhaseForm({ ...phaseForm, codice: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Es: MONT"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Colore
                  </label>
                  <div className="flex space-x-2">
                    {AVAILABLE_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setPhaseForm({ ...phaseForm, colore: color.value })}
                        className={`w-8 h-8 rounded-lg ${color.class} ${
                          phaseForm.colore === color.value ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white' : ''
                        }`}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Icona
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {AVAILABLE_ICONS.map((icon) => (
                      <button
                        key={icon.value}
                        onClick={() => setPhaseForm({ ...phaseForm, icona: icon.value })}
                        className={`p-2 rounded-lg border ${
                          phaseForm.icona === icon.value
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        title={icon.label}
                      >
                        <i className={`fas ${icon.value} text-gray-700 dark:text-gray-300`}></i>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ordine
                  </label>
                  <input
                    type="number"
                    value={phaseForm.ordine}
                    onChange={(e) => setPhaseForm({ ...phaseForm, ordine: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPhaseModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSavePhase}
                  disabled={!phaseForm.nome}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salva
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Department Modal */}
      <AnimatePresence>
        {showDepartmentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowDepartmentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingDepartment ? 'Modifica Reparto' : 'Nuovo Reparto'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={departmentForm.nome}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, nome: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Es: Manovia 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Codice
                  </label>
                  <input
                    type="text"
                    value={departmentForm.codice}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, codice: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Es: MAN1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ordine
                  </label>
                  <input
                    type="number"
                    value={departmentForm.ordine}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, ordine: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowDepartmentModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveDepartment}
                  disabled={!departmentForm.nome}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salva
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
