'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { showSuccess, showError } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Offcanvas from '@/components/ui/Offcanvas';
import api from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

// ─── Metadata tabelle (lato client) ───────────────────────────────────────────

interface TableMeta {
  model: string;
  label: string;
  tableName: string;
  icon: string;
  primaryKey?: string;
  idType?: 'string' | 'number';
  previewCols: string[]; // colonne visibili in lista
}

interface ModuleMeta {
  key: string;
  label: string;
  icon: string;
  color: string;
  tables: TableMeta[];
}

const MODULES: ModuleMeta[] = [
  {
    key: 'auth', label: 'Auth', icon: 'fa-shield-alt', color: 'indigo',
    tables: [
      { model: 'user', label: 'Utenti', tableName: 'auth_users', icon: 'fa-users', previewCols: ['id', 'userName', 'nome', 'mail', 'lastLogin'] },
      { model: 'permission', label: 'Permessi', tableName: 'auth_permissions', icon: 'fa-key', previewCols: ['id', 'userId'] },
      { model: 'authWidgetConfig', label: 'Config Widget', tableName: 'auth_widget_config', icon: 'fa-th', previewCols: ['id', 'userId', 'widgetId', 'visible'] },
    ],
  },
  {
    key: 'core', label: 'Core', icon: 'fa-database', color: 'orange',
    tables: [
      { model: 'activityLog', label: 'Log Attività', tableName: 'core_log', icon: 'fa-history', previewCols: ['id', 'userId', 'module', 'action', 'entity', 'createdAt'] },
      { model: 'setting', label: 'Impostazioni', tableName: 'core_settings', icon: 'fa-cog', previewCols: ['id', 'key', 'value', 'group', 'type'] },
      { model: 'coreData', label: 'Core Data', tableName: 'core_dati', icon: 'fa-table', previewCols: ['id', 'cartel', 'commessaCli', 'articolo', 'descrizioneArticolo', 'ragioneSociale'] },
      { model: 'coreAnagrafica', label: 'Anagrafica Core', tableName: 'core_anag', icon: 'fa-address-book', previewCols: ['id', 'codice', 'nome', 'tipo'] },
      { model: 'job', label: 'Jobs', tableName: 'core_jobs', icon: 'fa-tasks', idType: 'string', previewCols: ['id', 'type', 'status', 'createdAt'] },
    ],
  },
  {
    key: 'riparazioni', label: 'Riparazioni', icon: 'fa-tools', color: 'blue',
    tables: [
      { model: 'riparazione', label: 'Riparazioni', tableName: 'rip_riparazioni', icon: 'fa-wrench', previewCols: ['id', 'idRiparazione', 'cartellino', 'causale', 'createdAt'] },
      { model: 'reparto', label: 'Reparti', tableName: 'rip_reparti', icon: 'fa-building', previewCols: ['id', 'nome', 'codice', 'attivo'] },
      { model: 'laboratorio', label: 'Laboratori', tableName: 'rip_laboratori', icon: 'fa-flask', previewCols: ['id', 'nome', 'codice', 'attivo'] },
      { model: 'numerata', label: 'Numerate', tableName: 'rip_idnumerate', icon: 'fa-th', previewCols: ['id', 'idNumerata'] },
    ],
  },
  {
    key: 'quality', label: 'Qualità', icon: 'fa-check-circle', color: 'green',
    tables: [
      { model: 'qualityRecord', label: 'Record', tableName: 'cq_records', icon: 'fa-clipboard-check', previewCols: ['id', 'cartellino', 'commessa', 'modello', 'createdAt'] },
      { model: 'qualityDepartment', label: 'Dipartimenti', tableName: 'cq_departments', icon: 'fa-sitemap', previewCols: ['id', 'nome', 'codice', 'attivo'] },
      { model: 'qualityDefectType', label: 'Tipi Difetto', tableName: 'cq_deftypes', icon: 'fa-exclamation-triangle', previewCols: ['id', 'nome', 'codice', 'categoria'] },
    ],
  },
  {
    key: 'tracking', label: 'Tracking', icon: 'fa-route', color: 'pink',
    tables: [
      { model: 'trackLink', label: 'Collegamenti', tableName: 'track_links', icon: 'fa-link', previewCols: ['id', 'cartel', 'typeId', 'lot', 'timestamp'] },
      { model: 'trackType', label: 'Tipi', tableName: 'track_types', icon: 'fa-tags', previewCols: ['id', 'name', 'note'] },
      { model: 'trackLotInfo', label: 'Info Lotti', tableName: 'track_lots_info', icon: 'fa-box', primaryKey: 'lot', idType: 'string', previewCols: ['lot', 'doc', 'date', 'note'] },
      { model: 'trackOrderInfo', label: 'Info Ordini', tableName: 'track_order_info', icon: 'fa-shopping-cart', previewCols: ['id', 'ordine', 'date'] },
      { model: 'trackSku', label: 'SKU', tableName: 'track_sku', icon: 'fa-barcode', primaryKey: 'art', idType: 'string', previewCols: ['art', 'sku'] },
      { model: 'trackLinkArchive', label: 'Archivio Storico', tableName: 'track_links_archive', icon: 'fa-archive', previewCols: ['id', 'cartel', 'lot', 'typeName', 'commessa', 'archivedAt'] },
    ],
  },
  {
    key: 'produzione', label: 'Produzione', icon: 'fa-industry', color: 'yellow',
    tables: [
      { model: 'productionPhase', label: 'Fasi', tableName: 'prod_phases', icon: 'fa-layer-group', previewCols: ['id', 'nome', 'codice', 'attivo'] },
      { model: 'productionDepartment', label: 'Reparti', tableName: 'prod_departments', icon: 'fa-industry', previewCols: ['id', 'nome', 'codice', 'attivo'] },
      { model: 'productionRecord', label: 'Record', tableName: 'prod_records', icon: 'fa-calendar-check', previewCols: ['id', 'date', 'departmentId', 'createdAt'] },
    ],
  },
  {
    key: 'scm', label: 'SCM', icon: 'fa-truck', color: 'teal',
    tables: [
      { model: 'scmLaboratory', label: 'Laboratori', tableName: 'scm_laboratories', icon: 'fa-industry', previewCols: ['id', 'codice', 'nome', 'attivo'] },
      { model: 'scmLaunch', label: 'Lanci', tableName: 'scm_launches', icon: 'fa-rocket', previewCols: ['id', 'numero', 'stato', 'dataConsegna'] },
      { model: 'scmStandardPhase', label: 'Fasi Standard', tableName: 'scm_standard_phases', icon: 'fa-list-ol', previewCols: ['id', 'nome', 'codice'] },
    ],
  },
  {
    key: 'analitiche', label: 'Analitiche', icon: 'fa-chart-pie', color: 'cyan',
    tables: [
      { model: 'analiticaRecord', label: 'Record', tableName: 'ana_records', icon: 'fa-file-invoice-dollar', previewCols: ['id', 'tipoDocumento', 'linea', 'articolo', 'importoTotale'] },
      { model: 'analiticaReparto', label: 'Reparti', tableName: 'ana_reparti', icon: 'fa-building', previewCols: ['id', 'nome', 'codice'] },
      { model: 'analiticaImport', label: 'Import', tableName: 'ana_imports', icon: 'fa-file-excel', previewCols: ['id', 'fileName', 'stato', 'createdAt'] },
    ],
  },
  {
    key: 'inwork', label: 'InWork', icon: 'fa-mobile-alt', color: 'lime',
    tables: [
      { model: 'inworkOperator', label: 'Operatori', tableName: 'inwork_operators', icon: 'fa-users', previewCols: ['id', 'nome', 'cognome', 'matricola', 'attivo'] },
      { model: 'inworkAvailableModule', label: 'Moduli', tableName: 'inwork_available_modules', icon: 'fa-th-large', previewCols: ['id', 'moduleId', 'moduleName'] },
    ],
  },
];

