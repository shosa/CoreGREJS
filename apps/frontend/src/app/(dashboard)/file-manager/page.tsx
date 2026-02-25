'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Offcanvas from '@/components/ui/Offcanvas';
import { showError, showSuccess } from '@/store/notifications';
import { formatBytes, formatDate } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

interface MinioFile {
  id: number;
  bucket: string;
  objectKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  userId: number | null;
  jobId: string | null;
  uploadedAt: string;
  lastAccess: string;
  metadata?: { type?: string; jobId?: string } | null;
  user?: { id: number; userName: string; nome: string };
  job?: { id: string; type: string; status: string };
}

interface FileStats {
  totalFiles: number;
  totalSize: number;
  filesByUser: Array<{ userId: number; userName: string; count: number; size: number }>;
  filesByType: Array<{ mimeType: string; count: number; size: number }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileIcon(mimeType: string | null): string {
  if (!mimeType) return 'fa-file';
  if (mimeType.includes('pdf')) return 'fa-file-pdf';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-file-word';
  if (mimeType.includes('image')) return 'fa-file-image';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'fa-file-archive';
  if (mimeType.includes('text') || mimeType.includes('csv')) return 'fa-file-alt';
  return 'fa-file';
}

function getFileIconColor(mimeType: string | null): string {
  if (!mimeType) return 'text-gray-400';
  if (mimeType.includes('pdf')) return 'text-red-500';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'text-green-600';
  if (mimeType.includes('image')) return 'text-blue-500';
  if (mimeType.includes('zip')) return 'text-amber-500';
  if (mimeType.includes('text') || mimeType.includes('csv')) return 'text-gray-500';
  return 'text-gray-400';
}

function jobTypeLabel(job?: MinioFile['job']): string {
  if (!job) return '—';
  const labels: Record<string, string> = {
    COMPACT_REPORT_PDF: 'PDF Compattamento',
    EXPORT_PDF: 'Export PDF',
    REPORT: 'Report',
  };
  return labels[job.type] || job.type;
}

function jobStatusBadge(status?: string) {
  if (!status) return null;
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function FileManagerPage() {
  // Data
  const [files, setFiles] = useState<MinioFile[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 30;

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [mimeFilter, setMimeFilter] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Detail offcanvas
  const [selectedFile, setSelectedFile] = useState<MinioFile | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null); // single id
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Cleanup modal
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupFrom, setCleanupFrom] = useState('');
  const [cleanupTo, setCleanupTo] = useState('');
  const [cleanupMime, setCleanupMime] = useState('');

  // ── Load ──

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) params.set('search', search);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (mimeFilter) params.set('mimeType', mimeFilter);
      const res = await api.get(`/files?${params}`);
      setFiles(res.data.files || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch {
      showError('Errore caricamento file');
    } finally {
      setLoading(false);
    }
  }, [page, search, dateFrom, dateTo, mimeFilter]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/files/stats');
      setStats(res.data);
    } catch {}
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);
  useEffect(() => { loadStats(); }, [loadStats]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, dateFrom, dateTo, mimeFilter]);

  // ── Actions ──

  const handleDownload = async (fileId: number, fileName?: string) => {
    try {
      const res = await api.get(`/files/${fileId}/download`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName || 'download'; a.click();
      URL.revokeObjectURL(url);
    } catch { showError('Errore download'); }
  };

  const confirmDelete = (id: number) => setDeleteTarget(id);

  const executeDelete = async () => {
    if (deleteTarget === null) return;
    try {
      await api.delete(`/files/${deleteTarget}`);
      showSuccess('File eliminato');
      if (selectedFile?.id === deleteTarget) setSelectedFile(null);
      setDeleteTarget(null);
      loadFiles(); loadStats();
    } catch { showError('Errore eliminazione'); }
  };

  const executeBulkDelete = async () => {
    try {
      for (const id of selectedIds) await api.delete(`/files/${id}`);
      showSuccess(`${selectedIds.length} file eliminati`);
      setSelectedIds([]);
      setBulkDeleteConfirm(false);
      loadFiles(); loadStats();
    } catch { showError('Errore eliminazione multipla'); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.get('/files/sync/minio');
      showSuccess(`Sincronizzati ${res.data.synced} file`);
      loadFiles(); loadStats();
    } catch { showError('Errore sincronizzazione'); }
    finally { setSyncing(false); }
  };

  const handleCleanup = async () => {
    try {
      const params = new URLSearchParams();
      if (cleanupFrom) params.set('dateFrom', cleanupFrom);
      if (cleanupTo) params.set('dateTo', cleanupTo);
      if (cleanupMime) params.set('mimeType', cleanupMime);
      const res = await api.delete(`/files?${params}`);
      showSuccess(`Eliminati ${res.data.deleted} file (${formatBytes(res.data.size)})`);
      setCleanupOpen(false);
      loadFiles(); loadStats();
    } catch { showError('Errore pulizia'); }
  };

  const toggleSelect = (id: number) =>
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const toggleAll = () =>
    setSelectedIds(selectedIds.length === files.length && files.length > 0 ? [] : files.map(f => f.id));

  // ─── Unique mime types from stats ──
  const mimeOptions = stats?.filesByType?.map(t => t.mimeType) ?? [];

  // ─── Top users from stats ──
  const topUsers = stats?.filesByUser?.sort((a, b) => b.size - a.size).slice(0, 5) ?? [];

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="flex flex-col h-full overflow-hidden">
      {/* Breadcrumb + Header */}
      <motion.div variants={itemVariants} className="shrink-0">
        <PageHeader
          title="File Manager"
          subtitle="Jobs · bucket MinIO"
        />
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/', icon: 'fa-home' },
            { label: 'File Manager' },
          ]}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden min-h-0">

        {/* ── Sidebar Stats + Filtri ── */}
        <aside className="hidden md:flex md:w-64 shrink-0 flex-col gap-3 overflow-y-auto">

          {/* Stats */}
          <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Statistiche</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">File totali</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-white">{stats?.totalFiles ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Spazio usato</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-white">{stats ? formatBytes(stats.totalSize) : '—'}</span>
              </div>
            </div>

            {/* Top types */}
            {stats && stats.filesByType.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tipi file</div>
                <div className="space-y-1.5">
                  {stats.filesByType.slice(0, 4).map(t => (
                    <div key={t.mimeType} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 truncate max-w-[120px]" title={t.mimeType}>
                        {t.mimeType.split('/').pop() || t.mimeType}
                      </span>
                      <span className="text-xs font-mono text-gray-400">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top users */}
            {topUsers.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Utenti</div>
                <div className="space-y-1.5">
                  {topUsers.map(u => (
                    <div key={u.userId} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 truncate max-w-[120px]">{u.userName}</span>
                      <span className="text-xs font-mono text-gray-400">{u.count} · {formatBytes(u.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filtri */}
          <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Filtri</div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cerca nome file..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-400 dark:text-white"
                />
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Da data</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-400 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">A data</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-400 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo MIME</label>
                <select
                  value={mimeFilter}
                  onChange={e => setMimeFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-400 dark:text-white"
                >
                  <option value="">Tutti</option>
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="image">Immagini</option>
                  <option value="text">Testo / CSV</option>
                </select>
              </div>

              {(search || dateFrom || dateTo || mimeFilter) && (
                <button
                  onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setMimeFilter(''); }}
                  className="w-full text-xs text-gray-500 hover:text-cyan-600 transition flex items-center justify-center gap-1.5"
                >
                  <i className="fas fa-redo text-xs"></i>Reset filtri
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* ── Tabella ── */}
        <div className="flex flex-col flex-1 min-w-0 rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 shrink-0">
            <input
              type="checkbox"
              checked={selectedIds.length === files.length && files.length > 0}
              onChange={toggleAll}
              className="h-4 w-4 rounded text-cyan-600 border-gray-300 focus:ring-cyan-400"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">{total} file</span>
            {selectedIds.length > 0 && (
              <span className="text-sm text-cyan-600 dark:text-cyan-400">{selectedIds.length} selezionati</span>
            )}
            <div className="flex-1"></div>
            {selectedIds.length > 0 && (
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition"
              >
                <i className="fas fa-trash text-xs"></i>
                Elimina ({selectedIds.length})
              </button>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition disabled:opacity-50"
              title="Sincronizza con MinIO"
            >
              <i className={`fas fa-sync text-xs ${syncing ? 'animate-spin' : ''}`}></i>
              Sync
            </button>
            <button
              onClick={() => setCleanupOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
              title="Pulizia file"
            >
              <i className="fas fa-broom text-xs"></i>
              Pulizia
            </button>
            <button
              onClick={loadFiles}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              title="Ricarica"
            >
              <i className={`fas fa-sync-alt text-sm ${loading ? 'animate-spin' : ''}`}></i>
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {loading && files.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <i className="fas fa-spinner fa-spin text-2xl text-cyan-500"></i>
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <i className="fas fa-folder-open text-4xl mb-3"></i>
                <p className="text-sm">Nessun file trovato</p>
                <p className="text-[11px] mt-1 text-gray-300">La cartella jobs/ è vuota o i filtri non corrispondono</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                  <tr>
                    <th className="w-8 pl-4 py-3"></th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">File</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Dimensione</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Job</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Utente</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Caricato</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {files.map(file => {
                    const isSelected = selectedIds.includes(file.id);
                    const isActive = selectedFile?.id === file.id;
                    return (
                      <tr
                        key={file.id}
                        onClick={() => setSelectedFile(isActive ? null : file)}
                        className={`cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-cyan-50 dark:bg-cyan-900/20'
                            : isSelected
                            ? 'bg-indigo-50/50 dark:bg-indigo-900/10'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="pl-4 py-3 w-8" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(file.id)}
                            className="h-4 w-4 rounded text-cyan-600 border-gray-300 focus:ring-cyan-400"
                          />
                        </td>

                        {/* File */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <i className={`fas ${getFileIcon(file.mimeType)} text-lg ${getFileIconColor(file.mimeType)} shrink-0`}></i>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-800 dark:text-white truncate max-w-[220px]" title={file.fileName}>
                                {file.fileName}
                              </div>
                              <div className="text-xs font-mono text-gray-400 truncate max-w-[220px]" title={file.objectKey}>
                                {file.objectKey}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Size */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-gray-600 dark:text-gray-400">{formatBytes(file.fileSize)}</span>
                        </td>

                        {/* Job */}
                        <td className="px-4 py-3">
                          {file.job ? (
                            <div>
                              <div className="text-gray-700 dark:text-gray-300">{jobTypeLabel(file.job)}</div>
                              <div className="mt-1">{jobStatusBadge(file.job.status)}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* User */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-white">
                                {(file.user?.nome || file.user?.userName || 'S').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-gray-600 dark:text-gray-400">
                              {file.user?.nome || file.user?.userName || 'Sistema'}
                            </span>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-gray-500 dark:text-gray-400">{formatDate(file.uploadedAt)}</span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDownload(file.id, file.fileName)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                              title="Download"
                            >
                              <i className="fas fa-download text-xs"></i>
                            </button>
                            <button
                              onClick={() => confirmDelete(file.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                              title="Elimina"
                            >
                              <i className="fas fa-trash text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Paginazione */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-700 shrink-0">
              <span className="text-sm text-gray-500 dark:text-gray-400">Pag. {page} / {totalPages} · {total} file</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1} className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">«</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">‹</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">›</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">»</button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Offcanvas Dettaglio File ── */}
      <Offcanvas
        open={!!selectedFile}
        onClose={() => setSelectedFile(null)}
        title={selectedFile?.fileName || 'Dettaglio file'}
        icon={selectedFile ? getFileIcon(selectedFile.mimeType) : 'fa-file'}
        iconColor={selectedFile ? getFileIconColor(selectedFile.mimeType) : 'text-gray-400'}
        width="md"
        footer={
          selectedFile ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleDownload(selectedFile.id, selectedFile.fileName)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg transition"
              >
                <i className="fas fa-download"></i> Download
              </button>
              <button
                onClick={() => { confirmDelete(selectedFile.id); setSelectedFile(null); }}
                className="px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg transition"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          ) : undefined
        }
      >
        {selectedFile && (
          <div className="px-4 space-y-1">
            <DetailField label="ID" value={String(selectedFile.id)} mono />
            <DetailField label="Bucket" value={selectedFile.bucket} mono />
            <DetailField label="Percorso" value={selectedFile.objectKey} mono />
            <DetailField label="Dimensione" value={formatBytes(selectedFile.fileSize)} />
            <DetailField label="Caricato" value={formatDate(selectedFile.uploadedAt)} />
            <DetailField label="Ultimo accesso" value={formatDate(selectedFile.lastAccess)} />
            <DetailField label="Utente" value={selectedFile.user?.nome || selectedFile.user?.userName || 'Sistema'} />
            {selectedFile.job && (
              <>
                <div className="pt-3 pb-1">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Job collegato</span>
                </div>
                <DetailField label="Job ID" value={selectedFile.job.id.substring(0, 16) + '...'} mono />
                <DetailField label="Tipo" value={jobTypeLabel(selectedFile.job)} />
                <div className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700/50">
                  <span className="w-32 shrink-0 text-[11px] font-mono text-gray-400">Stato</span>
                  <div>{jobStatusBadge(selectedFile.job.status)}</div>
                </div>
              </>
            )}
            {selectedFile.metadata && (
              <>
                <div className="pt-3 pb-1">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Metadata</span>
                </div>
                <pre className="text-[10px] font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg whitespace-pre-wrap">
                  {JSON.stringify(selectedFile.metadata, null, 2)}
                </pre>
              </>
            )}
          </div>
        )}
      </Offcanvas>

      {/* ── Delete confirm ── */}
      <AnimatePresence>
        {(deleteTarget !== null || bulkDeleteConfirm) && (
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
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {bulkDeleteConfirm ? `Elimina ${selectedIds.length} file` : 'Elimina file'}
                  </h3>
                  <p className="text-xs text-gray-500">Operazione irreversibile</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
                {bulkDeleteConfirm
                  ? `Eliminare i ${selectedIds.length} file selezionati da MinIO?`
                  : 'Eliminare questo file da MinIO?'}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setDeleteTarget(null); setBulkDeleteConfirm(false); }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                >
                  Annulla
                </button>
                <button
                  onClick={bulkDeleteConfirm ? executeBulkDelete : executeDelete}
                  className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                  <i className="fas fa-trash mr-2"></i>Elimina
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cleanup modal ── */}
      <AnimatePresence>
        {cleanupOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <i className="fas fa-broom text-amber-600 dark:text-amber-400"></i>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Pulizia file jobs/</h3>
                  <p className="text-xs text-gray-500">Elimina file con filtri — irreversibile</p>
                </div>
              </div>
              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Da data</label>
                  <input type="date" value={cleanupFrom} onChange={e => setCleanupFrom(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">A data</label>
                  <input type="date" value={cleanupTo} onChange={e => setCleanupTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo MIME</label>
                  <select value={cleanupMime} onChange={e => setCleanupMime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  >
                    <option value="">Tutti i tipi</option>
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="image">Immagini</option>
                    <option value="text">Testo / CSV</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCleanupOpen(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">Annulla</button>
                <button onClick={handleCleanup} className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition">
                  <i className="fas fa-broom mr-2"></i>Avvia pulizia
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Helper component ──────────────────────────────────────────────────────────

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <span className="w-32 shrink-0 text-[11px] font-mono text-gray-400 pt-0.5">{label}</span>
      <span className={`flex-1 text-xs text-gray-800 dark:text-gray-200 break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
