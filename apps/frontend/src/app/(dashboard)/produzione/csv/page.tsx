'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';
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

interface CsvRow {
  commessa_csv: string;
  commessa_estratta: string;
  fase: string;
  data: string;
  articolo: string;
  qta: number;
  cliente: string | null;
}

export default function CsvReportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processedData, setProcessedData] = useState<CsvRow[]>([]);
  const [generating, setGenerating] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null);
      setProcessedData([]);
      return;
    }

    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      showError('Il file deve essere in formato CSV');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      showError('Il file non può superare i 10MB');
      return;
    }

    setFile(selectedFile);
    setProcessedData([]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleUpload = async () => {
    if (!file) {
      showError('Seleziona un file CSV');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await produzioneApi.processCsv(formData);

      if (response.success && response.data) {
        setProcessedData(response.data);
        showSuccess(`File elaborato con successo! ${response.count} righe caricate.`);
      } else {
        showError('Errore durante l\'elaborazione del file');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      showError(error.response?.data?.message || 'Errore durante l\'upload del file');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (processedData.length === 0) {
      showError('Nessun dato elaborato. Carica prima un file CSV');
      return;
    }

    setGenerating(true);
    try {
      await produzioneApi.generateCsvReport({ csvData: processedData });
      showSuccess('Il lavoro è stato messo in coda.');
    } catch (error: any) {
      console.error('Error:', error);
      showError(error.response?.data?.message || 'Errore durante la generazione del report');
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setProcessedData([]);
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title="Report CSV Produzione"
        subtitle="Carica e genera report PDF da file CSV produzione"
      />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Produzione", href: "/produzione" },
          { label: "Report CSV" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Card */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden"
          >
            <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-md">
                  <i className="fas fa-upload text-white"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Carica File CSV
                  </h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Seleziona o trascina il file CSV
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Drag & Drop Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
                  dragActive
                    ? 'border-yellow-500 bg-yellow-50 dark:border-yellow-400 dark:bg-yellow-900/20'
                    : 'border-gray-300 bg-gray-50 hover:border-yellow-400 dark:border-gray-700 dark:bg-gray-900/20'
                }`}
              >
                <input
                  type="file"
                  id="csv-file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="hidden"
                />

                {!file ? (
                  <>
                    <div className="mb-4 flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg">
                        <i className="fas fa-file-csv text-2xl text-white"></i>
                      </div>
                    </div>
                    <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Trascina il file CSV qui o clicca per selezionare
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Formato CSV, max 10MB
                    </p>
                    <label
                      htmlFor="csv-file"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:scale-105"
                    >
                      <i className="fas fa-folder-open"></i>
                      Seleziona File
                    </label>
                  </>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                        <i className="fas fa-file-csv text-green-600 dark:text-green-400"></i>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleReset}
                      className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <i className="fas fa-times mr-1"></i>
                      Rimuovi
                    </button>
                  </div>
                )}
              </div>

              {/* Upload Button */}
              {file && processedData.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-3 font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Elaborazione in corso...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-cloud-upload-alt mr-2"></i>
                        Elabora CSV
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Preview Table */}
          {processedData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              variants={itemVariants}
              className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden"
            >
              <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 shadow-md">
                      <i className="fas fa-table text-white"></i>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Anteprima Dati
                      </h2>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {processedData.length} righe elaborate
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateReport}
                    disabled={generating}
                    className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Generazione...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-file-pdf mr-2"></i>
                        Genera PDF
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Commessa CSV
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Cartel
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Fase
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Data
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Articolo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Qta
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Cliente
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {processedData.slice(0, 20).map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-xs text-gray-900 dark:text-gray-100">
                          {row.commessa_csv}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-900 dark:text-gray-100">
                          {row.commessa_estratta || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900 dark:text-gray-100">
                          {row.fase}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900 dark:text-gray-100">
                          {row.data}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900 dark:text-gray-100">
                          {row.articolo}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {row.qta}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                          {row.cliente || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {processedData.length > 20 && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 text-center text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                    Mostrate prime 20 righe di {processedData.length}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Info Card */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-blue-200 bg-blue-50 shadow-lg dark:border-blue-800 dark:bg-blue-900/20 backdrop-blur-sm overflow-hidden"
          >
            <div className="border-b border-blue-100 px-6 py-4 dark:border-blue-700">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 shadow-md">
                  <i className="fas fa-info-circle text-white"></i>
                </div>
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  Formato CSV
                </h3>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Struttura richiesta:
                </p>
                <div className="rounded-lg bg-white dark:bg-gray-900 p-3 font-mono text-xs text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                  Commessa;Fase;Data;Articolo;Qta
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Esempio:
                </p>
                <div className="rounded-lg bg-white dark:bg-gray-900 p-3 space-y-1 border border-blue-200 dark:border-blue-700">
                  <p className="font-mono text-xs text-blue-800 dark:text-blue-200 break-all">
                    2025-40094695-S;04-ORLATURA;05/09/2025 07:44;HE222297Z005--ME;20
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-blue-200 dark:border-blue-700">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Note:
                </h4>
                <ul className="space-y-2 text-xs text-blue-800 dark:text-blue-200">
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-green-500 mt-0.5 flex-shrink-0"></i>
                    <span>Separatore: punto e virgola (;)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-green-500 mt-0.5 flex-shrink-0"></i>
                    <span>Prima riga: intestazione</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-green-500 mt-0.5 flex-shrink-0"></i>
                    <span>Estrazione ultime 5 cifre da commessa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check-circle text-green-500 mt-0.5 flex-shrink-0"></i>
                    <span>Cross-reference con clienti</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Stats Card */}
          {processedData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              variants={itemVariants}
              className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden"
            >
              <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-md">
                    <i className="fas fa-chart-bar text-white"></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Statistiche
                  </h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Totale righe:
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {processedData.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Totale pezzi:
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {processedData.reduce((sum, row) => sum + row.qta, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Fasi uniche:
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {new Set(processedData.map(r => r.fase)).size}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
