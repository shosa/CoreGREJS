'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import Pagination from '@/components/ui/Pagination';
import Offcanvas from '@/components/ui/Offcanvas';
import Modal from '@/components/ui/Modal';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { showError, showSuccess } from '@/store/notifications';
import { formatBytes, formatDate } from '@/lib/utils';

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
  metadata?: {
    type?: string;
    jobId?: string;
    progressivo?: string;
    cartellino?: string;
  } | null;
  user?: { id: number; userName: string; nome: string };
  job?: { id: string; type: string; status: string };
}

interface FileStats {
  totalFiles: number;
  totalSize: number;
  filesByUser: Array<{ userId: number; userName: string; count: number; size: number }>;
  filesByType: Array<{ mimeType: string; count: number; size: number }>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function FileManagerPage() {
  const [files, setFiles] = useState<MinioFile[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [syncing, setSyncing] = useState(false);

  // Detail offcanvas
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<MinioFile | null>(null);

  // Cleanup modal
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupFilters, setCleanupFilters] = useState({
    userId: '',
    dateFrom: '',
    dateTo: '',
    mimeType: '',
  });

  // Filtri
  const [filters, setFilters] = useState({
    search: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
    mimeType: '',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    loadFiles();
    loadStats();
  }, [pagination.page, filters]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.mimeType && { mimeType: filters.mimeType }),
      });

      const response = await api.get(`/files?${params}`);
      setFiles(response.data.files);
      setPagination(response.data.pagination);
    } catch (error: any) {
      showError('Errore caricamento file');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/files/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const handleDownload = async (fileId: number, fileName?: string) => {
    try {
      const response = await api.get(`/files/${fileId}/download`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showError('Errore download file');
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo file?')) return;

    try {
      await api.delete(`/files/${fileId}`);
      showSuccess('File eliminato');
      loadFiles();
      loadStats();
    } catch (error) {
      showError('Errore eliminazione file');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      showError('Nessun file selezionato');
      return;
    }

    if (!confirm(`Eliminare ${selectedIds.length} file?`)) return;

    try {
      for (const fileId of selectedIds) {
        await api.delete(`/files/${fileId}`);
      }
      showSuccess(`${selectedIds.length} file eliminati`);
      setSelectedIds([]);
      loadFiles();
      loadStats();
    } catch (error) {
      showError('Errore eliminazione multipla');
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await api.get('/files/sync/minio');
      showSuccess(`Sincronizzati ${response.data.synced} file`);
      loadFiles();
      loadStats();
    } catch (error) {
      showError('Errore sincronizzazione');
    } finally {
      setSyncing(false);
    }
  };

  const handleCleanup = async () => {
    try {
      const params = new URLSearchParams({
        ...(cleanupFilters.userId && { userId: cleanupFilters.userId }),
        ...(cleanupFilters.dateFrom && { dateFrom: cleanupFilters.dateFrom }),
        ...(cleanupFilters.dateTo && { dateTo: cleanupFilters.dateTo }),
        ...(cleanupFilters.mimeType && { mimeType: cleanupFilters.mimeType }),
      });

      const response = await api.delete(`/files?${params}`);
      showSuccess(`Eliminati ${response.data.deleted} file (${formatBytes(response.data.size)})`);
      setCleanupOpen(false);
      setCleanupFilters({ userId: '', dateFrom: '', dateTo: '', mimeType: '' });
      loadFiles();
      loadStats();
    } catch (error) {
      showError('Errore pulizia file');
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === files.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(files.map((f) => f.id));
    }
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return 'fa-file';
    if (mimeType.includes('pdf')) return 'fa-file-pdf';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-file-word';
    if (mimeType.includes('image')) return 'fa-file-image';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'fa-file-archive';
    if (mimeType.includes('text')) return 'fa-file-alt';
    return 'fa-file';
  };

  const getFileInfo = (file: MinioFile): string => {
    if (!file.metadata) return '-';
    const meta = file.metadata as any;

    if (meta.type === 'job' && meta.jobId) {
      return `Job: ${meta.jobId.substring(0, 8)}...`;
    } else if (meta.type === 'export' && meta.progressivo) {
      return `DDT: ${meta.progressivo}`;
    } else if (meta.type === 'quality' && meta.cartellino) {
      return `CQ: ${meta.cartellino}`;
    }
    return '-';
  };

  if (loading && files.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-blue-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      {/* Header */}
      <PageHeader
        title="File Manager"
        subtitle="Gestione file su MinIO"
      />

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'File Manager' },
        ]}
      />

      {/* Stats Cards */}
      {stats && (
        <motion.div variants={containerVariants} className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
                <i className="fas fa-file text-white"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">File Totali</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalFiles}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-green-600 shadow-lg">
                <i className="fas fa-database text-white"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Spazio Totale</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatBytes(stats.totalSize)}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg">
                <i className="fas fa-users text-white"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Utenti</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.filesByUser.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">
                <i className="fas fa-layer-group text-white"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tipi File</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.filesByType.length}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Files Table */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 overflow-hidden"
      >
        {/* Table Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <i className="fas fa-folder-open mr-3 text-blue-500"></i>
            Lista File
          </h3>
          <div className="flex items-center space-x-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedIds.length === files.length && files.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Seleziona tutto</span>
            </label>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Cerca file..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFilters({ search: '', userId: '', dateFrom: '', dateTo: '', mimeType: '' })}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
            >
              <i className="fas fa-redo mr-2"></i>
              Reset Filtri
            </motion.button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <input type="checkbox" className="h-4 w-4 opacity-0" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">File</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Dimensione</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Utente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <AnimatePresence>
                {files.map((file) => (
                  <motion.tr
                    key={file.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                    className="transition-colors"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(file.id)}
                        onChange={() => toggleSelect(file.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <i className={`fas ${getFileIcon(file.mimeType)} text-2xl text-gray-400`}></i>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{file.fileName}</div>
                          <div className="text-xs text-gray-500">{file.mimeType || 'N/D'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatBytes(file.fileSize)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {getFileInfo(file)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {file.user?.nome || 'Sistema'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(file.uploadedAt)}
                    </td>
                      <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedFile(file);
                            setDetailOpen(true);
                          }}
                          className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                          title="Dettagli"
                        >
                          <i className="fas fa-info-circle"></i>
                        </button>
                        <button
                          onClick={() => handleDownload(file.id, file.fileName)}
                          className="px-3 py-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 transition-colors"
                          title="Download"
                        >
                          <i className="fas fa-download"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
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
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          onPageChange={(page) => setPagination({ ...pagination, page })}
          itemsPerPage={pagination.limit}
          totalItems={pagination.total}
          onItemsPerPageChange={(limit) => setPagination({ ...pagination, limit })}
        />
      </motion.div>

      {/* Detail Offcanvas */}
      <Offcanvas
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Dettagli File"
        icon="fa-info-circle"
        iconColor="text-blue-500"
        width="lg"
      >
        {selectedFile && (
          <div className="px-6 space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
              <i className={`fas ${getFileIcon(selectedFile.mimeType)} text-4xl text-gray-400`}></i>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white text-lg">{selectedFile.fileName}</h4>
                <p className="text-sm text-gray-500">{selectedFile.mimeType || 'Tipo sconosciuto'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <DetailRow label="ID File" value={selectedFile.id.toString()} />
              <DetailRow label="Bucket" value={selectedFile.bucket} />
              <DetailRow label="Percorso Completo" value={selectedFile.objectKey} mono />
              <DetailRow label="Dimensione" value={formatBytes(selectedFile.fileSize)} />
              <DetailRow label="Caricato il" value={formatDate(selectedFile.uploadedAt)} />
              <DetailRow label="Ultimo Accesso" value={formatDate(selectedFile.lastAccess)} />
              <DetailRow label="Utente" value={selectedFile.user?.nome || 'Sistema'} />
              <DetailRow label="Info" value={getFileInfo(selectedFile)} />
              {selectedFile.metadata && (
                <DetailRow label="Metadata" value={JSON.stringify(selectedFile.metadata, null, 2)} mono />
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleDownload(selectedFile.id, selectedFile.fileName)}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
              >
                <i className="fas fa-download mr-2"></i>
                Download
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  handleDelete(selectedFile.id);
                  setDetailOpen(false);
                }}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
              >
                <i className="fas fa-trash mr-2"></i>
                Elimina
              </motion.button>
            </div>
          </div>
        )}
      </Offcanvas>

      {/* Cleanup Modal */}
      <Modal
        open={cleanupOpen}
        onClose={() => setCleanupOpen(false)}
        title="Pulizia File Filtrata"
        icon="fa-broom"
        iconColor="text-orange-500"
        size="lg"
        footer={
          <>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCleanupOpen(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium"
            >
              Annulla
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCleanup}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:shadow-lg font-medium"
            >
              <i className="fas fa-broom mr-2"></i>
              Avvia Pulizia
            </motion.button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Seleziona i filtri per eliminare i file. <strong>Attenzione:</strong> questa operazione è irreversibile!
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Da Data
              </label>
              <input
                type="date"
                value={cleanupFilters.dateFrom}
                onChange={(e) => setCleanupFilters({ ...cleanupFilters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                A Data
              </label>
              <input
                type="date"
                value={cleanupFilters.dateTo}
                onChange={(e) => setCleanupFilters({ ...cleanupFilters, dateTo: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo File
              </label>
              <select
                value={cleanupFilters.mimeType}
                onChange={(e) => setCleanupFilters({ ...cleanupFilters, mimeType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Tutti i tipi</option>
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="image">Immagini</option>
                <option value="text">Testo</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Footer */}
      <Footer show>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {stats && (
              <>
                <i className="fas fa-database mr-2"></i>
                {stats.totalFiles} file • {formatBytes(stats.totalSize)}
              </>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-5 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50"
            >
              {syncing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Sincronizzazione...
                </>
              ) : (
                <>
                  <i className="fas fa-sync mr-2"></i>
                  Sincronizza da MinIO
                </>
              )}
            </button>
            <button
              onClick={() => setCleanupOpen(true)}
              className="px-5 py-3 rounded-lg border-2 border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300 font-medium hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
            >
              <i className="fas fa-broom mr-2"></i>
              Pulizia Filtrata
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={selectedIds.length === 0}
              className="px-5 py-3 rounded-lg border-2 border-red-300 text-red-700 dark:border-red-700 dark:text-red-300 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
            >
              <i className="fas fa-trash mr-2"></i>
              Elimina Selezionati ({selectedIds.length})
            </button>
          </div>
        </div>
      </Footer>
    </motion.div>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-sm text-gray-900 dark:text-white ${mono ? 'font-mono text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded' : ''}`}>
        {value}
      </span>
    </div>
  );
}
