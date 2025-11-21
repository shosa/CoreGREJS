'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { settingsApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

type Section = 'import' | 'general' | 'users' | 'system';
type ImportStep = 'select' | 'analyzing' | 'confirm' | 'importing' | 'completed';

interface ImportAnalysis {
  totalRows: number;
  toInsert: number;
  toUpdate: number;
  toDelete: number;
  preserved: number;
  currentInDb: number;
}

interface ImportProgress {
  total: number;
  processed: number;
  status: string;
  message?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>('import');
  const [importStep, setImportStep] = useState<ImportStep>('select');
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      showError('Seleziona un file Excel (.xlsx)');
      return;
    }

    setSelectedFileName(file.name);
    setImportStep('analyzing');
    setAnalysis(null);
    setImportResult(null);

    try {
      const result = await settingsApi.analyzeExcel(file);
      setAnalysis(result);
      setImportStep('confirm');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore durante l\'analisi');
      setImportStep('select');
    }
  };

  const handleConfirmImport = async () => {
    setImportStep('importing');
    setProgress({ total: analysis?.totalRows || 0, processed: 0, status: 'processing' });

    // Start polling progress
    progressIntervalRef.current = setInterval(async () => {
      try {
        const prog = await settingsApi.getImportProgress();
        setProgress(prog);

        if (prog.status === 'completed' || prog.status === 'error') {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
        }
      } catch (e) {
        // Ignore polling errors
      }
    }, 500);

    try {
      const result = await settingsApi.executeImport();
      setImportResult(result);
      setImportStep('completed');
      showSuccess(result.message || 'Import completato');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore durante l\'import');
      setImportStep('confirm');
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  };

  const handleCancel = async () => {
    try {
      await settingsApi.cancelImport();
    } catch (e) {
      // Ignore
    }
    setImportStep('select');
    setAnalysis(null);
    setSelectedFileName('');
    setImportResult(null);
    setProgress(null);
  };

  const handleNewImport = () => {
    setImportStep('select');
    setAnalysis(null);
    setSelectedFileName('');
    setImportResult(null);
    setProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const sections = [
    { id: 'import' as Section, label: 'Import Dati', icon: 'fa-file-import', color: 'blue' },
    { id: 'general' as Section, label: 'Generali', icon: 'fa-cog', color: 'gray', disabled: true },
    { id: 'users' as Section, label: 'Utenti', icon: 'fa-users', color: 'purple', disabled: true },
    { id: 'system' as Section, label: 'Sistema', icon: 'fa-server', color: 'green', disabled: true },
  ];

  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      <PageHeader
        title="Impostazioni"
        subtitle="Configurazione e gestione del sistema"
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Impostazioni' },
        ]}
      />

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <motion.div variants={itemVariants} className="w-64 flex-shrink-0">
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-sliders-h text-blue-500"></i>
                Sezioni
              </h3>
            </div>
            <nav className="p-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => !section.disabled && setActiveSection(section.id)}
                  disabled={section.disabled}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition mb-1 ${
                    activeSection === section.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                      : section.disabled
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <i className={`fas ${section.icon} w-5`}></i>
                  <span>{section.label}</span>
                  {section.disabled && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500">
                      Soon
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div variants={itemVariants} className="flex-1">
          {activeSection === 'import' && (
            <div className="space-y-6">
              {/* Import Card */}
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg">
                      <i className="fas fa-file-excel text-white text-2xl"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Import Dati Produzione
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Carica file Excel (.xlsx) con i dati dei cartellini
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Step 1: Select File */}
                  {importStep === 'select' && (
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                      onDragLeave={() => setDragActive(false)}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                        dragActive
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        className="hidden"
                      />
                      <div className="mx-auto h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                        <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 dark:text-gray-500"></i>
                      </div>
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Trascina qui il file Excel
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        oppure clicca per selezionare
                      </p>
                      <span className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
                        Formati supportati: .xlsx
                      </span>
                    </div>
                  )}

                  {/* Step 2: Analyzing */}
                  {importStep === 'analyzing' && (
                    <div className="text-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="mx-auto h-16 w-16 rounded-full border-4 border-blue-500 border-t-transparent mb-4"
                      />
                      <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
                        Analisi in corso...
                      </p>
                      <p className="text-sm text-gray-500 mt-2">{selectedFileName}</p>
                    </div>
                  )}

                  {/* Step 3: Confirm */}
                  {importStep === 'confirm' && analysis && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <i className="fas fa-file-excel text-blue-500 text-2xl"></i>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedFileName}</p>
                          <p className="text-sm text-gray-500">{analysis.totalRows.toLocaleString()} righe nel file</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center border border-green-200 dark:border-green-800">
                          <div className="text-3xl font-bold text-green-600">{analysis.toInsert.toLocaleString()}</div>
                          <div className="text-sm text-green-700 dark:text-green-400 mt-1">
                            <i className="fas fa-plus-circle mr-1"></i>Da inserire
                          </div>
                        </div>
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center border border-yellow-200 dark:border-yellow-800">
                          <div className="text-3xl font-bold text-yellow-600">{analysis.toUpdate.toLocaleString()}</div>
                          <div className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                            <i className="fas fa-sync-alt mr-1"></i>Da aggiornare
                          </div>
                        </div>
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center border border-red-200 dark:border-red-800">
                          <div className="text-3xl font-bold text-red-600">{analysis.toDelete.toLocaleString()}</div>
                          <div className="text-sm text-red-700 dark:text-red-400 mt-1">
                            <i className="fas fa-trash-alt mr-1"></i>Da eliminare
                          </div>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center border border-purple-200 dark:border-purple-800">
                          <div className="text-3xl font-bold text-purple-600">{analysis.preserved.toLocaleString()}</div>
                          <div className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                            <i className="fas fa-shield-alt mr-1"></i>Preservati
                          </div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center border border-gray-200 dark:border-gray-600">
                          <div className="text-3xl font-bold text-gray-600 dark:text-gray-300">{analysis.currentInDb.toLocaleString()}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            <i className="fas fa-database mr-1"></i>Attualmente in DB
                          </div>
                        </div>
                      </div>

                      {analysis.preserved > 0 && (
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                          <div className="flex items-start gap-3">
                            <i className="fas fa-info-circle text-purple-500 mt-0.5"></i>
                            <p className="text-sm text-purple-700 dark:text-purple-300">
                              <strong>{analysis.preserved} cartellini</strong> sono collegati a lotti nel tracking e verranno preservati (solo aggiornati se presenti nel file).
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4 pt-4">
                        <button
                          onClick={handleCancel}
                          className="flex-1 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
                        >
                          <i className="fas fa-times mr-2"></i>Annulla
                        </button>
                        <button
                          onClick={handleConfirmImport}
                          className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition font-medium shadow-lg"
                        >
                          <i className="fas fa-check mr-2"></i>Conferma Import
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Importing */}
                  {importStep === 'importing' && (
                    <div className="space-y-6 py-8">
                      <div className="text-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="mx-auto h-16 w-16 rounded-full border-4 border-blue-500 border-t-transparent mb-4"
                        />
                        <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
                          Importazione in corso...
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Progresso</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {progress?.processed.toLocaleString()} / {progress?.total.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-center text-2xl font-bold text-blue-600">{progressPercent}%</p>
                      </div>
                    </div>
                  )}

                  {/* Step 5: Completed */}
                  {importStep === 'completed' && importResult && (
                    <div className="space-y-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="mx-auto h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
                      >
                        <i className="fas fa-check text-4xl text-green-500"></i>
                      </motion.div>

                      <div className="text-center">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          Import Completato!
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400">{importResult.message}</p>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{importResult.stats?.inserted || 0}</div>
                          <div className="text-xs text-gray-500">Inseriti</div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">{importResult.stats?.updated || 0}</div>
                          <div className="text-xs text-gray-500">Aggiornati</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{importResult.stats?.preserved || 0}</div>
                          <div className="text-xs text-gray-500">Preservati</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">{importResult.stats?.deleted || 0}</div>
                          <div className="text-xs text-gray-500">Eliminati</div>
                        </div>
                      </div>

                      <button
                        onClick={handleNewImport}
                        className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition font-medium shadow-lg"
                      >
                        <i className="fas fa-redo mr-2"></i>Nuovo Import
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Card */}
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <i className="fas fa-info-circle text-blue-500"></i>
                  Informazioni sull'Import
                </h4>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <p className="flex items-start gap-2">
                    <i className="fas fa-check text-green-500 mt-1"></i>
                    <span>Il file Excel deve contenere le colonne nell'ordine corretto (St, Ordine, Rg, CCli, Ragione Sociale, Cartel, ...)</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="fas fa-shield-alt text-purple-500 mt-1"></i>
                    <span>I cartellini gia collegati a lotti (track_links) vengono preservati e aggiornati</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="fas fa-exclamation-triangle text-yellow-500 mt-1"></i>
                    <span>I cartellini non collegati vengono eliminati e sostituiti con i nuovi dati</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="fas fa-search text-blue-500 mt-1"></i>
                    <span>Prima dell'import viene mostrata un'anteprima delle modifiche per conferma</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder for other sections */}
          {activeSection !== 'import' && (
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-12 text-center">
              <div className="mx-auto h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <i className="fas fa-tools text-4xl text-gray-400 dark:text-gray-500"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Sezione in sviluppo
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Questa sezione sara disponibile a breve
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
