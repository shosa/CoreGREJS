'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { usersApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

interface User {
  id: number;
  userName: string;
  nome: string;
  mail: string;
  lastLogin: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      const [usersData, statsData] = await Promise.all([
        usersApi.getAll(),
        usersApi.getStats(),
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (error) {
      showError('Errore nel caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;
    try {
      await usersApi.delete(id);
      showSuccess('Utente eliminato con successo');
      fetchData();
    } catch (error) {
      showError("Errore durante l'eliminazione");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Sei sicuro di voler eliminare ${selectedIds.length} utenti?`)) return;
    setDeleting(true);
    try {
      await usersApi.deleteBulk(selectedIds);
      showSuccess(`${selectedIds.length} utenti eliminati con successo`);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      showError("Errore durante l'eliminazione");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedUsers.map((u) => u.id));
    }
  };

  // Filter + pagination
  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.nome.toLowerCase().includes(q) ||
      u.userName.toLowerCase().includes(q) ||
      u.mail?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  // Derived
  const recentLogins = users.filter((u) => {
    if (!u.lastLogin) return false;
    const diff = Date.now() - new Date(u.lastLogin).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000; // last 7 days
  }).length;

  const neverLogged = users.filter((u) => !u.lastLogin).length;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="shrink-0">
        <PageHeader
          title="Gestione Utenti"
          subtitle="Gestisci gli utenti del sistema e i loro permessi"
        />
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/', icon: 'fa-home' },
            { label: 'Gestione Utenti' },
          ]}
        />
      </motion.div>

      {/* Body: sidebar + main */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden min-h-0 mt-4"
      >
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-60 shrink-0 flex-col gap-3 overflow-y-auto">
          {/* Stats */}
          <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Statistiche
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                <i className="fas fa-users text-white text-xs"></i>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Totale utenti</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {stats?.total ?? '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
                <i className="fas fa-clock text-white text-xs"></i>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Attivi (7 gg)</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-400 leading-tight">
                  {recentLogins}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-red-500">
                <i className="fas fa-user-slash text-white text-xs"></i>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Mai connessi</p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400 leading-tight">
                  {neverLogged}
                </p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Azioni Rapide
            </p>
            <Link href="/users/create" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              <i className="fas fa-user-plus text-xs w-4 text-center"></i>
              Nuovo Utente
            </Link>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0 || deleting}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="fas fa-trash-alt text-xs w-4 text-center"></i>
              {deleting
                ? 'Eliminazione…'
                : selectedIds.length > 0
                ? `Elimina selezionati (${selectedIds.length})`
                : 'Elimina selezionati'}
            </button>
          </div>

          {/* Search */}
          <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Cerca
            </p>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                placeholder="Nome, username, email…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                <i className="fas fa-times mr-1"></i>Azzera ricerca
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow">
          {/* Toolbar */}
          <div className="shrink-0 px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paginatedUsers.length > 0 && selectedIds.length === paginatedUsers.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">Seleziona pagina</span>
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {loading
                  ? 'Caricamento…'
                  : searchQuery
                  ? `${filteredUsers.length} risultati`
                  : `${users.length} utenti`}
              </span>
              {selectedIds.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                  {selectedIds.length} selezionati
                </span>
              )}
            </div>
            <Link href="/users/create">
              <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:shadow-md transition-all whitespace-nowrap">
                <i className="fas fa-user-plus text-xs"></i>
                Nuovo Utente
              </button>
            </Link>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center py-16">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent"
                />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 z-10">
                  <tr>
                    <th className="px-4 py-3 w-10"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Utente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Ultimo Accesso
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  <AnimatePresence>
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                          <i className="fas fa-users text-3xl mb-2 block opacity-40"></i>
                          {searchQuery ? 'Nessun risultato per questa ricerca' : 'Nessun utente trovato'}
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user, index) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: index * 0.03 }}
                          className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
                            selectedIds.includes(user.id)
                              ? 'bg-blue-50 dark:bg-blue-900/10'
                              : ''
                          }`}
                        >
                          <td className="px-4 py-3 w-10">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(user.id)}
                              onChange={() => toggleSelect(user.id)}
                              className="h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 shadow">
                                <span className="text-xs font-bold text-white">
                                  {user.nome.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{user.nome}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">@{user.userName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {user.mail || <span className="text-gray-300 dark:text-gray-600 italic">Non specificata</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {user.lastLogin ? (
                              <span className="flex items-center gap-1.5">
                                <i className="fas fa-clock text-xs text-gray-400"></i>
                                {new Date(user.lastLogin).toLocaleDateString('it-IT')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                                Mai
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <Link href={`/users/${user.id}/permissions`}>
                                <button
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                                  title="Gestisci Permessi"
                                >
                                  <i className="fas fa-user-cog text-xs"></i>
                                </button>
                              </Link>
                              <Link href={`/users/${user.id}/edit`}>
                                <button
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                  title="Modifica"
                                >
                                  <i className="fas fa-edit text-xs"></i>
                                </button>
                              </Link>
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                title="Elimina"
                              >
                                <i className="fas fa-trash-alt text-xs"></i>
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="shrink-0 border-t border-gray-200 dark:border-gray-700">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredUsers.length}
              onItemsPerPageChange={(newValue) => {
                setItemsPerPage(newValue);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
