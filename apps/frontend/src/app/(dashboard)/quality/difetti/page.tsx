"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { qualityApi } from "@/lib/api";
import { showSuccess, showError } from "@/store/notifications";

type DefectType = {
  id: number;
  descrizione: string;
  categoria: string | null;
  attivo: boolean;
  ordine: number;
  dataCreazione: string;
};

const CATEGORIE = [
  "CUCITURE",
  "MATERIALE",
  "FINITURE",
  "ESTETICO",
  "FUNZIONALE",
  "STRUTTURALE",
  "DIMENSIONALE",
];

export default function DifettiPage() {
  const [loading, setLoading] = useState(true);
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDefect, setEditingDefect] = useState<DefectType | null>(null);
  const [formData, setFormData] = useState({
    descrizione: "",
    categoria: "",
    attivo: true,
    ordine: 0,
  });

  useEffect(() => {
    fetchDefectTypes();
  }, []);

  const fetchDefectTypes = async () => {
    try {
      setLoading(true);
      const data = await qualityApi.getDefectTypes();
      setDefectTypes(data);
    } catch (error) {
      showError("Errore nel caricamento dei tipi difetto");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (defect?: DefectType) => {
    if (defect) {
      setEditingDefect(defect);
      setFormData({
        descrizione: defect.descrizione,
        categoria: defect.categoria || "",
        attivo: defect.attivo,
        ordine: defect.ordine,
      });
    } else {
      setEditingDefect(null);
      setFormData({
        descrizione: "",
        categoria: "",
        attivo: true,
        ordine: 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDefect(null);
    setFormData({
      descrizione: "",
      categoria: "",
      attivo: true,
      ordine: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        categoria: formData.categoria || null,
      };

      if (editingDefect) {
        await qualityApi.updateDefectType(editingDefect.id, data);
        showSuccess("Tipo difetto aggiornato con successo");
      } else {
        await qualityApi.createDefectType(data);
        showSuccess("Tipo difetto creato con successo");
      }
      handleCloseModal();
      fetchDefectTypes();
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore durante il salvataggio");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Sei sicuro di voler eliminare questo tipo difetto?")) return;

    try {
      await qualityApi.deleteDefectType(id);
      showSuccess("Tipo difetto eliminato con successo");
      fetchDefectTypes();
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore durante l'eliminazione");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-solid border-primary border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestione Tipi Difetti"
        description="Configura le tipologie di difetti per il controllo qualità"
      />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Controllo Qualità", href: "/quality" },
          { label: "Tipi Difetti" },
        ]}
      />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Elenco Tipi Difetti
          </h2>
          <button
            onClick={() => handleOpenModal()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            + Nuovo Tipo Difetto
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Descrizione
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Ordine
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Stato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Data Creazione
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {defectTypes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    Nessun tipo difetto trovato
                  </td>
                </tr>
              ) : (
                defectTypes.map((defect) => (
                  <tr
                    key={defect.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {defect.descrizione}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {defect.categoria ? (
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {defect.categoria}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {defect.ordine}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          defect.attivo
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {defect.attivo ? "Attivo" : "Inattivo"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(defect.dataCreazione).toLocaleDateString("it-IT")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(defect)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
                          title="Modifica tipo difetto"
                        >
                          <i className="fas fa-edit text-sm"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(defect.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                          title="Elimina tipo difetto"
                        >
                          <i className="fas fa-trash text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800"
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              {editingDefect ? "Modifica Tipo Difetto" : "Nuovo Tipo Difetto"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descrizione *
                </label>
                <input
                  type="text"
                  value={formData.descrizione}
                  onChange={(e) =>
                    setFormData({ ...formData, descrizione: e.target.value })
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Es: Cucitura irregolare"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Categoria
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) =>
                    setFormData({ ...formData, categoria: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">-- Seleziona categoria --</option>
                  {CATEGORIE.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ordine
                </label>
                <input
                  type="number"
                  value={formData.ordine}
                  onChange={(e) =>
                    setFormData({ ...formData, ordine: parseInt(e.target.value) })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="attivo"
                  checked={formData.attivo}
                  onChange={(e) =>
                    setFormData({ ...formData, attivo: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600"
                />
                <label
                  htmlFor="attivo"
                  className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Tipo Difetto Attivo
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  {editingDefect ? "Aggiorna" : "Crea"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
