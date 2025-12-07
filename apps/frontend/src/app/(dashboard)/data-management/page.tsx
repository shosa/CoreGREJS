'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TableInfo {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  description: string;
}

const availableTables: TableInfo[] = [
  { name: 'riparazioni', displayName: 'Riparazioni', icon: 'fa-tools', color: 'blue', description: 'Gestisci record riparazioni' },
  { name: 'produzione', displayName: 'Produzione', icon: 'fa-industry', color: 'yellow', description: 'Gestisci dati produzione' },
  { name: 'quality', displayName: 'Quality Control', icon: 'fa-check-circle', color: 'green', description: 'Gestisci controlli qualità' },
  { name: 'export', displayName: 'Export/DDT', icon: 'fa-file-export', color: 'purple', description: 'Gestisci documenti di trasporto' },
  { name: 'users', displayName: 'Utenti', icon: 'fa-users', color: 'gray', description: 'Gestisci utenti sistema' },
];

interface DataRecord {
  id: number;
  [key: string]: any;
}

export default function DataManagementPage() {
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

  const filteredTables = availableTables.filter(table =>
    table.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    table.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchTableData = async () => {
    if (!selectedTable) return;

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

      const response = await fetch(`/api/data-management/tables/${selectedTable}/data?${params}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setTableData(result.data || []);
        setTotalPages(result.pagination?.totalPages || 1);
        setTotal(result.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
    } finally {
      setLoading(false);
    }
  };

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
    try {
      const authStorage = localStorage.getItem('coregre-auth');
      const token = authStorage ? JSON.parse(authStorage).state?.token : null;

      const response = await fetch(`/api/data-management/tables/${selectedTable}/record/${record.id}`, {
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
      } else {
        alert('Errore durante il salvataggio');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Errore durante il salvataggio');
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo record?')) return;

    try {
      const authStorage = localStorage.getItem('coregre-auth');
      const token = authStorage ? JSON.parse(authStorage).state?.token : null;

      const response = await fetch(`/api/data-management/tables/${selectedTable}/record/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (response.ok) {
        fetchTableData();
      } else {
        alert('Errore durante l\'eliminazione');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Errore durante l\'eliminazione');
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { gradient: string; bg: string; text: string; hover: string }> = {
      blue: { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-600', hover: 'hover:bg-blue-100' },
      yellow: { gradient: 'from-yellow-500 to-yellow-600', bg: 'bg-yellow-50', text: 'text-yellow-600', hover: 'hover:bg-yellow-100' },
      green: { gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', text: 'text-green-600', hover: 'hover:bg-green-100' },
      purple: { gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', text: 'text-purple-600', hover: 'hover:bg-purple-100' },
      orange: { gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', text: 'text-orange-600', hover: 'hover:bg-orange-100' },
      gray: { gradient: 'from-gray-500 to-gray-600', bg: 'bg-gray-50', text: 'text-gray-600', hover: 'hover:bg-gray-100' },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-md p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              <i className="fas fa-database text-cyan-500 mr-3"></i>
              Gestione Dati
            </h1>
            <p className="mt-2 text-gray-600">
              Strumento di manutenzione per correzioni, fix e operazioni sui dati
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
            <i className="fas fa-exclamation-triangle text-orange-500"></i>
            <span className="text-sm font-medium text-orange-700">Solo Admin</span>
          </div>
        </div>
      </motion.div>

      {!selectedTable ? (
        <>
          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="relative">
              <input
                type="text"
                placeholder="Cerca tabella o modulo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>
          </motion.div>

          {/* Table Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTables.map((table, index) => {
              const colors = getColorClasses(table.color);
              return (
                <motion.div
                  key={table.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  onClick={() => setSelectedTable(table.name)}
                  className={`bg-white rounded-xl shadow-md p-6 cursor-pointer transition-all ${colors.hover} hover:shadow-lg`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-r ${colors.gradient} flex items-center justify-center`}>
                      <i className={`fas ${table.icon} text-white text-xl`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {table.displayName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {table.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className={`text-xs font-medium ${colors.text}`}>
                      <i className="fas fa-table mr-1"></i>
                      {table.name}
                    </span>
                    <i className="fas fa-arrow-right text-gray-400"></i>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredTables.length === 0 && (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <i className="fas fa-search text-gray-300 text-5xl mb-4"></i>
              <p className="text-gray-500">Nessuna tabella trovata</p>
            </div>
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Table Header */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedTable(null);
                    setTableData([]);
                    setPage(1);
                    setTableSearch('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Indietro
                </button>
                <div className="h-8 w-px bg-gray-300"></div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {availableTables.find(t => t.name === selectedTable)?.displayName}
                </h2>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                  {total} record
                </span>
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
                              className="text-red-600 hover:text-red-700 ml-3"
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
    </div>
  );
}
