"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { analiticheApi } from "@/lib/api";
import { showError, showSuccess } from "@/store/notifications";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Reparto {
  id: number;
  nome: string;
  codice: string | null;
  descrizione: string | null;
  attivo: boolean;
  ordine: number;
  costiAssociati: string[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    recordsReparto: number;
    recordsRepartoFinale: number;
  };
}

interface FormData {
  nome: string;
  codice: string;
  descrizione: string;
  attivo: boolean;
  ordine: number;
  costiAssociati: string[];
}

// Definizione dei costi disponibili
const COSTI_DISPONIBILI = [
  { key: "costoTaglio", label: "Taglio", color: "blue" },
  { key: "costoOrlatura", label: "Orlatura", color: "green" },
  { key: "costoStrobel", label: "Strobel", color: "purple" },
  { key: "altriCosti", label: "Altri Costi", color: "orange" },
  { key: "costoMontaggio", label: "Montaggio", color: "red" },
];

const emptyForm: FormData = {
  nome: "",
  codice: "",
  descrizione: "",
  attivo: true,
  ordine: 0,
  costiAssociati: [],
};

export default function RepartiPage() {
  const [loading, setLoading] = useState(true);
  const [reparti, setReparti] = useState<Reparto[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [repartoToDelete, setRepartoToDelete] = useState<Reparto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadReparti();
  }, [showInactive]);

  const loadReparti = async () => {
    try {
      setLoading(true);
      const data = await analiticheApi.getReparti(!showInactive);
      setReparti(data);
    } catch (error) {
      showError("Errore nel caricamento dei reparti");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      ...emptyForm,
      ordine: reparti.length > 0 ? Math.max(...reparti.map(r => r.ordine)) + 1 : 0,
    });
    setShowModal(true);
  };

  const openEditModal = (reparto: Reparto) => {
    setEditingId(reparto.id);
    setFormData({
      nome: reparto.nome,
      codice: reparto.codice || "",
      descrizione: reparto.descrizione || "",
      attivo: reparto.attivo,
      ordine: reparto.ordine,
      costiAssociati: reparto.costiAssociati || [],
    });
    setShowModal(true);
  };

  const toggleCosto = (costoKey: string) => {
    setFormData(prev => ({
      ...prev,
      costiAssociati: prev.costiAssociati.includes(costoKey)
        ? prev.costiAssociati.filter(c => c !== costoKey)
        : [...prev.costiAssociati, costoKey],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      showError("Il nome del reparto è obbligatorio");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        nome: formData.nome.trim(),
        codice: formData.codice.trim() || undefined,
        descrizione: formData.descrizione.trim() || undefined,
        attivo: formData.attivo,
        ordine: formData.ordine,
        costiAssociati: formData.costiAssociati,
      };

      if (editingId) {
        await analiticheApi.updateReparto(editingId, payload);
        showSuccess("Reparto aggiornato con successo");
      } else {
        await analiticheApi.createReparto(payload);
        showSuccess("Reparto creato con successo");
      }

      setShowModal(false);
      loadReparti();
    } catch (error: any) {
      showError(error.message || "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (reparto: Reparto) => {
    const recordCount = (reparto._count?.recordsReparto || 0) + (reparto._count?.recordsRepartoFinale || 0);

    if (recordCount > 0) {
      showError(`Impossibile eliminare: il reparto è associato a ${recordCount} record`);
      return;
    }

    setRepartoToDelete(reparto);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!repartoToDelete) return;

    try {
      setDeleting(true);
      await analiticheApi.deleteReparto(repartoToDelete.id);
      showSuccess("Reparto eliminato con successo");
      setShowDeleteModal(false);
      setRepartoToDelete(null);
      loadReparti();
    } catch (error: any) {
      showError(error.message || "Errore durante l'eliminazione");
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (reparto: Reparto) => {
    try {
      await analiticheApi.updateReparto(reparto.id, { attivo: !reparto.attivo });
      showSuccess(`Reparto ${reparto.attivo ? 'disattivato' : 'attivato'}`);
      loadReparti();
    } catch (error: any) {
      showError(error.message || "Errore durante l'aggiornamento");
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title="Gestione Reparti"
        subtitle="Configura i reparti per l'analisi dei costi"
      />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Analitiche", href: "/analitiche" },
          { label: "Reparti" },
        ]}
      />

      {/* Barra Azioni */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-md hover:shadow-lg transition-all"
          >
            <i className="fas fa-plus mr-2"></i>Nuovo Reparto
          </button>

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Mostra inattivi
          </label>
        </div>

        <span className="text-sm text-gray-600 dark:text-gray-400">
          {reparti.length} reparti
        </span>
      </motion.div>

      {/* Lista Reparti */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent"
            />
          </div>
        ) : reparti.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <i className="fas fa-building text-4xl mb-4 text-gray-300 dark:text-gray-600"></i>
            <p>Nessun reparto configurato</p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              Crea il primo reparto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Ordine</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Codice</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Costi Associati</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Stato</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Record</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {reparti.map((reparto) => {
                  const recordCount = (reparto._count?.recordsReparto || 0) + (reparto._count?.recordsRepartoFinale || 0);

                  return (
                    <tr
                      key={reparto.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${!reparto.attivo ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {reparto.ordine}
                      </td>
                      <td className="px-4 py-3">
                        {reparto.codice ? (
                          <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono text-gray-700 dark:text-gray-300">
                            {reparto.codice}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {reparto.nome}
                        {reparto.descrizione && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-normal truncate max-w-[200px]">{reparto.descrizione}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {reparto.costiAssociati && reparto.costiAssociati.length > 0 ? (
                            reparto.costiAssociati.map((costoKey) => {
                              const costo = COSTI_DISPONIBILI.find(c => c.key === costoKey);
                              if (!costo) return null;
                              return (
                                <span
                                  key={costoKey}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium
                                    ${costo.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                                    ${costo.color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
                                    ${costo.color === 'purple' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : ''}
                                    ${costo.color === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : ''}
                                    ${costo.color === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
                                  `}
                                >
                                  {costo.label}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleActive(reparto)}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            reparto.attivo
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {reparto.attivo ? 'Attivo' : 'Inattivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                        {recordCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-medium">
                            {recordCount.toLocaleString()}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(reparto)}
                            className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                            title="Modifica"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => openDeleteModal(reparto)}
                            disabled={recordCount > 0}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              recordCount > 0
                                ? 'bg-gray-50 text-gray-400 cursor-not-allowed dark:bg-gray-700/20'
                                : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40'
                            }`}
                            title={recordCount > 0 ? 'Non eliminabile (record associati)' : 'Elimina'}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Modal Crea/Modifica */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4"
          >
            <form onSubmit={handleSubmit}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  <i className={`fas fa-${editingId ? 'edit' : 'plus'} mr-2 text-emerald-500`}></i>
                  {editingId ? 'Modifica Reparto' : 'Nuovo Reparto'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="es. Taglio, Orlatura, Montaggio..."
                    required
                  />
                </div>

                {/* Codice */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Codice
                  </label>
                  <input
                    type="text"
                    value={formData.codice}
                    onChange={(e) => setFormData({ ...formData, codice: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-mono"
                    placeholder="es. TAG, ORL, MON..."
                    maxLength={20}
                  />
                </div>

                {/* Descrizione */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrizione
                  </label>
                  <textarea
                    value={formData.descrizione}
                    onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="Descrizione opzionale del reparto..."
                  />
                </div>

                {/* Costi Associati */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Costi Associati
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Seleziona i costi che verranno calcolati per questo reparto nelle statistiche
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {COSTI_DISPONIBILI.map((costo) => (
                      <label
                        key={costo.key}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                          formData.costiAssociati.includes(costo.key)
                            ? `border-${costo.color}-500 bg-${costo.color}-50 dark:bg-${costo.color}-900/20`
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                        style={{
                          borderColor: formData.costiAssociati.includes(costo.key)
                            ? costo.color === 'blue' ? '#3b82f6'
                            : costo.color === 'green' ? '#22c55e'
                            : costo.color === 'purple' ? '#a855f7'
                            : costo.color === 'orange' ? '#f97316'
                            : '#ef4444'
                            : undefined,
                          backgroundColor: formData.costiAssociati.includes(costo.key)
                            ? costo.color === 'blue' ? 'rgba(59, 130, 246, 0.1)'
                            : costo.color === 'green' ? 'rgba(34, 197, 94, 0.1)'
                            : costo.color === 'purple' ? 'rgba(168, 85, 247, 0.1)'
                            : costo.color === 'orange' ? 'rgba(249, 115, 22, 0.1)'
                            : 'rgba(239, 68, 68, 0.1)'
                            : undefined
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.costiAssociati.includes(costo.key)}
                          onChange={() => toggleCosto(costo.key)}
                          className={`h-4 w-4 rounded border-gray-300 focus:ring-2 focus:ring-offset-0`}
                          style={{
                            accentColor: costo.color === 'blue' ? '#3b82f6'
                              : costo.color === 'green' ? '#22c55e'
                              : costo.color === 'purple' ? '#a855f7'
                              : costo.color === 'orange' ? '#f97316'
                              : '#ef4444'
                          }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{costo.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Ordine e Attivo */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ordine
                    </label>
                    <input
                      type="number"
                      value={formData.ordine}
                      onChange={(e) => setFormData({ ...formData, ordine: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      min={0}
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.attivo}
                        onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Attivo
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {saving ? (
                    <span><i className="fas fa-spinner fa-spin mr-2"></i>Salvataggio...</span>
                  ) : (
                    <span><i className="fas fa-check mr-2"></i>{editingId ? 'Aggiorna' : 'Crea'}</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal Conferma Eliminazione */}
      {showDeleteModal && repartoToDelete && (
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
                Sei sicuro di voler eliminare il reparto <span className="font-bold">{repartoToDelete.nome}</span>?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setRepartoToDelete(null);
                }}
                disabled={deleting}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-50"
              >
                {deleting ? (
                  <span><i className="fas fa-spinner fa-spin mr-2"></i>Eliminazione...</span>
                ) : (
                  <span><i className="fas fa-trash mr-2"></i>Elimina</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
