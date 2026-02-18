'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { settingsApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';
import { useModulesStore } from '@/store/modules';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

type Section = 'import' | 'modules' | 'smtp' | 'produzione' | 'general' | 'security' | 'export-defaults' | 'quality' | 'system' | 'changelog';
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
  category: 'FUNZIONI' | 'FRAMEWORK' | 'STRUMENTI';
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
    category: 'FUNZIONI',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconBg: 'bg-blue-500',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/30',
    badgeText: 'text-blue-700 dark:text-blue-300',
    toggleBg: 'bg-blue-500',
  },
  qualita: {
    label: 'Controllo Qualità',
    description: 'Sistema controllo e verifica qualità prodotti',
    icon: 'fa-check-circle',
    category: 'FUNZIONI',
    borderColor: 'border-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    iconBg: 'bg-green-500',
    badgeBg: 'bg-green-100 dark:bg-green-900/30',
    badgeText: 'text-green-700 dark:text-green-300',
    toggleBg: 'bg-green-500',
  },
  produzione: {
    label: 'Produzione',
    description: 'Pianificazione e gestione produzione',
    icon: 'fa-calendar',
    category: 'FUNZIONI',
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    iconBg: 'bg-yellow-500',
    badgeBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    badgeText: 'text-yellow-700 dark:text-yellow-300',
    toggleBg: 'bg-yellow-500',
  },
  export: {
    label: 'Export/DDT',
    description: 'Gestione esportazioni e documentazione DDT',
    icon: 'fa-globe-europe',
    category: 'FUNZIONI',
    borderColor: 'border-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    iconBg: 'bg-indigo-500',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    toggleBg: 'bg-indigo-500',
  },
  scm_admin: {
    label: 'SCM',
    description: 'Supply Chain Management e lanci produzione',
    icon: 'fa-network-wired',
    category: 'FUNZIONI',
    borderColor: 'border-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    iconBg: 'bg-orange-500',
    badgeBg: 'bg-orange-100 dark:bg-orange-900/30',
    badgeText: 'text-orange-700 dark:text-orange-300',
    toggleBg: 'bg-orange-500',
  },
  analitiche: {
    label: 'Analitiche',
    description: 'Analisi dati, import Excel e statistiche',
    icon: 'fa-chart-bar',
    category: 'FUNZIONI',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    iconBg: 'bg-purple-500',
    badgeBg: 'bg-purple-100 dark:bg-purple-900/30',
    badgeText: 'text-purple-700 dark:text-purple-300',
    toggleBg: 'bg-purple-500',
  },
  tracking: {
    label: 'Tracking',
    description: 'Tracciabilità materiali e movimentazioni',
    icon: 'fa-map-marker-alt',
    category: 'FUNZIONI',
    borderColor: 'border-pink-500',
    bgColor: 'bg-pink-50 dark:bg-rose-900/20',
    iconBg: 'bg-pink-500',
    badgeBg: 'bg-pink-100 dark:bg-pink-900/30',
    badgeText: 'text-pink-700 dark:text-pink-300',
    toggleBg: 'bg-pink-500',
  },
  dbsql: {
    label: 'Gestione Dati',
    description: 'Accesso database, query SQL e migrazioni',
    icon: 'fa-database',
    category: 'FRAMEWORK',
    borderColor: 'border-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    iconBg: 'bg-cyan-500',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    toggleBg: 'bg-cyan-500',
  },
  log: {
    label: 'Log Attività',
    description: 'Visualizzazione audit log e attività sistema',
    icon: 'fa-history',
    category: 'FRAMEWORK',
    borderColor: 'border-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    iconBg: 'bg-cyan-500',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    toggleBg: 'bg-cyan-500',
  },
  inwork: {
    label: 'InWork',
    description: 'Sistema gestione operatori e permessi mobile',
    icon: 'fa-mobile',
    category: 'FRAMEWORK',
    borderColor: 'border-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    iconBg: 'bg-cyan-500',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    toggleBg: 'bg-cyan-500',
  },
  'file-manager': {
    label: 'File Manager',
    description: 'Gestione file MinIO e storage sistema',
    icon: 'fa-folder-open',
    category: 'FRAMEWORK',
    borderColor: 'border-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    iconBg: 'bg-cyan-500',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    toggleBg: 'bg-cyan-500',
  },
  users: {
    label: 'Utenti',
    description: 'Creazione, modifica e gestione utenti sistema',
    icon: 'fa-users',
    category: 'STRUMENTI',
    borderColor: 'border-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    iconBg: 'bg-gray-500',
    badgeBg: 'bg-gray-100 dark:bg-gray-900/30',
    badgeText: 'text-gray-700 dark:text-gray-300',
    toggleBg: 'bg-gray-500',
  },
  settings: {
    label: 'Impostazioni',
    description: 'Configurazione sistema e import dati',
    icon: 'fa-cog',
    category: 'STRUMENTI',
    borderColor: 'border-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    iconBg: 'bg-gray-500',
    badgeBg: 'bg-gray-100 dark:bg-gray-900/30',
    badgeText: 'text-gray-700 dark:text-gray-300',
    toggleBg: 'bg-gray-500',
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
  const lastNotificationRef = useRef<{ key: string; time: number } | null>(null);

  // Modules state
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesSaving, setModulesSaving] = useState(false);
  const { clearCache: clearModulesCache } = useModulesStore();

  // SMTP state
  const [smtpConfig, setSmtpConfig] = useState({ host: '', port: 587, secure: false });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);

  // Produzione email state
  const [produzioneEmails, setProduzioneEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsSaving, setEmailsSaving] = useState(false);

  // General state
  const [generalConfig, setGeneralConfig] = useState<Record<string, string>>({});
  const [generalLoading, setGeneralLoading] = useState(false);
  const [generalSaving, setGeneralSaving] = useState(false);

  // Security state
  const [securityConfig, setSecurityConfig] = useState<Record<string, any>>({});
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);

  // Export defaults state
  const [exportDefaults, setExportDefaults] = useState<Record<string, string>>({});
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSaving, setExportSaving] = useState(false);

  // Quality state
  const [qualityConfig, setQualityConfig] = useState<Record<string, number>>({});
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualitySaving, setQualitySaving] = useState(false);

  // System state
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [cacheFlushing, setCacheFlushing] = useState(false);

  // Changelog state
  const [changelog, setChangelog] = useState<any>(null);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [changelogPage, setChangelogPage] = useState(1);

  // SMTP test state
  const [smtpTesting, setSmtpTesting] = useState(false);

  // Backup state
  const [backupImporting, setBackupImporting] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Load data when switching sections
  useEffect(() => {
    if (activeSection === 'modules') {
      loadModules();
    } else if (activeSection === 'smtp') {
      loadSmtpConfig();
    } else if (activeSection === 'produzione') {
      loadProduzioneEmails();
    } else if (activeSection === 'general') {
      loadGeneralConfig();
    } else if (activeSection === 'security') {
      loadSecurityConfig();
    } else if (activeSection === 'export-defaults') {
      loadExportDefaults();
    } else if (activeSection === 'quality') {
      loadQualityConfig();
    } else if (activeSection === 'system') {
      loadSystemInfo();
    } else if (activeSection === 'changelog') {
      loadChangelog(1);
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

      // Evita notifiche duplicate (debounce di 500ms)
      const notificationKey = `${moduleName}-${enabled}`;
      const now = Date.now();
      if (
        !lastNotificationRef.current ||
        lastNotificationRef.current.key !== notificationKey ||
        now - lastNotificationRef.current.time > 500
      ) {
        lastNotificationRef.current = { key: notificationKey, time: now };
        showSuccess(`Modulo ${moduleName} ${enabled ? 'attivato' : 'disattivato'}`);
      }
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

  const loadSmtpConfig = async () => {
    setSmtpLoading(true);
    try {
      const config = await settingsApi.getSmtpConfig();
      setSmtpConfig(config);
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore caricamento configurazione SMTP');
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleSaveSmtp = async () => {
    setSmtpSaving(true);
    try {
      await settingsApi.updateSmtpConfig(smtpConfig);
      showSuccess('Configurazione SMTP salvata');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore salvataggio SMTP');
    } finally {
      setSmtpSaving(false);
    }
  };

  const loadProduzioneEmails = async () => {
    setEmailsLoading(true);
    try {
      const emails = await settingsApi.getProduzioneEmails();
      setProduzioneEmails(emails);
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore caricamento email produzione');
    } finally {
      setEmailsLoading(false);
    }
  };

  const handleAddEmail = () => {
    if (!newEmail || !newEmail.includes('@')) {
      showError('Inserisci un indirizzo email valido');
      return;
    }
    if (produzioneEmails.includes(newEmail)) {
      showError('Email già presente nella lista');
      return;
    }
    setProduzioneEmails([...produzioneEmails, newEmail]);
    setNewEmail('');
  };

  const handleRemoveEmail = (email: string) => {
    setProduzioneEmails(produzioneEmails.filter(e => e !== email));
  };

  const handleSaveEmails = async () => {
    setEmailsSaving(true);
    try {
      await settingsApi.updateProduzioneEmails(produzioneEmails);
      showSuccess('Indirizzi email salvati');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore salvataggio email');
    } finally {
      setEmailsSaving(false);
    }
  };

  // ==================== GENERALI ====================
  const loadGeneralConfig = async () => {
    setGeneralLoading(true);
    try {
      const data = await settingsApi.getGeneralConfig();
      setGeneralConfig(data);
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore caricamento impostazioni generali');
    } finally {
      setGeneralLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    setGeneralSaving(true);
    try {
      await settingsApi.updateGeneralConfig(generalConfig);
      showSuccess('Impostazioni generali salvate');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore salvataggio');
    } finally {
      setGeneralSaving(false);
    }
  };

  // ==================== SICUREZZA ====================
  const loadSecurityConfig = async () => {
    setSecurityLoading(true);
    try {
      const data = await settingsApi.getSecurityConfig();
      setSecurityConfig(data);
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore caricamento sicurezza');
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleSaveSecurity = async () => {
    setSecuritySaving(true);
    try {
      await settingsApi.updateSecurityConfig(securityConfig);
      showSuccess('Impostazioni sicurezza salvate');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore salvataggio');
    } finally {
      setSecuritySaving(false);
    }
  };

  // ==================== EXPORT DEFAULTS ====================
  const loadExportDefaults = async () => {
    setExportLoading(true);
    try {
      const data = await settingsApi.getExportDefaults();
      setExportDefaults(data);
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore caricamento valori export');
    } finally {
      setExportLoading(false);
    }
  };

  const handleSaveExportDefaults = async () => {
    setExportSaving(true);
    try {
      await settingsApi.updateExportDefaults(exportDefaults);
      showSuccess('Valori default export salvati');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore salvataggio');
    } finally {
      setExportSaving(false);
    }
  };

  // ==================== QUALITA ====================
  const loadQualityConfig = async () => {
    setQualityLoading(true);
    try {
      const data = await settingsApi.getQualityThresholds();
      setQualityConfig(data);
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore caricamento soglie qualità');
    } finally {
      setQualityLoading(false);
    }
  };

  const handleSaveQuality = async () => {
    setQualitySaving(true);
    try {
      await settingsApi.updateQualityThresholds(qualityConfig);
      showSuccess('Soglie qualità salvate');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore salvataggio');
    } finally {
      setQualitySaving(false);
    }
  };

  // ==================== SMTP TEST ====================
  const handleTestSmtp = async () => {
    setSmtpTesting(true);
    try {
      const result = await settingsApi.testSmtp('');
      if (result.success) {
        showSuccess(result.message);
      } else {
        showError(result.message);
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore test SMTP');
    } finally {
      setSmtpTesting(false);
    }
  };

  // ==================== SYSTEM ====================
  const loadSystemInfo = async () => {
    setSystemLoading(true);
    try {
      const data = await settingsApi.getSystemInfo();
      setSystemInfo(data);
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore caricamento info sistema');
    } finally {
      setSystemLoading(false);
    }
  };

  const handleFlushCache = async () => {
    setCacheFlushing(true);
    try {
      const result = await settingsApi.flushCache();
      showSuccess(`Cache svuotata: ${result.deleted} chiavi rimosse`);
      loadSystemInfo();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore svuotamento cache');
    } finally {
      setCacheFlushing(false);
    }
  };

  // ==================== BACKUP ====================
  const handleExportBackup = async () => {
    try {
      const data = await settingsApi.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Backup esportato');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore esportazione');
    }
  };

  const handleImportBackup = async (file: File) => {
    setBackupImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await settingsApi.importBackup(data);
      showSuccess(`Importate ${result.imported} impostazioni (${result.skipped} saltate)`);
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore importazione backup');
    } finally {
      setBackupImporting(false);
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  // ==================== CHANGELOG ====================
  const loadChangelog = async (page: number) => {
    setChangelogLoading(true);
    setChangelogPage(page);
    try {
      const data = await settingsApi.getChangelog(page);
      setChangelog(data);
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore caricamento cronologia');
    } finally {
      setChangelogLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}g ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
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
    { id: 'general' as Section, label: 'Generali', icon: 'fa-building', color: 'gray' },
    { id: 'smtp' as Section, label: 'Server Email (SMTP)', icon: 'fa-server', color: 'green' },
    { id: 'produzione' as Section, label: 'Email Produzione', icon: 'fa-envelope', color: 'orange' },
    { id: 'security' as Section, label: 'Sicurezza', icon: 'fa-shield-alt', color: 'red' },
    { id: 'export-defaults' as Section, label: 'Default Export', icon: 'fa-globe-europe', color: 'indigo' },
    { id: 'quality' as Section, label: 'Soglie Qualità', icon: 'fa-check-circle', color: 'green' },
    { id: 'system' as Section, label: 'Sistema', icon: 'fa-microchip', color: 'cyan' },
    { id: 'changelog' as Section, label: 'Cronologia', icon: 'fa-history', color: 'yellow' },
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
                    <div className="space-y-8">
                      {(['FUNZIONI', 'FRAMEWORK', 'STRUMENTI'] as const).map((category) => {
                        const categoryModules = Object.entries(moduleConfigs).filter(
                          ([_, config]) => config.category === category
                        );

                        if (categoryModules.length === 0) return null;

                        return (
                          <div key={category}>
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                              <i className={`fas ${
                                category === 'FUNZIONI' ? 'fa-puzzle-piece' :
                                category === 'FRAMEWORK' ? 'fa-layer-group' :
                                'fa-tools'
                              } text-purple-500`}></i>
                              {category}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {categoryModules.map(([key, config]) => {
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
                          </div>
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

          {/* SMTP Section */}
          {activeSection === 'smtp' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg">
                      <i className="fas fa-server text-white text-2xl"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Configurazione Server Email (SMTP)
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Configura il server SMTP per l'invio delle email
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {smtpLoading ? (
                    <div className="text-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="mx-auto h-16 w-16 rounded-full border-4 border-green-500 border-t-transparent mb-4"
                      />
                      <p className="text-lg font-medium text-green-600 dark:text-green-400">
                        Caricamento configurazione...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Host SMTP *
                        </label>
                        <input
                          type="text"
                          value={smtpConfig.host}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                          placeholder="smtp.gmail.com"
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Porta *
                          </label>
                          <input
                            type="number"
                            value={smtpConfig.port}
                            onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) || 587 })}
                            placeholder="587"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div className="flex items-center">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={smtpConfig.secure}
                              onChange={(e) => setSmtpConfig({ ...smtpConfig, secure: e.target.checked })}
                              className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                              Usa SSL/TLS (porta 465)
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                        <div className="flex items-start gap-3">
                          <i className="fas fa-info-circle text-blue-500 mt-1"></i>
                          <div className="text-sm text-blue-800 dark:text-blue-300">
                            <p className="font-medium mb-1">Credenziali Email Utente</p>
                            <p>Le credenziali email (indirizzo e password) vengono configurate nel profilo di ogni utente. Ogni utente utilizzerà le proprie credenziali per inviare email utilizzando questo server SMTP condiviso.</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={handleSaveSmtp}
                          disabled={smtpSaving}
                          className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition font-medium shadow-lg disabled:opacity-50"
                        >
                          {smtpSaving ? (
                            <><i className="fas fa-spinner fa-spin mr-2"></i>Salvataggio...</>
                          ) : (
                            <><i className="fas fa-save mr-2"></i>Salva Configurazione</>
                          )}
                        </button>
                        <button
                          onClick={handleTestSmtp}
                          disabled={smtpTesting || !smtpConfig.host}
                          className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition font-medium shadow-lg disabled:opacity-50"
                        >
                          {smtpTesting ? (
                            <><i className="fas fa-spinner fa-spin mr-2"></i>Test...</>
                          ) : (
                            <><i className="fas fa-plug mr-2"></i>Test Connessione</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Card */}
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <i className="fas fa-info-circle text-green-500"></i>
                  Informazioni SMTP
                </h4>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <p className="flex items-start gap-2">
                    <i className="fas fa-check text-green-500 mt-1"></i>
                    <span>Per Gmail usa smtp.gmail.com porta 587</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="fas fa-check text-green-500 mt-1"></i>
                    <span>Per Outlook/Office365 usa smtp.office365.com porta 587</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="fas fa-user text-blue-500 mt-1"></i>
                    <span>Ogni utente deve configurare le proprie credenziali email nel proprio profilo</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="fas fa-lock text-yellow-500 mt-1"></i>
                    <span>Le credenziali vengono salvate in modo sicuro nel database</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Produzione Email Section */}
          {activeSection === 'produzione' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 shadow-lg">
                      <i className="fas fa-envelope text-white text-2xl"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Destinatari Email Produzione
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Configura gli indirizzi email che riceveranno le cedole di produzione
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {emailsLoading ? (
                    <div className="text-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="mx-auto h-16 w-16 rounded-full border-4 border-orange-500 border-t-transparent mb-4"
                      />
                      <p className="text-lg font-medium text-orange-600 dark:text-orange-400">
                        Caricamento indirizzi...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                          placeholder="indirizzo@email.com"
                          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                          onClick={handleAddEmail}
                          className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition font-medium"
                        >
                          <i className="fas fa-plus mr-2"></i>Aggiungi
                        </button>
                      </div>

                      {produzioneEmails.length > 0 ? (
                        <div className="space-y-2">
                          {produzioneEmails.map((email, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <span className="text-gray-900 dark:text-white flex items-center">
                                <i className="fas fa-envelope text-orange-500 mr-3"></i>
                                {email}
                              </span>
                              <button
                                onClick={() => handleRemoveEmail(email)}
                                className="text-red-500 hover:text-red-700 transition"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <i className="fas fa-inbox text-4xl mb-2"></i>
                          <p>Nessun indirizzo configurato</p>
                        </div>
                      )}

                      {produzioneEmails.length > 0 && (
                        <button
                          onClick={handleSaveEmails}
                          disabled={emailsSaving}
                          className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700 transition font-medium shadow-lg disabled:opacity-50"
                        >
                          {emailsSaving ? (
                            <><i className="fas fa-spinner fa-spin mr-2"></i>Salvataggio...</>
                          ) : (
                            <><i className="fas fa-save mr-2"></i>Salva Indirizzi</>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Info Card */}
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <i className="fas fa-info-circle text-orange-500"></i>
                  Informazioni Email Produzione
                </h4>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <p className="flex items-start gap-2">
                    <i className="fas fa-paper-plane text-orange-500 mt-1"></i>
                    <span>Questi indirizzi riceveranno automaticamente le cedole di produzione quando inviate</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="fas fa-user text-blue-500 mt-1"></i>
                    <span>L'email del mittente sarà quella dell'utente che invia la cedola</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="fas fa-cog text-purple-500 mt-1"></i>
                    <span>Assicurati di aver configurato correttamente il server SMTP</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== GENERALI ==================== */}
          {activeSection === 'general' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-900/20">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-gray-600 to-slate-700 shadow-lg">
                      <i className="fas fa-building text-white text-2xl"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Impostazioni Generali</h3>
                      <p className="text-gray-600 dark:text-gray-400">Dati azienda, formato e preferenze sistema</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {generalLoading ? (
                    <div className="text-center py-12">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="mx-auto h-16 w-16 rounded-full border-4 border-gray-500 border-t-transparent mb-4" />
                      <p className="text-lg font-medium text-gray-600">Caricamento...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome Azienda</label>
                          <input type="text" value={generalConfig['general.nomeAzienda'] || ''} onChange={(e) => setGeneralConfig({ ...generalConfig, 'general.nomeAzienda': e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Partita IVA</label>
                          <input type="text" value={generalConfig['general.partitaIva'] || ''} onChange={(e) => setGeneralConfig({ ...generalConfig, 'general.partitaIva': e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Indirizzo</label>
                        <input type="text" value={generalConfig['general.indirizzo'] || ''} onChange={(e) => setGeneralConfig({ ...generalConfig, 'general.indirizzo': e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Città</label>
                          <input type="text" value={generalConfig['general.citta'] || ''} onChange={(e) => setGeneralConfig({ ...generalConfig, 'general.citta': e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CAP</label>
                          <input type="text" value={generalConfig['general.cap'] || ''} onChange={(e) => setGeneralConfig({ ...generalConfig, 'general.cap': e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Provincia</label>
                          <input type="text" value={generalConfig['general.provincia'] || ''} onChange={(e) => setGeneralConfig({ ...generalConfig, 'general.provincia': e.target.value })} maxLength={2} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Telefono</label>
                          <input type="text" value={generalConfig['general.telefono'] || ''} onChange={(e) => setGeneralConfig({ ...generalConfig, 'general.telefono': e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                          <input type="email" value={generalConfig['general.email'] || ''} onChange={(e) => setGeneralConfig({ ...generalConfig, 'general.email': e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Valuta</label>
                          <select value={generalConfig['general.valuta'] || 'EUR'} onChange={(e) => setGeneralConfig({ ...generalConfig, 'general.valuta': e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500">
                            <option value="EUR">EUR (€)</option>
                            <option value="USD">USD ($)</option>
                            <option value="GBP">GBP (£)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Formato Data</label>
                          <select value={generalConfig['general.formatoData'] || 'DD/MM/YYYY'} onChange={(e) => setGeneralConfig({ ...generalConfig, 'general.formatoData': e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500">
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timezone</label>
                          <select value={generalConfig['general.timezone'] || 'Europe/Rome'} onChange={(e) => setGeneralConfig({ ...generalConfig, 'general.timezone': e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500">
                            <option value="Europe/Rome">Europe/Rome</option>
                            <option value="Europe/London">Europe/London</option>
                            <option value="America/New_York">America/New_York</option>
                            <option value="UTC">UTC</option>
                          </select>
                        </div>
                      </div>
                      <button onClick={handleSaveGeneral} disabled={generalSaving} className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-gray-600 to-slate-700 text-white hover:from-gray-700 hover:to-slate-800 transition font-medium shadow-lg disabled:opacity-50">
                        {generalSaving ? <><i className="fas fa-spinner fa-spin mr-2"></i>Salvataggio...</> : <><i className="fas fa-save mr-2"></i>Salva Impostazioni</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Backup/Ripristino */}
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <i className="fas fa-database text-gray-500"></i>
                  Backup / Ripristino Impostazioni
                </h4>
                <div className="flex gap-3">
                  <button onClick={handleExportBackup} className="flex-1 px-4 py-3 rounded-lg border-2 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition font-medium">
                    <i className="fas fa-download mr-2"></i>Esporta Backup
                  </button>
                  <button onClick={() => backupInputRef.current?.click()} disabled={backupImporting} className="flex-1 px-4 py-3 rounded-lg border-2 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition font-medium disabled:opacity-50">
                    {backupImporting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Importazione...</> : <><i className="fas fa-upload mr-2"></i>Importa Backup</>}
                  </button>
                  <input ref={backupInputRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportBackup(f); }} />
                </div>
              </div>
            </div>
          )}

          {/* ==================== SICUREZZA ==================== */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-rose-600 shadow-lg">
                      <i className="fas fa-shield-alt text-white text-2xl"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sicurezza</h3>
                      <p className="text-gray-600 dark:text-gray-400">Policy password, sessione e accesso</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {securityLoading ? (
                    <div className="text-center py-12">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="mx-auto h-16 w-16 rounded-full border-4 border-red-500 border-t-transparent mb-4" />
                      <p className="text-lg font-medium text-red-600">Caricamento...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                          <i className="fas fa-key text-red-500"></i> Policy Password
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lunghezza Minima</label>
                            <input type="number" min={4} max={32} value={securityConfig.passwordMinLength || 8} onChange={(e) => setSecurityConfig({ ...securityConfig, passwordMinLength: parseInt(e.target.value) || 8 })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
                          </div>
                          <div className="flex flex-col gap-3 justify-center">
                            <label className="flex items-center cursor-pointer">
                              <input type="checkbox" checked={securityConfig.passwordRequireUppercase || false} onChange={(e) => setSecurityConfig({ ...securityConfig, passwordRequireUppercase: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Richiedi maiuscola</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input type="checkbox" checked={securityConfig.passwordRequireNumber || false} onChange={(e) => setSecurityConfig({ ...securityConfig, passwordRequireNumber: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Richiedi numero</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input type="checkbox" checked={securityConfig.passwordRequireSpecial || false} onChange={(e) => setSecurityConfig({ ...securityConfig, passwordRequireSpecial: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Richiedi carattere speciale</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <hr className="border-gray-200 dark:border-gray-700" />

                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                          <i className="fas fa-clock text-red-500"></i> Sessione e Accesso
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timeout Sessione (minuti)</label>
                            <input type="number" min={5} max={1440} value={securityConfig.sessionTimeoutMinutes || 480} onChange={(e) => setSecurityConfig({ ...securityConfig, sessionTimeoutMinutes: parseInt(e.target.value) || 480 })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Tentativi Login</label>
                            <input type="number" min={1} max={20} value={securityConfig.maxLoginAttempts || 5} onChange={(e) => setSecurityConfig({ ...securityConfig, maxLoginAttempts: parseInt(e.target.value) || 5 })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Blocco Account (minuti)</label>
                            <input type="number" min={1} max={1440} value={securityConfig.lockoutDurationMinutes || 15} onChange={(e) => setSecurityConfig({ ...securityConfig, lockoutDurationMinutes: parseInt(e.target.value) || 15 })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
                          </div>
                        </div>
                      </div>

                      <button onClick={handleSaveSecurity} disabled={securitySaving} className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 transition font-medium shadow-lg disabled:opacity-50">
                        {securitySaving ? <><i className="fas fa-spinner fa-spin mr-2"></i>Salvataggio...</> : <><i className="fas fa-save mr-2"></i>Salva Impostazioni Sicurezza</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== EXPORT DEFAULTS ==================== */}
          {activeSection === 'export-defaults' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg">
                      <i className="fas fa-globe-europe text-white text-2xl"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Valori Default Export/DDT</h3>
                      <p className="text-gray-600 dark:text-gray-400">Precompila automaticamente i campi dei nuovi documenti</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {exportLoading ? (
                    <div className="text-center py-12">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="mx-auto h-16 w-16 rounded-full border-4 border-indigo-500 border-t-transparent mb-4" />
                      <p className="text-lg font-medium text-indigo-600">Caricamento...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trasporto Default</label>
                          <input type="text" value={exportDefaults.trasportoDefault || ''} onChange={(e) => setExportDefaults({ ...exportDefaults, trasportoDefault: e.target.value })} placeholder="Es: Mittente, Destinatario, Vettore" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Causale Default</label>
                          <input type="text" value={exportDefaults.causaleDefault || ''} onChange={(e) => setExportDefaults({ ...exportDefaults, causaleDefault: e.target.value })} placeholder="Es: Conto lavorazione, Vendita" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aspetto Esteriore</label>
                          <input type="text" value={exportDefaults.aspettoEsteriore || ''} onChange={(e) => setExportDefaults({ ...exportDefaults, aspettoEsteriore: e.target.value })} placeholder="Es: Scatole, Sacchi" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Porto</label>
                          <input type="text" value={exportDefaults.porto || ''} onChange={(e) => setExportDefaults({ ...exportDefaults, porto: e.target.value })} placeholder="Es: Franco, Assegnato" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Valuta Default</label>
                          <select value={exportDefaults.valuta || 'EUR'} onChange={(e) => setExportDefaults({ ...exportDefaults, valuta: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="EUR">EUR (€)</option>
                            <option value="USD">USD ($)</option>
                            <option value="GBP">GBP (£)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Terzista Predefinito</label>
                          <input type="text" value={exportDefaults.terzistaPredefinito || ''} onChange={(e) => setExportDefaults({ ...exportDefaults, terzistaPredefinito: e.target.value })} placeholder="Nome terzista" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note Default</label>
                        <textarea value={exportDefaults.noteDefault || ''} onChange={(e) => setExportDefaults({ ...exportDefaults, noteDefault: e.target.value })} rows={3} placeholder="Note che verranno inserite automaticamente nei nuovi documenti" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <button onClick={handleSaveExportDefaults} disabled={exportSaving} className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 transition font-medium shadow-lg disabled:opacity-50">
                        {exportSaving ? <><i className="fas fa-spinner fa-spin mr-2"></i>Salvataggio...</> : <><i className="fas fa-save mr-2"></i>Salva Valori Default</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== SOGLIE QUALITA ==================== */}
          {activeSection === 'quality' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg">
                      <i className="fas fa-check-circle text-white text-2xl"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Soglie Qualità</h3>
                      <p className="text-gray-600 dark:text-gray-400">Parametri e limiti per il controllo qualità</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {qualityLoading ? (
                    <div className="text-center py-12">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="mx-auto h-16 w-16 rounded-full border-4 border-green-500 border-t-transparent mb-4" />
                      <p className="text-lg font-medium text-green-600">Caricamento...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                          <label className="block text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                            <i className="fas fa-percentage mr-2"></i>Soglia Difetti Accettabile (%)
                          </label>
                          <input type="number" min={0} max={100} step={0.5} value={qualityConfig.sogliaDifettiPercentuale || 5} onChange={(e) => setQualityConfig({ ...qualityConfig, sogliaDifettiPercentuale: parseFloat(e.target.value) || 5 })} className="w-full px-4 py-2 rounded-lg border border-green-300 dark:border-green-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                          <p className="mt-1 text-xs text-green-600 dark:text-green-400">Sotto questa soglia il controllo è considerato conforme</p>
                        </div>
                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                          <label className="block text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                            <i className="fas fa-exclamation-triangle mr-2"></i>Soglia Allarme (%)
                          </label>
                          <input type="number" min={0} max={100} step={0.5} value={qualityConfig.sogliaAllarme || 10} onChange={(e) => setQualityConfig({ ...qualityConfig, sogliaAllarme: parseFloat(e.target.value) || 10 })} className="w-full px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">Sopra questa soglia scatta l'allarme qualità</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Controlli Minimi al Giorno</label>
                          <input type="number" min={0} max={1000} value={qualityConfig.controlliMinimiGiorno || 0} onChange={(e) => setQualityConfig({ ...qualityConfig, controlliMinimiGiorno: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                          <p className="mt-1 text-xs text-gray-500">0 = nessun limite minimo</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Auto-chiusura dopo (giorni)</label>
                          <input type="number" min={0} max={365} value={qualityConfig.autoChiusuraGiorni || 30} onChange={(e) => setQualityConfig({ ...qualityConfig, autoChiusuraGiorni: parseInt(e.target.value) || 30 })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                          <p className="mt-1 text-xs text-gray-500">0 = mai chiusura automatica</p>
                        </div>
                      </div>
                      <button onClick={handleSaveQuality} disabled={qualitySaving} className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition font-medium shadow-lg disabled:opacity-50">
                        {qualitySaving ? <><i className="fas fa-spinner fa-spin mr-2"></i>Salvataggio...</> : <><i className="fas fa-save mr-2"></i>Salva Soglie Qualità</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== SISTEMA ==================== */}
          {activeSection === 'system' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-900/20 dark:to-sky-900/20">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 shadow-lg">
                      <i className="fas fa-microchip text-white text-2xl"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Informazioni Sistema</h3>
                      <p className="text-gray-600 dark:text-gray-400">Server, database, cache e diagnostica</p>
                    </div>
                    <button onClick={loadSystemInfo} className="ml-auto px-4 py-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-200 transition">
                      <i className="fas fa-sync-alt mr-2"></i>Aggiorna
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  {systemLoading ? (
                    <div className="text-center py-12">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="mx-auto h-16 w-16 rounded-full border-4 border-cyan-500 border-t-transparent mb-4" />
                      <p className="text-lg font-medium text-cyan-600">Caricamento info sistema...</p>
                    </div>
                  ) : systemInfo ? (
                    <div className="space-y-6">
                      {/* Server */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                          <i className="fas fa-server text-cyan-500"></i> Server
                        </h4>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Platform</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{systemInfo.server.platform} ({systemInfo.server.arch})</p>
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Node.js</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{systemInfo.server.nodeVersion}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Uptime</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatUptime(systemInfo.server.uptime)}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">CPU</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{systemInfo.server.cpuCount} core</p>
                          </div>
                        </div>
                      </div>

                      {/* Memoria */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                          <i className="fas fa-memory text-blue-500"></i> Memoria
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <p className="text-xs text-blue-600 dark:text-blue-400">Heap Usato</p>
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{systemInfo.server.memoryUsage.heapUsed} MB</p>
                            <p className="text-xs text-gray-500">di {systemInfo.server.memoryUsage.heapTotal} MB allocati</p>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <p className="text-xs text-blue-600 dark:text-blue-400">RSS</p>
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{systemInfo.server.memoryUsage.rss} MB</p>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <p className="text-xs text-blue-600 dark:text-blue-400">Sistema</p>
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{systemInfo.server.freeMemory} GB liberi</p>
                            <p className="text-xs text-gray-500">di {systemInfo.server.totalMemory} GB totali</p>
                          </div>
                        </div>
                      </div>

                      {/* Database */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                          <i className="fas fa-database text-green-500"></i> Database
                        </h4>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <p className="text-xs text-green-600 dark:text-green-400">Dimensione</p>
                            <p className="text-lg font-bold text-green-700 dark:text-green-300">{systemInfo.database.sizeMb} MB</p>
                          </div>
                          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <p className="text-xs text-green-600 dark:text-green-400">Utenti</p>
                            <p className="text-lg font-bold text-green-700 dark:text-green-300">{systemInfo.database.totalUsers}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <p className="text-xs text-green-600 dark:text-green-400">Impostazioni</p>
                            <p className="text-lg font-bold text-green-700 dark:text-green-300">{systemInfo.database.totalSettings}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <p className="text-xs text-green-600 dark:text-green-400">Log Attività</p>
                            <p className="text-lg font-bold text-green-700 dark:text-green-300">{systemInfo.database.totalLogs.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Cache Redis */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                          <i className="fas fa-bolt text-orange-500"></i> Cache Redis
                        </h4>
                        <div className="flex items-center gap-4">
                          <div className="grid grid-cols-3 gap-3 flex-1">
                            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                              <p className="text-xs text-orange-600 dark:text-orange-400">Stato</p>
                              <p className={`text-lg font-bold ${systemInfo.cache?.connected ? 'text-green-600' : 'text-red-600'}`}>
                                {systemInfo.cache?.connected ? 'Connesso' : 'Disconnesso'}
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                              <p className="text-xs text-orange-600 dark:text-orange-400">Chiavi</p>
                              <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{systemInfo.cache?.keys || 0}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                              <p className="text-xs text-orange-600 dark:text-orange-400">Memoria</p>
                              <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{systemInfo.cache?.memoryUsed || '0'}</p>
                            </div>
                          </div>
                          <button onClick={handleFlushCache} disabled={cacheFlushing || !systemInfo.cache?.connected} className="px-4 py-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 transition font-medium disabled:opacity-50">
                            {cacheFlushing ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-broom mr-2"></i>Svuota</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* ==================== CRONOLOGIA ==================== */}
          {activeSection === 'changelog' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 shadow-lg">
                      <i className="fas fa-history text-white text-2xl"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Cronologia Modifiche</h3>
                      <p className="text-gray-600 dark:text-gray-400">Storico delle modifiche alle impostazioni</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {changelogLoading ? (
                    <div className="text-center py-12">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="mx-auto h-16 w-16 rounded-full border-4 border-yellow-500 border-t-transparent mb-4" />
                      <p className="text-lg font-medium text-yellow-600">Caricamento cronologia...</p>
                    </div>
                  ) : changelog?.data?.length > 0 ? (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        {changelog.data.map((log: any) => (
                          <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex-shrink-0">
                              <i className="fas fa-pen text-yellow-600 dark:text-yellow-400"></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {log.user?.nome || log.user?.userName || 'Sistema'}
                                </p>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(log.createdAt).toLocaleString('it-IT')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium mr-2">
                                  {log.action}
                                </span>
                                {log.description || log.entity}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {changelog.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-500">
                            Pagina {changelog.page} di {changelog.totalPages} ({changelog.total} totali)
                          </p>
                          <div className="flex gap-2">
                            <button onClick={() => loadChangelog(changelogPage - 1)} disabled={changelogPage <= 1} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition disabled:opacity-50">
                              <i className="fas fa-chevron-left"></i>
                            </button>
                            <button onClick={() => loadChangelog(changelogPage + 1)} disabled={changelogPage >= changelog.totalPages} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition disabled:opacity-50">
                              <i className="fas fa-chevron-right"></i>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <i className="fas fa-inbox text-5xl text-gray-400 mb-4"></i>
                      <p className="text-gray-500">Nessuna modifica registrata</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
