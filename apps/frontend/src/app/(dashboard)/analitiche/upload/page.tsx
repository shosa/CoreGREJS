"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { analiticheApi } from "@/lib/api";
import { showError, showSuccess } from "@/store/notifications";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface PreviewData {
  headers: string[];
  sampleRows: any[][];
  totalRows: number;
  mappedColumns: Record<string, string>;
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (isValidExcelFile(droppedFile)) {
        handleFileSelect(droppedFile);
      } else {
        showError("Seleziona un file Excel valido (.xlsx, .xls)");
      }
    }
  }, []);

  const isValidExcelFile = (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    const validExtensions = [".xlsx", ".xls"];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    return validTypes.includes(file.type) || validExtensions.includes(extension);
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);

    try {
      const previewData = await analiticheApi.previewExcel(selectedFile);
      setPreview(previewData);
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore nella lettura del file");
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (isValidExcelFile(selectedFile)) {
        handleFileSelect(selectedFile);
      } else {
        showError("Seleziona un file Excel valido (.xlsx, .xls)");
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const result = await analiticheApi.uploadExcel(file);
      showSuccess(`Import completato: ${result.recordsCount} record importati`);
      router.push("/analitiche/records");
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore durante l'importazione");
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setPreview(null);
  };

  // Campi che verranno mappati
  const expectedFields = [
    { key: "tipoDocumento", label: "Tipo Documento" },
    { key: "dataDocumento", label: "Data Documento" },
    { key: "linea", label: "Descrizione Linea" },
    { key: "articolo", label: "Articolo" },
    { key: "descrizioneArt", label: "Descrizione Articolo" },
    { key: "tipologiaOrdine", label: "Tipologia Ordine" },
    { key: "quantita", label: "Quantità" },
    { key: "prezzoUnitario", label: "Prezzo Unitario" },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title="Carica Dati Excel"
        subtitle="Importa dati dall'ERP tramite file Excel"
      />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Analitiche", href: "/analitiche" },
          { label: "Carica Dati" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonna sinistra - Upload */}
        <div className="lg:col-span-2">
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
          >
            {!file ? (
              <>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Seleziona File Excel
                </h3>

                {/* Dropzone */}
                <div
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                    dragActive
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-gray-300 hover:border-emerald-400 dark:border-gray-700 dark:hover:border-emerald-600"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />

                  <div className="flex flex-col items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg mb-4">
                      <i className="fas fa-file-excel text-white text-2xl"></i>
                    </div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Trascina qui il file Excel
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      oppure clicca per selezionare
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      Formati supportati: .xlsx, .xls
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* File selezionato */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    File Selezionato
                  </h3>
                  <button
                    onClick={resetUpload}
                    className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <i className="fas fa-times mr-1"></i> Annulla
                  </button>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md">
                    <i className="fas fa-file-excel text-white"></i>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  {loading && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent"
                    />
                  )}
                </div>

                {/* Preview dati */}
                {preview && (
                  <>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {preview.totalRows.toLocaleString()}
                        </span>{" "}
                        righe trovate nel file
                      </p>
                    </div>

                    {/* Tabella preview */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            {preview.headers.slice(0, 10).map((header, i) => (
                              <th
                                key={i}
                                className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
                              >
                                {header || `Col ${i + 1}`}
                                {preview.mappedColumns[header] && (
                                  <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                                    {preview.mappedColumns[header]}
                                  </span>
                                )}
                              </th>
                            ))}
                            {preview.headers.length > 10 && (
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400">
                                +{preview.headers.length - 10} colonne
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800/50">
                          {preview.sampleRows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {row.slice(0, 10).map((cell, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[150px] truncate"
                                >
                                  {cell?.toString() || "-"}
                                </td>
                              ))}
                              {row.length > 10 && (
                                <td className="px-3 py-2 text-xs text-gray-400">
                                  ...
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pulsante upload */}
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="h-5 w-5 rounded-full border-2 border-white border-t-transparent"
                          />
                          Importazione in corso...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-upload"></i>
                          Importa {preview.totalRows.toLocaleString()} Record
                        </>
                      )}
                    </button>
                  </>
                )}
              </>
            )}
          </motion.div>
        </div>

        {/* Colonna destra - Info */}
        <div className="space-y-6">
          {/* Campi mappati */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              <i className="fas fa-columns mr-2 text-emerald-500"></i>
              Campi Importati
            </h3>
            <div className="space-y-2">
              {expectedFields.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {field.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Campi aggiuntivi */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              <i className="fas fa-plus-circle mr-2 text-blue-500"></i>
              Campi Aggiuntivi
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Questi campi potranno essere compilati manualmente dopo l'importazione:
            </p>
            <div className="space-y-2">
              {[
                "Prodotto Estero/Italia",
                "Reparto (se Italia)",
                "Reparto Finale",
                "Costo Taglio",
                "Costo Orlatura",
                "Costo Strobel",
                "Altri Costi",
                "Costo Montaggio",
              ].map((field) => (
                <div
                  key={field}
                  className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {field}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Formato atteso */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-lg dark:border-amber-800 dark:bg-amber-900/20 backdrop-blur-sm"
          >
            <h3 className="text-lg font-bold text-amber-800 dark:text-amber-300 mb-2">
              <i className="fas fa-info-circle mr-2"></i>
              Formato Atteso
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Il file Excel deve contenere le colonne standard dell'export ERP.
              Il sistema rileverà automaticamente le colonne corrette.
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
