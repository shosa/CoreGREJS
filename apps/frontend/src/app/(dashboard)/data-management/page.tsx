'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { showSuccess, showError, showWarning } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

interface TableInfo {
  name: string;
  displayName: string;
  model: string;
  tableName?: string;
  icon: string;
  description: string;
  relations?: string[];
}

interface ModuleInfo {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  description: string;
  tables: TableInfo[];
}

const modulesData: ModuleInfo[] = [
  {
    name: 'auth',
    displayName: 'Autenticazione',
    icon: 'fa-shield-alt',
    color: 'indigo',
    description: 'Gestisci utenti e autenticazione',
    tables: [
      { name: 'users', displayName: 'Utenti', model: 'user', tableName: 'auth_users', icon: 'fa-users', description: 'Utenti sistema', relations: ['permissions', 'activityLogs'] },
      { name: 'permissions', displayName: 'Permessi', model: 'permission', tableName: 'auth_permissions', icon: 'fa-key', description: 'Permessi utenti' },
      { name: 'widget-config', displayName: 'Config Widget', model: 'authWidgetConfig', tableName: 'auth_widget_config', icon: 'fa-th', description: 'Configurazione widget utenti' },
    ],
  },
  {
    name: 'core',
    displayName: 'Core',
    icon: 'fa-database',
    color: 'orange',
    description: 'Dati centrali e sistema',
    tables: [
      { name: 'activity-logs', displayName: 'Log Attività', model: 'activityLog', tableName: 'core_log', icon: 'fa-history', description: 'Log delle attività', relations: ['user'] },
      { name: 'settings', displayName: 'Impostazioni', model: 'setting', tableName: 'core_settings', icon: 'fa-cog', description: 'Impostazioni sistema' },
      { name: 'core-data', displayName: 'Dati Core (Legacy)', model: 'coreData', tableName: 'core_dati', icon: 'fa-table', description: 'Dati produzione legacy' },
      { name: 'core-anagrafica', displayName: 'Anagrafica Core', model: 'coreAnagrafica', tableName: 'core_anag', icon: 'fa-address-book', description: 'Anagrafica generale' },
      { name: 'jobs', displayName: 'Jobs', model: 'job', tableName: 'core_jobs', icon: 'fa-tasks', description: 'Job in coda e completati' },
    ],
  },
  {
    name: 'riparazioni',
    displayName: 'Riparazioni',
    icon: 'fa-tools',
    color: 'blue',
    description: 'Gestisci riparazioni esterne',
    tables: [
      { name: 'riparazioni', displayName: 'Riparazioni', model: 'riparazione', tableName: 'rip_riparazioni', icon: 'fa-wrench', description: 'Ordini di riparazione', relations: ['reparto', 'laboratorio', 'numerata'] },
      { name: 'reparti', displayName: 'Reparti', model: 'reparto', tableName: 'rip_reparti', icon: 'fa-building', description: 'Reparti aziendali' },
      { name: 'laboratori', displayName: 'Laboratori', model: 'laboratorio', tableName: 'rip_laboratori', icon: 'fa-flask', description: 'Laboratori esterni' },
      { name: 'numerate', displayName: 'Numerate (Taglie)', model: 'numerata', tableName: 'rip_idnumerate', icon: 'fa-th', description: 'Configurazioni taglie' },
    ],
  },
  {
    name: 'quality',
    displayName: 'Controllo Qualità',
    icon: 'fa-check-circle',
    color: 'green',
    description: 'Gestisci controlli qualità',
    tables: [
      { name: 'quality-records', displayName: 'Record Qualità', model: 'qualityRecord', tableName: 'cq_records', icon: 'fa-clipboard-check', description: 'Record controllo qualità', relations: ['department', 'operator', 'defectType'] },
      { name: 'quality-departments', displayName: 'Dipartimenti', model: 'qualityDepartment', tableName: 'cq_departments', icon: 'fa-sitemap', description: 'Dipartimenti qualità' },
      { name: 'quality-operators', displayName: 'Operatori', model: 'qualityOperator', tableName: 'cq_operators', icon: 'fa-user-check', description: 'Operatori qualità' },
      { name: 'quality-defect-types', displayName: 'Tipi Difetto', model: 'qualityDefectType', tableName: 'cq_deftypes', icon: 'fa-exclamation-triangle', description: 'Tipologie di difetti' },
      { name: 'quality-exceptions', displayName: 'Eccezioni', model: 'qualityException', tableName: 'cq_exceptions', icon: 'fa-shield-alt', description: 'Eccezioni qualità' },
    ],
  },
  {
    name: 'export',
    displayName: 'Export/DDT',
    icon: 'fa-file-export',
    color: 'purple',
    description: 'Gestisci documenti trasporto',
    tables: [
      { name: 'export-documents', displayName: 'Documenti DDT', model: 'exportDocument', tableName: 'exp_documenti', icon: 'fa-file-invoice', description: 'Documenti di trasporto', relations: ['items', 'terzista', 'piede'] },
      { name: 'export-items', displayName: 'Righe DDT', model: 'exportDocumentItem', tableName: 'exp_righe_documento', icon: 'fa-list', description: 'Righe documento', relations: ['document', 'article'] },
      { name: 'export-articles', displayName: 'Anagrafica Articoli', model: 'exportArticleMaster', tableName: 'exp_articoli_master', icon: 'fa-box', description: 'Anagrafica articoli' },
      { name: 'export-terzisti', displayName: 'Terzisti', model: 'exportTerzista', tableName: 'exp_terzisti', icon: 'fa-handshake', description: 'Anagrafica terzisti' },
      { name: 'export-footer', displayName: 'Piede Documenti', model: 'exportDocumentFooter', tableName: 'exp_piede_documenti', icon: 'fa-file-alt', description: 'Piede documenti DDT' },
      { name: 'export-missing', displayName: 'Dati Mancanti', model: 'exportMissingData', tableName: 'exp_dati_mancanti', icon: 'fa-exclamation-circle', description: 'Merce non spedita' },
      { name: 'export-launches', displayName: 'Lanci DDT', model: 'exportLaunchData', tableName: 'exp_dati_lanci_ddt', icon: 'fa-rocket', description: 'Lanci produzione DDT' },
    ],
  },
  {
    name: 'tracking',
    displayName: 'Tracking',
    icon: 'fa-route',
    color: 'pink',
    description: 'Tracking cartellini e lotti',
    tables: [
      { name: 'track-links', displayName: 'Collegamenti', model: 'trackLink', tableName: 'track_links', icon: 'fa-link', description: 'Collegamenti cartellini-lotti', relations: ['type'] },
      { name: 'track-types', displayName: 'Tipi Tracking', model: 'trackType', tableName: 'track_types', icon: 'fa-tags', description: 'Tipi di tracking' },
      { name: 'track-lot-info', displayName: 'Info Lotti', model: 'trackLotInfo', tableName: 'track_lots_info', icon: 'fa-box', description: 'Metadati lotti' },
      { name: 'track-order-info', displayName: 'Info Ordini', model: 'trackOrderInfo', tableName: 'track_order_info', icon: 'fa-shopping-cart', description: 'Metadati ordini' },
      { name: 'track-sku', displayName: 'SKU', model: 'trackSku', tableName: 'track_sku', icon: 'fa-barcode', description: 'Codici SKU' },
    ],
  },
  {
    name: 'produzione',
    displayName: 'Produzione',
    icon: 'fa-industry',
    color: 'yellow',
    description: 'Monitoraggio produzione',
    tables: [
      { name: 'production-phases', displayName: 'Fasi Produzione', model: 'productionPhase', tableName: 'prod_phases', icon: 'fa-layer-group', description: 'Fasi di produzione', relations: ['departments'] },
      { name: 'production-departments', displayName: 'Reparti Produzione', model: 'productionDepartment', tableName: 'prod_departments', icon: 'fa-industry', description: 'Reparti produttivi', relations: ['phase'] },
      { name: 'production-records', displayName: 'Record Produzione', model: 'productionRecord', tableName: 'prod_records', icon: 'fa-calendar-check', description: 'Record giornalieri' },
      { name: 'production-values', displayName: 'Valori Produzione', model: 'productionValue', tableName: 'prod_values', icon: 'fa-chart-bar', description: 'Valori per reparto' },
    ],
  },
  {
    name: 'scm',
    displayName: 'SCM (Terzisti)',
    icon: 'fa-truck',
    color: 'teal',
    description: 'Gestione terzisti e subfornitori',
    tables: [
      { name: 'scm-laboratories', displayName: 'Laboratori', model: 'scmLaboratory', tableName: 'scm_laboratories', icon: 'fa-industry', description: 'Laboratori terzisti' },
      { name: 'scm-launches', displayName: 'Lanci', model: 'scmLaunch', tableName: 'scm_launches', icon: 'fa-rocket', description: 'Lanci a terzisti', relations: ['laboratory', 'articles', 'phases'] },
      { name: 'scm-launch-articles', displayName: 'Articoli Lanci', model: 'scmLaunchArticle', tableName: 'scm_launch_articles', icon: 'fa-box', description: 'Articoli per lancio' },
      { name: 'scm-launch-phases', displayName: 'Fasi Lanci', model: 'scmLaunchPhase', tableName: 'scm_launch_phases', icon: 'fa-tasks', description: 'Fasi lavorazione' },
      { name: 'scm-standard-phases', displayName: 'Fasi Standard', model: 'scmStandardPhase', tableName: 'scm_standard_phases', icon: 'fa-list-ol', description: 'Template fasi' },
      { name: 'scm-progress', displayName: 'Progressi', model: 'scmProgressTracking', tableName: 'scm_progress_tracking', icon: 'fa-chart-line', description: 'Tracking progressi' },
      { name: 'scm-settings', displayName: 'Impostazioni', model: 'scmSetting', tableName: 'scm_settings', icon: 'fa-cog', description: 'Impostazioni SCM' },
    ],
  },
  {
    name: 'mrp',
    displayName: 'MRP',
    icon: 'fa-boxes',
    color: 'cyan',
    description: 'Material Requirements Planning',
    tables: [
      { name: 'mrp-materials', displayName: 'Materiali', model: 'mrpMaterial', tableName: 'mrp_materials', icon: 'fa-box', description: 'Anagrafica materiali', relations: ['category', 'orders'] },
      { name: 'mrp-categories', displayName: 'Categorie', model: 'mrpCategory', tableName: 'mrp_categories', icon: 'fa-folder', description: 'Categorie materiali' },
      { name: 'mrp-orders', displayName: 'Ordini', model: 'mrpOrder', tableName: 'mrp_orders', icon: 'fa-shopping-cart', description: 'Ordini fornitori' },
      { name: 'mrp-arrivals', displayName: 'Arrivi', model: 'mrpArrival', tableName: 'mrp_arrivals', icon: 'fa-truck-loading', description: 'Arrivi materiali' },
      { name: 'mrp-requirements', displayName: 'Fabbisogni', model: 'mrpRequirement', tableName: 'mrp_requirements', icon: 'fa-clipboard-list', description: 'Fabbisogni materiali' },
    ],
  },
  {
    name: 'cron',
    displayName: 'Cron Jobs',
    icon: 'fa-clock',
    color: 'red',
    description: 'Gestione job schedulati',
    tables: [
      { name: 'cron-logs', displayName: 'Log Cron', model: 'cronLog', tableName: 'cron_logs', icon: 'fa-history', description: 'Log esecuzioni cron' },
    ],
  },
  {
    name: 'inwork',
    displayName: 'InWork',
    icon: 'fa-mobile-alt',
    color: 'lime',
    description: 'App mobile operatori',
    tables: [
      { name: 'inwork-operators', displayName: 'Operatori', model: 'inworkOperator', tableName: 'inwork_operators', icon: 'fa-user-hard-hat', description: 'Operatori mobile' },
      { name: 'inwork-permissions', displayName: 'Permessi Moduli', model: 'inworkModulePermission', tableName: 'inwork_module_permissions', icon: 'fa-lock', description: 'Permessi accesso moduli' },
    ],
  },
];