const COLOR_MAP: Record<string, { dot: string; badge: string; activeBg: string }> = {
  indigo: { dot: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700', activeBg: 'bg-indigo-50 border-l-2 border-indigo-500' },
  orange: { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', activeBg: 'bg-orange-50 border-l-2 border-orange-500' },
  blue:   { dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700',   activeBg: 'bg-blue-50 border-l-2 border-blue-500' },
  green:  { dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700',  activeBg: 'bg-green-50 border-l-2 border-green-500' },
  pink:   { dot: 'bg-pink-500',   badge: 'bg-pink-100 text-pink-700',   activeBg: 'bg-pink-50 border-l-2 border-pink-500' },
  yellow: { dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700', activeBg: 'bg-yellow-50 border-l-2 border-yellow-500' },
  teal:   { dot: 'bg-teal-500',   badge: 'bg-teal-100 text-teal-700',   activeBg: 'bg-teal-50 border-l-2 border-teal-500' },
  cyan:   { dot: 'bg-cyan-500',   badge: 'bg-cyan-100 text-cyan-700',   activeBg: 'bg-cyan-50 border-l-2 border-cyan-500' },
  lime:   { dot: 'bg-lime-500',   badge: 'bg-lime-100 text-lime-700',   activeBg: 'bg-lime-50 border-l-2 border-lime-500' },
  red:    { dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700',    activeBg: 'bg-red-50 border-l-2 border-red-500' },
};

// ─── Helpers rendering ─────────────────────────────────────────────────────────

function CellBadge({ value }: { value: any }) {
  if (value === null || value === undefined) {
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">NULL</span>;
  }
  if (typeof value === 'boolean') {
    return value
      ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">true</span>
      : <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">false</span>;
  }
  const s = String(value);
  // date ISO
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    return <span className="text-xs font-mono text-purple-600 dark:text-purple-400">{new Date(s).toLocaleString('it-IT')}</span>;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return <span className="text-xs font-mono text-purple-600 dark:text-purple-400">{s}</span>;
  }
  if (s.length > 80) {
    return <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px] block" title={s}>{s.slice(0, 80)}…</span>;
  }
  return <span className="text-xs text-gray-800 dark:text-gray-200">{s}</span>;
}

function FieldRow({ label, value, editable, onEdit }: { label: string; value: any; editable: boolean; onEdit?: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    let initial: string;
    if (value === null || value === undefined) initial = '';
    else if (typeof value === 'object') initial = JSON.stringify(value, null, 2);
    else initial = String(value);
    setDraft(initial);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const save = () => {
    onEdit?.(draft);
    setEditing(false);
  };

  const isJson = typeof value === 'object' && value !== null;

  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <span className="w-40 shrink-0 text-[11px] font-mono text-gray-400 dark:text-gray-500 pt-0.5 truncate" title={label}>{label}</span>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
              className="flex-1 px-2 py-1 text-xs border border-cyan-400 rounded focus:outline-none focus:ring-1 focus:ring-cyan-400 bg-white dark:bg-gray-800 dark:text-white font-mono"
            />
            <button onClick={save} className="text-green-600 hover:text-green-700 text-xs"><i className="fas fa-check"></i></button>
            <button onClick={() => setEditing(false)} className="text-red-500 hover:text-red-600 text-xs"><i className="fas fa-times"></i></button>
          </div>
        ) : (
          <div
            className={`${editable ? 'cursor-pointer hover:bg-cyan-50 dark:hover:bg-cyan-900/10 rounded px-1 -mx-1 group' : ''}`}
            onClick={editable ? startEdit : undefined}
          >
            {isJson
              ? <pre className="text-[10px] font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
              : <CellBadge value={value} />
            }
            {editable && <i className="fas fa-pencil-alt text-[9px] text-gray-300 group-hover:text-cyan-400 ml-2 transition-colors"></i>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente principale ─────────────────────────────────────────────────────

type Tab = 'table' | 'sql' | 'schema';

export default function DataManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeModel = searchParams.get('table') || null;
  const activeTab   = (searchParams.get('tab') as Tab) || 'table';

  const [sidebarSearch, setSidebarSearch] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(MODULES.map(m => m.key)));

  // Tabella
  const [tableData, setTableData]     = useState<any[]>([]);
  const [total, setTotal]             = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [sortBy, setSortBy]           = useState('');
  const [sortOrder, setSortOrder]     = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading]         = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [pendingEdits, setPendingEdits]     = useState<Record<string, any>>({});
  const [saving, setSaving]           = useState(false);
  const [deleteConfirm, setDeleteConfirm]   = useState(false);

  // SQL Console
  const [sql, setSql]               = useState('SELECT * FROM track_links LIMIT 50;');
  const [sqlResult, setSqlResult]   = useState<{ columns: string[]; rows: any[][]; rowCount: number; duration: number; affected?: number } | null>(null);
  const [sqlError, setSqlError]     = useState('');
  const [sqlLoading, setSqlLoading] = useState(false);
  const sqlRef = useRef<HTMLTextAreaElement>(null);

  // Schema
  const [dbTables, setDbTables]         = useState<{ table: string; rows: number; size: string }[]>([]);
  const [schemaTable, setSchemaTable]   = useState('');
  const [schemaColumns, setSchemaColumns] = useState<any[]>([]);
  const [schemaSearch, setSchemaSearch] = useState('');
  const [schemaLoading, setSchemaLoading] = useState(false);

  const currentMeta = MODULES.flatMap(m => m.tables).find(t => t.model === activeModel) || null;

  const navigate = (params: Record<string, string | null>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v === null) sp.delete(k); else sp.set(k, v);
    });
    router.push(`/data-management?${sp.toString()}`);
  };

  // ── Fetch tabella ──
  const fetchTable = useCallback(async () => {
    if (!activeModel || activeTab !== 'table') return;
    setLoading(true);
    setSelectedRecord(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25', sortOrder });
      if (search) params.set('search', search);
      if (sortBy) params.set('sortBy', sortBy);
      const res = await api.get(`/data-management/tables/${activeModel}/data?${params}`);
      setTableData(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  }, [activeModel, page, search, sortBy, sortOrder, activeTab]);

  useEffect(() => { fetchTable(); }, [fetchTable]);

  // Reset page quando cambia tabella o search
  useEffect(() => { setPage(1); setSortBy(''); setSearch(''); setSelectedRecord(null); }, [activeModel]);

  // ── Colonne visibili ──
  const visibleCols = (() => {
    if (!currentMeta || tableData.length === 0) return [];
    const preview = currentMeta.previewCols.filter(c => c in tableData[0]);
    if (preview.length > 0) return preview;
    return Object.keys(tableData[0]).slice(0, 7);
  })();

  const allCols = tableData.length > 0 ? Object.keys(tableData[0]).filter(k => !['password'].includes(k)) : [];

  // ── Sort ──
  const toggleSort = (col: string) => {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('asc'); }
    setPage(1);
  };

  // ── Edit record ──
  const handleFieldEdit = (field: string, value: string) => {
    setPendingEdits(p => ({ ...p, [field]: value }));
    setSelectedRecord((r: any) => ({ ...r, [field]: value }));
  };

  const saveRecord = async () => {
    if (!currentMeta || !selectedRecord) return;
    const pk = currentMeta.primaryKey || 'id';
    const id = String(selectedRecord[pk]);
    setSaving(true);
    try {
      await api.put(`/data-management/tables/${currentMeta.model}/record/${id}`, selectedRecord);
      showSuccess('Record aggiornato');
      setPendingEdits({});
      fetchTable();
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Errore salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async () => {
    if (!currentMeta || !selectedRecord) return;
    const pk = currentMeta.primaryKey || 'id';
    const id = String(selectedRecord[pk]);
    try {
      await api.delete(`/data-management/tables/${currentMeta.model}/record/${id}`);
      showSuccess('Record eliminato');
      setSelectedRecord(null);
      setDeleteConfirm(false);
      fetchTable();
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Errore eliminazione');
    }
  };

  // ── SQL ──
  const runSql = async () => {
    setSqlError('');
    setSqlResult(null);
    setSqlLoading(true);
    try {
      const res = await api.post('/data-management/sql', { sql });
      setSqlResult(res.data);
    } catch (e: any) {
      setSqlError(e?.response?.data?.message || 'Errore SQL');
    } finally {
      setSqlLoading(false);
    }
  };

  const handleSqlKey = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runSql(); }
  };

  // ── Schema ──
  useEffect(() => {
    if (activeTab !== 'schema') return;
    api.get('/data-management/db/tables').then(r => setDbTables(r.data)).catch(() => {});
  }, [activeTab]);

  const loadColumns = async (tbl: string) => {
    setSchemaTable(tbl);
    setSchemaColumns([]);
    setSchemaLoading(true);
    try {
      const r = await api.get(`/data-management/db/tables/${tbl}/columns`);
      setSchemaColumns(r.data);
    } catch { setSchemaColumns([]); }
    finally { setSchemaLoading(false); }
  };

  // ── Sidebar filter ──
  const filteredModules = MODULES.map(m => ({
    ...m,
    tables: m.tables.filter(t =>
      !sidebarSearch ||
      t.label.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      t.tableName.toLowerCase().includes(sidebarSearch.toLowerCase())
    ),
  })).filter(m => !sidebarSearch || m.tables.length > 0);

  const NON_EDITABLE = ['id', 'createdAt', 'updatedAt', 'archivedAt'];

  return (
    <>
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="flex flex-col h-full overflow-hidden">
      {/* Breadcrumb + Header */}
      <motion.div variants={itemVariants} className="shrink-0">
        <PageHeader
          title="Gestione Dati"
          subtitle="Database browser · SQL Console · Schema inspector"
          actions={
            <div className="flex items-center gap-2">
              {/* Tab switcher */}
              {(['table', 'sql', 'schema'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => navigate({ tab: t })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === t
                      ? 'bg-cyan-600 text-white shadow'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  <i className={`fas ${t === 'table' ? 'fa-table' : t === 'sql' ? 'fa-terminal' : 'fa-project-diagram'} mr-1.5`}></i>
                  {t === 'table' ? 'Browser' : t === 'sql' ? 'SQL' : 'Schema'}
                </button>
              ))}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <i className="fas fa-exclamation-triangle text-amber-500 text-xs"></i>
                <span className="text-xs font-medium text-amber-700">Admin only</span>
              </div>
            </div>
          }
        />
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/', icon: 'fa-home' },
            { label: 'Gestione Dati' },
          ]}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden min-h-0">

        {/* ── Sidebar ── */}
        <aside className="hidden md:flex md:w-64 shrink-0 flex-col rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <input
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                placeholder="Cerca tabella..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-400 dark:text-white"
              />
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto py-1">
            {filteredModules.map(mod => {
              const colors = COLOR_MAP[mod.color] || COLOR_MAP.blue;
              const isExpanded = expandedModules.has(mod.key);
              return (
                <div key={mod.key}>
                  <button
                    onClick={() => setExpandedModules(prev => {
                      const next = new Set(prev);
                      next.has(mod.key) ? next.delete(mod.key) : next.add(mod.key);
                      return next;
                    })}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`}></span>
                    <i className={`fas ${mod.icon} text-xs text-gray-400 w-3`}></i>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide flex-1 text-left truncate">{mod.label}</span>
                    <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-xs text-gray-300`}></i>
                  </button>
                  {isExpanded && mod.tables.map(tbl => {
                    const isActive = activeModel === tbl.model;
                    return (
                      <button
                        key={tbl.model}
                        onClick={() => navigate({ table: tbl.model, tab: 'table' })}
                        className={`w-full flex items-center gap-2 pl-7 pr-3 py-1.5 text-left transition-colors ${
                          isActive
                            ? colors.activeBg + ' dark:bg-cyan-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                        }`}
                      >
                        <i className={`fas ${tbl.icon} text-xs ${isActive ? 'text-cyan-600' : 'text-gray-400'} w-3`}></i>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-medium truncate ${isActive ? 'text-cyan-700 dark:text-cyan-400' : 'text-gray-600 dark:text-gray-400'}`}>
                            {tbl.label}
                          </div>
                          <div className="text-[10px] font-mono text-gray-400 truncate">{tbl.tableName}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ── Main area ── */}
        <div className="flex-1 flex gap-3 min-w-0 overflow-hidden">

          {/* ═══ TAB: BROWSER ═══ */}
          {activeTab === 'table' && (
            <>
              {!activeModel ? (
                <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <i className="fas fa-mouse-pointer text-4xl text-gray-300 mb-3"></i>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Seleziona una tabella dalla sidebar</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 gap-3 min-w-0 overflow-hidden">
                  {/* Tabella dati */}
                  <div className="flex flex-col flex-1 min-w-0 rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 shrink-0">
                      <div className="flex items-center gap-2">
                        <i className={`fas ${currentMeta?.icon} text-cyan-500 text-base`}></i>
                        <span className="text-sm font-semibold text-gray-800 dark:text-white">{currentMeta?.label}</span>
                        <span className="text-xs font-mono text-gray-400">{currentMeta?.tableName}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium">{total} righe</span>
                      <div className="flex-1"></div>
                      <div className="relative">
                        <input
                          value={search}
                          onChange={e => { setSearch(e.target.value); setPage(1); }}
                          placeholder="Cerca..."
                          className="pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-cyan-400 dark:text-white w-48"
                        />
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                      </div>
                      <button onClick={fetchTable} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                        <i className={`fas fa-sync-alt text-sm ${loading ? 'animate-spin' : ''}`}></i>
                      </button>
                    </div>

                    {/* Tabella */}
                    <div className="flex-1 overflow-auto">
                      {loading ? (
                        <div className="flex items-center justify-center h-full">
                          <i className="fas fa-spinner fa-spin text-2xl text-cyan-500"></i>
                        </div>
                      ) : tableData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <div className="text-center"><i className="fas fa-inbox text-3xl mb-2"></i><p className="text-sm">Nessun record</p></div>
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                            <tr>
                              {visibleCols.map(col => (
                                <th
                                  key={col}
                                  onClick={() => toggleSort(col)}
                                  className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 whitespace-nowrap"
                                >
                                  {col}
                                  {sortBy === col && (
                                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'} ml-1 text-cyan-500`}></i>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {tableData.map((rec, i) => {
                              const pk = currentMeta?.primaryKey || 'id';
                              const isSelected = selectedRecord && selectedRecord[pk] === rec[pk];
                              return (
                                <tr
                                  key={i}
                                  onClick={() => { setSelectedRecord(rec); setPendingEdits({}); }}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-cyan-50 dark:bg-cyan-900/20'
                                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                  }`}
                                >
                                  {visibleCols.map(col => (
                                    <td key={col} className="px-4 py-2.5 whitespace-nowrap max-w-[200px] overflow-hidden">
                                      <CellBadge value={rec[col]} />
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Paginazione */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700 shrink-0">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Pag. {page} / {totalPages}</span>
                        <div className="flex gap-1">
                          <button onClick={() => setPage(1)} disabled={page === 1} className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">«</button>
                          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">‹</button>
                          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">›</button>
                          <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">»</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* niente pannello inline — il dettaglio è nell'offcanvas fuori */}
                </div>
              )}
            </>
          )}

          {/* ═══ TAB: SQL CONSOLE ═══ */}
          {activeTab === 'sql' && (
            <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
              {/* Editor */}
              <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow overflow-hidden shrink-0">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="ml-2 text-xs font-mono text-gray-400">SQL Console — accesso completo (admin)</span>
                  </div>
                  <button
                    onClick={runSql}
                    disabled={sqlLoading}
                    className="flex items-center gap-2 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    <i className={`fas ${sqlLoading ? 'fa-spinner fa-spin' : 'fa-play'} text-[10px]`}></i>
                    Esegui <kbd className="ml-1 text-[9px] opacity-60">Ctrl+Enter</kbd>
                  </button>
                </div>
                <textarea
                  ref={sqlRef}
                  value={sql}
                  onChange={e => setSql(e.target.value)}
                  onKeyDown={handleSqlKey}
                  spellCheck={false}
                  rows={6}
                  className="w-full bg-gray-900 text-green-400 font-mono text-xs p-4 focus:outline-none resize-none"
                  placeholder="SELECT * FROM track_links LIMIT 50;&#10;-- oppure: UPDATE core_settings SET value='...' WHERE key='...'"
                />
              </div>

              {/* Risultati */}
              <div className="flex-1 rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow overflow-hidden flex flex-col min-h-0">
                {sqlError && (
                  <div className="px-5 py-3.5 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
                    <div className="flex items-start gap-2">
                      <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
                      <pre className="text-sm text-red-700 dark:text-red-400 font-mono whitespace-pre-wrap">{sqlError}</pre>
                    </div>
                  </div>
                )}
                {sqlResult && (
                  <>
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 shrink-0">
                      <span className="text-sm text-gray-500">{sqlResult.rowCount} righe</span>
                      <span className="text-sm text-gray-400">·</span>
                      <span className="text-sm text-gray-500">{sqlResult.duration}ms</span>
                    </div>
                    <div className="overflow-auto flex-1">
                      {sqlResult.columns.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Nessun risultato</div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                            <tr>
                              {sqlResult.columns.map(c => (
                                <th key={c} className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs whitespace-nowrap">{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {sqlResult.rows.map((row, i) => (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                {row.map((cell, j) => (
                                  <td key={j} className="px-3 py-1.5 whitespace-nowrap">
                                    <CellBadge value={cell} />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}
                {!sqlResult && !sqlError && (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <i className="fas fa-terminal text-3xl mb-2"></i>
                      <p className="text-sm">Scrivi una query e premi Ctrl+Enter</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ TAB: SCHEMA ═══ */}
          {activeTab === 'schema' && (
            <div className="flex-1 flex gap-3 min-w-0 overflow-hidden">
              {/* Lista tabelle DB */}
              <div className="w-64 shrink-0 flex flex-col bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
                  <div className="relative">
                    <input
                      value={schemaSearch}
                      onChange={e => setSchemaSearch(e.target.value)}
                      placeholder="Cerca tabella DB..."
                      className="w-full pl-8 pr-2 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-400 dark:text-white"
                    />
                    <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {dbTables.filter(t => !schemaSearch || t.table.includes(schemaSearch)).map(t => (
                    <button
                      key={t.table}
                      onClick={() => loadColumns(t.table)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
                        schemaTable === t.table ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <div>
                        <div className="font-mono font-medium">{t.table}</div>
                        <div className="text-xs text-gray-400">{t.rows.toLocaleString()} righe · {t.size}</div>
                      </div>
                      <i className="fas fa-chevron-right text-xs text-gray-300"></i>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colonne tabella selezionata */}
              <div className="flex-1 bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-200 dark:border-gray-700 shadow overflow-hidden flex flex-col min-w-0">
                {!schemaTable ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center"><i className="fas fa-project-diagram text-3xl mb-2"></i><p className="text-sm">Seleziona una tabella</p></div>
                  </div>
                ) : (
                  <>
                    <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 shrink-0">
                      <span className="text-sm font-semibold font-mono text-gray-800 dark:text-white">{schemaTable}</span>
                      <span className="ml-2 text-xs text-gray-400">DESCRIBE</span>
                    </div>
                    <div className="flex-1 overflow-auto">
                      {schemaLoading ? (
                        <div className="flex items-center justify-center h-full"><i className="fas fa-spinner fa-spin text-cyan-500"></i></div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                            <tr>
                              {['Field', 'Type', 'Null', 'Key', 'Default', 'Extra'].map(h => (
                                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {schemaColumns.map((col, i) => (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                <td className="px-4 py-2.5 font-mono font-semibold text-gray-800 dark:text-white whitespace-nowrap">
                                  {col.key === 'PRI' && <i className="fas fa-key text-amber-500 mr-1.5 text-xs"></i>}
                                  {col.key === 'MUL' && <i className="fas fa-link text-blue-400 mr-1.5 text-xs"></i>}
                                  {col.field}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-purple-600 dark:text-purple-400 whitespace-nowrap">{col.type}</td>
                                <td className="px-4 py-2.5">{col.null === 'YES'
                                  ? <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">NULL</span>
                                  : <span className="px-1.5 py-0.5 rounded text-xs bg-red-50 text-red-600">NOT NULL</span>}
                                </td>
                                <td className="px-4 py-2.5">
                                  {col.key === 'PRI' && <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-semibold">PRI</span>}
                                  {col.key === 'MUL' && <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">IDX</span>}
                                  {col.key === 'UNI' && <span className="px-1.5 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700">UNI</span>}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-gray-400 text-xs">{col.default ?? '—'}</td>
                                <td className="px-4 py-2.5 text-gray-400 text-xs">{col.extra || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>

      {/* ── Offcanvas Dettaglio Record ── */}
      <Offcanvas
        open={!!selectedRecord}
        onClose={() => { setSelectedRecord(null); setPendingEdits({}); }}
        title={currentMeta?.label || 'Record'}
        icon={currentMeta?.icon || 'fa-circle'}
        iconColor="text-cyan-500"
        width="lg"
        footer={
          selectedRecord ? (
            <div className="flex items-center gap-2">
              {Object.keys(pendingEdits).length > 0 && (
                <button
                  onClick={saveRecord}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors"
                >
                  {saving
                    ? <i className="fas fa-spinner fa-spin"></i>
                    : <><i className="fas fa-save"></i> Salva ({Object.keys(pendingEdits).length})</>
                  }
                </button>
              )}
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <i className="fas fa-trash text-xs"></i> Elimina
              </button>
            </div>
          ) : undefined
        }
      >
        {selectedRecord && (
          <div className="px-4">
            {/* ID info */}
            <div className="mb-3 text-[10px] font-mono text-gray-400">
              {currentMeta?.primaryKey || 'id'}: <span className="text-cyan-600 dark:text-cyan-400">{selectedRecord[currentMeta?.primaryKey || 'id']}</span>
            </div>

            {/* Pending edits bar */}
            {Object.keys(pendingEdits).length > 0 && (
              <div className="mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-lg">
                <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <i className="fas fa-pencil-alt text-[9px]"></i>
                  {Object.keys(pendingEdits).length} campo/i modificato/i — clicca Salva per confermare
                </p>
              </div>
            )}

            {/* Campi */}
            {allCols.map(field => (
              <FieldRow
                key={field}
                label={field}
                value={selectedRecord[field]}
                editable={!NON_EDITABLE.includes(field)}
                onEdit={v => handleFieldEdit(field, v)}
              />
            ))}
          </div>
        )}
      </Offcanvas>

      {/* ── Delete confirm modal ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <i className="fas fa-trash text-red-600 dark:text-red-400"></i>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Conferma eliminazione</h3>
                  <p className="text-xs text-gray-500">Operazione irreversibile</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
                Eliminare il record con {currentMeta?.primaryKey || 'id'} = <strong>{selectedRecord?.[currentMeta?.primaryKey || 'id']}</strong>?
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Annulla</button>
                <button onClick={deleteRecord} className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                  <i className="fas fa-trash mr-2"></i>Elimina
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
