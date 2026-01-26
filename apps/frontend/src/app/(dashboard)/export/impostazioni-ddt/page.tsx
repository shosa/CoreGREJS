"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { exportApi } from "@/lib/api";
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

interface AspettoMerce {
  id: number;
  descrizione: string;
  codice?: string;
  attivo: boolean;
  ordine: number;
}

interface Vettore {
  id: number;
  ragioneSociale: string;
  codice?: string;
  indirizzo?: string;
  telefono?: string;
  attivo: boolean;
  ordine: number;
}

type ActiveTab = "aspetto-merce" | "vettori";

export default function ImpostazioniDdtPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("aspetto-merce");

  // Aspetto Merce state
  const [aspettoMerceList, setAspettoMerceList] = useState<AspettoMerce[]>([]);
  const [showAspettoModal, setShowAspettoModal] = useState(false);
  const [editingAspettoId, setEditingAspettoId] = useState<number | null>(null);
  const [aspettoFormData, setAspettoFormData] = useState<Partial<AspettoMerce>>({
    descrizione: "",
    codice: "",
    attivo: true,
    ordine: 0,
  });

  // Vettori state
  const [vettoriList, setVettoriList] = useState<Vettore[]>([]);
  const [showVettoreModal, setShowVettoreModal] = useState(false);
  const [editingVettoreId, setEditingVettoreId] = useState<number | null>(null);
  const [vettoreFormData, setVettoreFormData] = useState<Partial<Vettore>>({
    ragioneSociale: "",
    codice: "",
    indirizzo: "",
    telefono: "",
    attivo: true,
    ordine: 0,
  });

  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchData();
  }, [showInactive]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aspettoData, vettoriData] = await Promise.all([
        exportApi.getAllAspettoMerce(!showInactive),
        exportApi.getAllVettori(!showInactive),
      ]);
      setAspettoMerceList(aspettoData);
      setVettoriList(vettoriData);
    } catch (error) {
      showError("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  // ==================== ASPETTO MERCE HANDLERS ====================

  const handleCreateAspetto = () => {
    setEditingAspettoId(null);
    setAspettoFormData({
      descrizione: "",
      codice: "",
      attivo: true,
      ordine: 0,
    });
    setShowAspettoModal(true);
  };

  const handleEditAspetto = (item: AspettoMerce) => {
    setEditingAspettoId(item.id);
    setAspettoFormData(item);
    setShowAspettoModal(true);
  };

  const handleSaveAspetto = async () => {
    try {
      if (!aspettoFormData.descrizione?.trim()) {
        showError("Descrizione obbligatoria");
        return;
      }

      if (editingAspettoId) {
        await exportApi.updateAspettoMerce(editingAspettoId, aspettoFormData);
        showSuccess("Aspetto merce aggiornato con successo");
      } else {
        await exportApi.createAspettoMerce(aspettoFormData as any);
        showSuccess("Aspetto merce creato con successo");
      }

      setShowAspettoModal(false);
      fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore nel salvataggio");
    }
  };

  const handleDeleteAspetto = async (id: number) => {
    if (!confirm("Sei sicuro di voler eliminare questo aspetto merce?")) return;

    try {
      await exportApi.deleteAspettoMerce(id);
      showSuccess("Aspetto merce eliminato con successo");
      fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore nell'eliminazione");
    }
  };

  // ==================== VETTORI HANDLERS ====================

  const handleCreateVettore = () => {
    setEditingVettoreId(null);
    setVettoreFormData({
      ragioneSociale: "",
      codice: "",
      indirizzo: "",
      telefono: "",
      attivo: true,
      ordine: 0,
    });
    setShowVettoreModal(true);
  };

  const handleEditVettore = (item: Vettore) => {
    setEditingVettoreId(item.id);
    setVettoreFormData(item);
    setShowVettoreModal(true);
  };

  const handleSaveVettore = async () => {
    try {
      if (!vettoreFormData.ragioneSociale?.trim()) {
        showError("Ragione sociale obbligatoria");
        return;
      }

      if (editingVettoreId) {
        await exportApi.updateVettore(editingVettoreId, vettoreFormData);
        showSuccess("Vettore aggiornato con successo");
      } else {
        await exportApi.createVettore(vettoreFormData as any);
        showSuccess("Vettore creato con successo");
      }

      setShowVettoreModal(false);
      fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore nel salvataggio");
    }
  };

  const handleDeleteVettore = async (id: number) => {
    if (!confirm("Sei sicuro di voler eliminare questo vettore?")) return;

    try {
      await exportApi.deleteVettore(id);
      showSuccess("Vettore eliminato con successo");
      fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore nell'eliminazione");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-solid border-orange-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title="Impostazioni DDT"
        subtitle="Gestione aspetto merce e trasportatori"
      />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Export", href: "/export" },
          { label: "Impostazioni DDT" },
        ]}
      />

      {/* Tabs */}
      <motion.div
        variants={itemVariants}
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
      >
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("aspetto-merce")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === "aspetto-merce"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              <i className="fas fa-box mr-2"></i>
              Aspetto Merce ({aspettoMerceList.length})
            </button>
            <button
              onClick={() => setActiveTab("vettori")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === "vettori"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              <i className="fas fa-truck mr-2"></i>
              Vettori ({vettoriList.length})
            </button>
          </div>

          <div className="flex gap-3 items-center">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              Mostra disattivi
            </label>

            {activeTab === "aspetto-merce" ? (
              <button
                onClick={handleCreateAspetto}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                <i className="fas fa-plus mr-2"></i>
                Nuovo Aspetto
              </button>
            ) : (
              <button
                onClick={handleCreateVettore}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                <i className="fas fa-plus mr-2"></i>
                Nuovo Vettore
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden"
      >
        {activeTab === "aspetto-merce" ? (
          /* Aspetto Merce Table */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Descrizione
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Codice
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ordine
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                  {aspettoMerceList.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.descrizione}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {item.codice || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {item.ordine}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.attivo
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {item.attivo ? "Attivo" : "Disattivo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditAspetto(item)}
                            className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                            title="Modifica"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteAspetto(item.id)}
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

            {aspettoMerceList.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <i className="fas fa-box text-4xl mb-3 opacity-50"></i>
                <p>Nessun aspetto merce configurato</p>
                <button
                  onClick={handleCreateAspetto}
                  className="mt-4 text-orange-600 hover:text-orange-700 dark:text-orange-400"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Aggiungi il primo
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Vettori Table */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ragione Sociale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Codice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Indirizzo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Telefono
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                  {vettoriList.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.ragioneSociale}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {item.codice || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {item.indirizzo || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {item.telefono || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.attivo
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {item.attivo ? "Attivo" : "Disattivo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditVettore(item)}
                            className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                            title="Modifica"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteVettore(item.id)}
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

            {vettoriList.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <i className="fas fa-truck text-4xl mb-3 opacity-50"></i>
                <p>Nessun vettore configurato</p>
                <button
                  onClick={handleCreateVettore}
                  className="mt-4 text-orange-600 hover:text-orange-700 dark:text-orange-400"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Aggiungi il primo
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Modal Aspetto Merce */}
      <AnimatePresence>
        {showAspettoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAspettoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingAspettoId ? "Modifica Aspetto Merce" : "Nuovo Aspetto Merce"}
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrizione *
                  </label>
                  <input
                    type="text"
                    value={aspettoFormData.descrizione}
                    onChange={(e) =>
                      setAspettoFormData({
                        ...aspettoFormData,
                        descrizione: e.target.value,
                      })
                    }
                    placeholder="es. Scatole di cartone"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Codice
                    </label>
                    <input
                      type="text"
                      value={aspettoFormData.codice || ""}
                      onChange={(e) =>
                        setAspettoFormData({
                          ...aspettoFormData,
                          codice: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ordine
                    </label>
                    <input
                      type="number"
                      value={aspettoFormData.ordine || 0}
                      onChange={(e) =>
                        setAspettoFormData({
                          ...aspettoFormData,
                          ordine: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={aspettoFormData.attivo}
                    onChange={(e) =>
                      setAspettoFormData({
                        ...aspettoFormData,
                        attivo: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Attivo
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
                <button
                  onClick={() => setShowAspettoModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveAspetto}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  <i className="fas fa-save mr-2"></i>
                  Salva
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Vettore */}
      <AnimatePresence>
        {showVettoreModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowVettoreModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingVettoreId ? "Modifica Vettore" : "Nuovo Vettore"}
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ragione Sociale *
                  </label>
                  <input
                    type="text"
                    value={vettoreFormData.ragioneSociale}
                    onChange={(e) =>
                      setVettoreFormData({
                        ...vettoreFormData,
                        ragioneSociale: e.target.value,
                      })
                    }
                    placeholder="es. Trasporti Rossi S.r.l."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Codice
                    </label>
                    <input
                      type="text"
                      value={vettoreFormData.codice || ""}
                      onChange={(e) =>
                        setVettoreFormData({
                          ...vettoreFormData,
                          codice: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Telefono
                    </label>
                    <input
                      type="text"
                      value={vettoreFormData.telefono || ""}
                      onChange={(e) =>
                        setVettoreFormData({
                          ...vettoreFormData,
                          telefono: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Indirizzo
                  </label>
                  <input
                    type="text"
                    value={vettoreFormData.indirizzo || ""}
                    onChange={(e) =>
                      setVettoreFormData({
                        ...vettoreFormData,
                        indirizzo: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ordine
                    </label>
                    <input
                      type="number"
                      value={vettoreFormData.ordine || 0}
                      onChange={(e) =>
                        setVettoreFormData({
                          ...vettoreFormData,
                          ordine: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={vettoreFormData.attivo}
                        onChange={(e) =>
                          setVettoreFormData({
                            ...vettoreFormData,
                            attivo: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <label className="text-sm text-gray-700 dark:text-gray-300">
                        Attivo
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
                <button
                  onClick={() => setShowVettoreModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveVettore}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  <i className="fas fa-save mr-2"></i>
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
