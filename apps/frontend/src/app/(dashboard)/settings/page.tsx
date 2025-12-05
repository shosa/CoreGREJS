'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { settingsApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';
import { useModulesStore } from '@/store/modules';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

type Section = 'import' | 'modules' | 'general' | 'users' | 'system';
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

const moduleConfigs: Record<string, {
  label: string;
  description: string;
  icon: string;
  borderColor: string;
  bgColor: string;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
  toggleBg: string;
}> = {
  riparazioni: {
    label: 'Riparazioni',
    description: 'Gestione riparazioni interne ed esterne',
    icon: 'fa-hammer',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconBg: 'bg-blue-500',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/30',
    badgeText: 'text-blue-700 dark:text-blue-300',
    toggleBg: 'bg-blue-500',
  },
  produzione: {
    label: 'Produzione',
    description: 'Monitoraggio produzione giornaliera',
    icon: 'fa-industry',
    borderColor: 'border-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    iconBg: 'bg-green-500',
    badgeBg: 'bg-green-100 dark:bg-green-900/30',
    badgeText: 'text-green-700 dark:text-green-300',
    toggleBg: 'bg-green-500',
  },
  qualita: {
    label: 'Controllo Qualità',
    description: 'Controllo qualità e difetti',
    icon: 'fa-clipboard-check',
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    iconBg: 'bg-yellow-500',
    badgeBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    badgeText: 'text-yellow-700 dark:text-yellow-300',
    toggleBg: 'bg-yellow-500',
  },
  export: {
    label: 'Export/DDT',
    description: 'Gestione DDT e export documenti',
    icon: 'fa-file-export',
    borderColor: 'border-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    iconBg: 'bg-indigo-500',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    toggleBg: 'bg-indigo-500',
  },
  scm_admin: {
    label: 'SCM',
    description: 'Gestione subfornitori e lanci',
    icon: 'fa-truck',
    borderColor: 'border-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    iconBg: 'bg-orange-500',
    badgeBg: 'bg-orange-100 dark:bg-orange-900/30',
    badgeText: 'text-orange-700 dark:text-orange-300',
    toggleBg: 'bg-orange-500',
  },
  tracking: {
    label: 'Tracking',
    description: 'Tracciabilità cartellini e lotti',
    icon: 'fa-barcode',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    iconBg: 'bg-purple-500',
    badgeBg: 'bg-purple-100 dark:bg-purple-900/30',
    badgeText: 'text-purple-700 dark:text-purple-300',
    toggleBg: 'bg-purple-500',
  },
  mrp: {
    label: 'MRP',
    description: 'Material Requirements Planning',
    icon: 'fa-boxes',
    borderColor: 'border-teal-500',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    iconBg: 'bg-teal-500',
    badgeBg: 'bg-teal-100 dark:bg-teal-900/30',
    badgeText: 'text-teal-700 dark:text-teal-300',
    toggleBg: 'bg-teal-500',
  },
  users: {
    label: 'Utenti',
    description: 'Gestione utenti e permessi',
    icon: 'fa-users',
    borderColor: 'border-pink-500',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    iconBg: 'bg-pink-500',
    badgeBg: 'bg-pink-100 dark:bg-pink-900/30',
    badgeText: 'text-pink-700 dark:text-pink-300',
    toggleBg: 'bg-pink-500',
  },
  settings: {
    label: 'Impostazioni',
    description: 'Configurazione sistema',
    icon: 'fa-cog',
    borderColor: 'border-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    iconBg: 'bg-gray-500',
    badgeBg: 'bg-gray-100 dark:bg-gray-900/30',
    badgeText: 'text-gray-700 dark:text-gray-300',
    toggleBg: 'bg-gray-500',
  },
  log: {
    label: 'Log Attività',
    description: 'Registro attività sistema',
    icon: 'fa-history',
    borderColor: 'border-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    iconBg: 'bg-cyan-500',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    toggleBg: 'bg-cyan-500',
  },
  dbsql: {
    label: 'Database SQL',
    description: 'Query e gestione database',
    icon: 'fa-database',
    borderColor: 'border-slate-500',
    bgColor: 'bg-slate-50 dark:bg-slate-900/20',
    iconBg: 'bg-slate-500',
    badgeBg: 'bg-slate-100 dark:bg-slate-900/30',
    badgeText: 'text-slate-700 dark:text-slate-300',
    toggleBg: 'bg-slate-500',
  },
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

  // Modules state
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesSaving, setModulesSaving] = useState(false);
  const { clearCache: clearModulesCache } = useModulesStore();

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Load modules when switching to modules section
  useEffect(() => {
    if (activeSection === 'modules') {
      loadModules();
    }
  }, [activeSection]);

  const loadModules = async () => {
    setModulesLoading(true);
    try {
      const data = await settingsApi.getActiveModules();
      setModules(data);
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore caricamento moduli');
    } finally {
      setModulesLoading(false);
    }
  };

  const handleModuleToggle = async (moduleName: string, enabled: boolean) => {
    const oldModules = { ...modules };
    setModules({ ...modules, [moduleName]: enabled });

    try {
      await settingsApi.updateModuleStatus(moduleName, enabled);
      // Invalida cache moduli per ricaricare sidebar
      clearModulesCache();
      showSuccess(`Modulo ${moduleName} ${enabled ? 'attivato' : 'disattivato'}`);
    } catch (error: any) {
      setModules(oldModules);
      showError(error.response?.data?.message || 'Errore aggiornamento modulo');
    }
  };

  const handleEnableAll = async () => {
    setModulesSaving(true);
    const allEnabled = Object.keys(modules).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);

    try {
      await settingsApi.updateMultipleModules(allEnabled);
      setModules(allEnabled);
      // Invalida cache moduli per ricaricare sidebar
      clearModulesCache();
      showSuccess('Tutti i moduli attivati');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore attivazione moduli');
    } finally {
      setModulesSaving(false);
    }
  };

  const handleDisableAll = async () => {
    setModulesSaving(true);
    const allDisabled = Object.keys(modules).reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {} as Record<string, boolean>);

    try {
      await settingsApi.updateMultipleModules(allDisabled);
      setModules(allDisabled);
      // Invalida cache moduli per ricaricare sidebar
      clearModulesCache();
      showSuccess('Tutti i moduli disattivati');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore disattivazione moduli');
    } finally {
      setModulesSaving(false);
    }
  };

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
    { id: 'modules' as Section, label: 'Moduli Attivi', icon: 'fa-puzzle-piece', color: 'purple' },
    { id: 'general' as Section, label: 'Generali', icon: 'fa-cog', color: 'gray', disabled: true },
    { id: 'users' as Section, label: 'Utenti', icon: 'fa-users', color: 'orange', disabled: true },
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

          {/* Modules Section */}
          {activeSection === 'modules' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 shadow-lg">
                        <i className="fas fa-puzzle-piece text-white text-2xl"></i>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          Gestione Moduli Sistema
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Attiva o disattiva i moduli disponibili
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleEnableAll}
                        disabled={modulesSaving}
                        className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-50 text-sm font-medium"
                      >
                        <i className="fas fa-check-double mr-2"></i>Attiva Tutti
                      </button>
                      <button
                        onClick={handleDisableAll}
                        disabled={modulesSaving}
                        className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50 text-sm font-medium"
                      >
                        <i className="fas fa-times mr-2"></i>Disattiva Tutti
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {modulesLoading ? (
                    <div className="text-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="mx-auto h-16 w-16 rounded-full border-4 border-purple-500 border-t-transparent mb-4"
                      />
                      <p className="text-lg font-medium text-purple-600 dark:text-purple-400">
                        Caricamento moduli...
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(moduleConfigs).map(([key, config]) => {
                        const isEnabled = modules[key] || false;
                        return (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              isEnabled
                                ? `${config.borderColor} ${config.bgColor}`
                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${
                                    isEnabled
                                      ? config.iconBg
                                      : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                                  }`}
                                >
                                  <i className={`fas ${config.icon}`}></i>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900 dark:text-white">
                                    {config.label}
                                  </h4>
                                  <p className="text-xs text-gray-500">{config.description}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  isEnabled
                                    ? `${config.badgeBg} ${config.badgeText}`
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}
                              >
                                {isEnabled ? 'Attivo' : 'Disattivato'}
                              </span>
                              <button
                                onClick={() => handleModuleToggle(key, !isEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                  isEnabled
                                    ? config.toggleBg
                                    : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Info Card */}
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <i className="fas fa-info-circle text-purple-500"></i>
                  Informazioni sui Moduli
                </h4>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <p className="flex items-start gap-2">
                    <i className="fas fa-shield-alt text-purple-500 mt-1"></i>
                    <span>Solo gli amministratori possono gestire l'attivazione dei moduli</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="fas fa-eye-slash text-blue-500 mt-1"></i>
                    <span>I moduli disattivati non saranno visibili nella sidebar</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="fas fa-users text-green-500 mt-1"></i>
                    <span>Gli utenti non potranno accedere ai moduli disattivati anche se hanno i permessi</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="fas fa-sync-alt text-yellow-500 mt-1"></i>
                    <span>Le modifiche sono immediate e non richiedono riavvio del sistema</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder for other sections */}
          {activeSection !== 'import' && activeSection !== 'modules' && (
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