interface DataRecord {
  id: number;
  [key: string]: any;
}

export default function DataManagementPage() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableData, setTableData] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredModules = modulesData.filter(module =>
    module.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentModule = modulesData.find(m => m.name === selectedModule);
  const currentTable = currentModule?.tables.find(t => t.name === selectedTable);

  const fetchTableData = async () => {
    if (!selectedTable || !currentTable) return;

    setLoading(true);
    try {
      const authStorage = localStorage.getItem('coregre-auth');
      const token = authStorage ? JSON.parse(authStorage).state?.token : null;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
      });

      if (tableSearch) {
        params.append('search', tableSearch);
      }

      const response = await fetch(`/api/data-management/tables/${currentTable.model}/data?${params}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setTableData(result.data || []);
        setTotalPages(result.pagination?.totalPages || 1);
        setTotal(result.pagination?.total || 0);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Errore durante il caricamento dei dati' }));
        showError(errorData.message || 'Errore durante il caricamento dei dati');
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
      showError('Errore di connessione durante il caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      // Reset sorting quando cambia tabella (usa '' per lasciare che il backend scelga il default)
      setSortBy('');
      setPage(1);
    }
  }, [selectedTable]);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
    }
  }, [selectedTable, page, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedTable) {
        setPage(1);
        fetchTableData();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [tableSearch]);

  const handleCellEdit = (rowIndex: number, field: string, currentValue: any) => {
    setEditingCell({ row: rowIndex, field });
    setEditValue(currentValue?.toString() || '');
  };

  const handleSaveCell = async (record: DataRecord, field: string) => {
    if (!currentTable) return;

    try {
      const authStorage = localStorage.getItem('coregre-auth');
      const token = authStorage ? JSON.parse(authStorage).state?.token : null;

      const response = await fetch(`/api/data-management/tables/${currentTable.model}/record/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          ...record,
          [field]: editValue,
        }),
      });

      if (response.ok) {
        fetchTableData();
        setEditingCell(null);
        showSuccess('Record aggiornato con successo');
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Errore durante il salvataggio' }));
        showError(errorData.message || 'Errore durante il salvataggio');
      }
    } catch (error) {
      console.error('Error saving:', error);
      showError('Errore di connessione durante il salvataggio');
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; recordId: number | null }>({
    show: false,
    recordId: null,
  });

  const handleDeleteRecord = async (id: number) => {
    setDeleteConfirm({ show: true, recordId: id });
  };

  const confirmDelete = async () => {
    const id = deleteConfirm.recordId;
    if (!id || !currentTable) return;

    try {
      const authStorage = localStorage.getItem('coregre-auth');
      const token = authStorage ? JSON.parse(authStorage).state?.token : null;

      const response = await fetch(`/api/data-management/tables/${currentTable.model}/record/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (response.ok) {
        setDeleteConfirm({ show: false, recordId: null });
        fetchTableData();
        showSuccess('Record eliminato con successo');
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Errore durante l\'eliminazione' }));
        showError(errorData.message || 'Errore durante l\'eliminazione');
        setDeleteConfirm({ show: false, recordId: null });
      }
    } catch (error) {
      console.error('Error deleting:', error);
      showError('Errore di connessione durante l\'eliminazione');
      setDeleteConfirm({ show: false, recordId: null });
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { gradient: string; bg: string; text: string; hover: string; border: string }> = {
      blue: { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-600', hover: 'hover:bg-blue-100', border: 'border-blue-200' },
      yellow: { gradient: 'from-yellow-500 to-yellow-600', bg: 'bg-yellow-50', text: 'text-yellow-600', hover: 'hover:bg-yellow-100', border: 'border-yellow-200' },
      green: { gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', text: 'text-green-600', hover: 'hover:bg-green-100', border: 'border-green-200' },
      purple: { gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', text: 'text-purple-600', hover: 'hover:bg-purple-100', border: 'border-purple-200' },
      pink: { gradient: 'from-pink-500 to-pink-600', bg: 'bg-pink-50', text: 'text-pink-600', hover: 'hover:bg-pink-100', border: 'border-pink-200' },
      orange: { gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', text: 'text-orange-600', hover: 'hover:bg-orange-100', border: 'border-orange-200' },
      gray: { gradient: 'from-gray-500 to-gray-600', bg: 'bg-gray-50', text: 'text-gray-600', hover: 'hover:bg-gray-100', border: 'border-gray-200' },
    };
    return colors[color] || colors.blue;
  };

  const renderCellValue = (value: any) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sì' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string' && value.length > 100) return value.substring(0, 100) + '...';
    return value.toString();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getVisibleFields = (data: DataRecord[]) => {
    if (data.length === 0) return [];
    const firstRecord = data[0];
    return Object.keys(firstRecord).filter(key =>
      !['password', 'passwordHash', 'metadata'].includes(key)
    );
  };

  // Build breadcrumb items with navigation
  const handleBreadcrumbClick = (level: 'root' | 'module') => {
    if (level === 'root') {
      setSelectedModule(null);
      setSelectedTable(null);
      setTableData([]);
    } else if (level === 'module') {
      setSelectedTable(null);
      setTableData([]);
    }
  };

  const breadcrumbItems = [
    {
      label: 'Home',
      href: '/',
      icon: 'fa-home'
    }
  ];

  // Always show "Gestione Dati"
  if (selectedModule || selectedTable) {
    // If we're inside a module or table, make "Gestione Dati" clickable
    breadcrumbItems.push({
      label: 'Gestione Dati',
      onClick: () => handleBreadcrumbClick('root'),
      icon: 'fa-database'
    });
  } else {
    // If we're at root level, it's the current page
    breadcrumbItems.push({
      label: 'Gestione Dati',
      icon: 'fa-database'
    });
  }

  if (selectedModule && currentModule) {
    if (selectedTable) {
      // If a table is selected, make module clickable
      breadcrumbItems.push({
        label: currentModule.displayName,
        onClick: () => handleBreadcrumbClick('module'),
        icon: currentModule.icon
      });
    } else {
      // If no table selected, module is current
      breadcrumbItems.push({
        label: currentModule.displayName,
        icon: currentModule.icon
      });
    }
  }

  if (selectedTable && currentTable) {
    breadcrumbItems.push({
      label: currentTable.displayName,
      icon: currentTable.icon
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Gestione Dati"
        subtitle="Strumento di manutenzione per correzioni, fix e operazioni sui dati"
        actions={
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
            <i className="fas fa-exclamation-triangle text-orange-500"></i>
            <span className="text-sm font-medium text-orange-700">Solo Admin</span>
          </div>
        }
      />

      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {!selectedModule ? (
        <>
          {/* Search Modules */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="relative">
              <input
                type="text"
                placeholder="Cerca modulo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>
          </motion.div>

          {/* Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map((module, index) => {
              const colors = getColorClasses(module.color);
              return (
                <motion.div
                  key={module.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  onClick={() => setSelectedModule(module.name)}
                  className={`bg-white rounded-xl shadow-md p-6 cursor-pointer transition-all ${colors.hover} hover:shadow-lg border-2 ${colors.border}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-r ${colors.gradient} flex items-center justify-center shadow-lg`}>
                      <i className={`fas ${module.icon} text-white text-2xl`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {module.displayName}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {module.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${colors.bg} ${colors.text} font-medium`}>
                          {module.tables.length} {module.tables.length === 1 ? 'tabella' : 'tabelle'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end">
                    <i className="fas fa-arrow-right text-gray-400"></i>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredModules.length === 0 && (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <i className="fas fa-search text-gray-300 text-5xl mb-4"></i>
              <p className="text-gray-500">Nessun modulo trovato</p>
            </div>
          )}
        </>
      ) : !selectedTable ? (
        <>
          {/* Tables Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentModule?.tables.map((table, index) => (
              <motion.div
                key={table.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.03 }}
                onClick={() => setSelectedTable(table.name)}
                className="bg-white rounded-xl shadow-md p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-105"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center">
                    <i className={`fas ${table.icon} text-white`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {table.displayName}
                    </h3>
                    <p className="text-xs font-mono text-gray-500 mb-2">
                      {table.tableName || table.model}
                    </p>
                    <p className="text-xs text-gray-600 mb-2">
                      {table.description}
                    </p>
                    {table.relations && table.relations.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-gray-500">
                          <i className="fas fa-link mr-1"></i>
                          {table.relations.length} {table.relations.length === 1 ? 'relazione' : 'relazioni'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        /* Table Data View - same as before */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Table Header */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">
                  <i className={`fas ${currentTable?.icon} mr-2 text-cyan-500`}></i>
                  {currentTable?.displayName}
                </h2>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                  {total} record
                </span>
                {currentTable?.relations && currentTable.relations.length > 0 && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                    <i className="fas fa-link mr-1"></i>
                    {currentTable.relations.join(', ')}
                  </span>
                )}
              </div>
              <button
                onClick={fetchTableData}
                disabled={loading}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
              >
                <i className={`fas fa-sync-alt mr-2 ${loading ? 'animate-spin' : ''}`}></i>
                Ricarica
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cerca nei dati..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>
          </div>

          {/* Table Data */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <i className="fas fa-spinner fa-spin text-4xl text-cyan-500 mb-4"></i>
                <p className="text-gray-500">Caricamento dati...</p>
              </div>
            ) : tableData.length === 0 ? (
              <div className="p-12 text-center">
                <i className="fas fa-inbox text-gray-300 text-5xl mb-4"></i>
                <p className="text-gray-500">Nessun record trovato</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {getVisibleFields(tableData).map((field) => (
                          <th
                            key={field}
                            onClick={() => handleSort(field)}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          >
                            <div className="flex items-center gap-2">
                              {field}
                              {sortBy === field && (
                                <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'} text-cyan-500`}></i>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Azioni
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tableData.map((record, rowIndex) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          {getVisibleFields(tableData).map((field) => (
                            <td
                              key={field}
                              className="px-4 py-3 text-sm text-gray-900"
                              onDoubleClick={() => !['id', 'createdAt', 'updatedAt'].includes(field) && handleCellEdit(rowIndex, field, record[field])}
                            >
                              {editingCell?.row === rowIndex && editingCell?.field === field ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="flex-1 px-2 py-1 border border-cyan-500 rounded focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveCell(record, field);
                                      if (e.key === 'Escape') setEditingCell(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveCell(record, field)}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>
                                  <button
                                    onClick={() => setEditingCell(null)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              ) : (
                                <span className={!['id', 'createdAt', 'updatedAt'].includes(field) ? 'cursor-pointer hover:bg-yellow-50 px-2 py-1 rounded' : ''}>
                                  {renderCellValue(record[field])}
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right text-sm">
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className="p-2 bg-red-100 hover:bg-red-200 rounded-md text-red-600 hover:text-red-700 transition-colors"
                              title="Elimina"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Pagina {page} di {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Help */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <i className="fas fa-info-circle text-blue-500 mt-1"></i>
              <div className="flex-1">
                <p className="text-sm text-blue-800 font-medium">Suggerimenti:</p>
                <ul className="mt-2 text-sm text-blue-700 space-y-1">
                  <li>• Fai doppio click su una cella per modificarla</li>
                  <li>• Premi Invio per salvare, Esc per annullare</li>
                  <li>• Click sull'intestazione per ordinare</li>
                  <li>• Tutte le modifiche vengono registrate nel log attività</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm.show && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Conferma Eliminazione
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Questa azione non può essere annullata
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  Sei sicuro di voler eliminare questo record? Tutti i dati associati verranno rimossi definitivamente.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteConfirm({ show: false, recordId: null })}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    <i className="fas fa-trash mr-2"></i>
                    Elimina
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
