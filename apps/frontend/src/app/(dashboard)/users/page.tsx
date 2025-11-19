'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { usersApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';

interface User {
  id: number;
  userName: string;
  nome: string;
  mail: string;
  adminType: string;
  lastLogin: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  admins: number;
  managers: number;
  users: number;
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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

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

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;

    try {
      await usersApi.delete(id);
      showSuccess('Utente eliminato con successo');
      fetchData();
    } catch (error) {
      showError('Errore durante l\'eliminazione');
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
      showError('Errore durante l\'eliminazione');
    } finally {
      setDeleting(false);
    }
  };

  const getBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      user: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    };
    return colors[type] || colors.user;
  };

  if (loading) {
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
      <motion.div variants={itemVariants} className="mb-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Gestione Utenti
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Gestisci gli utenti del sistema e i loro permessi
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link href="/users/create">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all"
              >
                <i className="fas fa-user-plus mr-2"></i>
                Nuovo Utente
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Breadcrumb */}
      <motion.nav variants={itemVariants} className="flex mb-8">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li>
            <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white">
              <i className="fas fa-home mr-2"></i>
              Dashboard
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <i className="fas fa-chevron-right text-gray-400 mx-2"></i>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Gestione Utenti
              </span>
            </div>
          </li>
        </ol>
      </motion.nav>

      {/* Stats Cards */}
      <motion.div variants={containerVariants} className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
              <i className="fas fa-users text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Totale Utenti</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="text-2xl font-bold text-gray-900 dark:text-white"
              >
                {stats?.total || 0}
              </motion.p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-red-600 shadow-lg">
              <i className="fas fa-user-shield text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Amministratori</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.admins || 0}</p>
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
              <i className="fas fa-user-tie text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Manager</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.managers || 0}</p>
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
              <i className="fas fa-user text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Utenti Standard</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.users || 0}</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Users Table */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
      >
        {/* Table Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <i className="fas fa-users mr-3 text-blue-500"></i>
            Lista Utenti
          </h3>
          <div className="flex items-center space-x-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedIds.length === users.length && users.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Seleziona tutto</span>
            </label>
            <motion.button
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0 || deleting}
              whileHover={{ scale: selectedIds.length > 0 ? 1.05 : 1 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-trash-alt mr-1"></i>
              Elimina Selezionati
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Utente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ruolo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ultimo Accesso
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <AnimatePresence>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-gray-500 dark:text-gray-400">
                        <i className="fas fa-users text-4xl mb-4"></i>
                        <p className="text-lg font-medium">Nessun utente trovato</p>
                        <Link href="/users/create" className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                          <i className="fas fa-plus mr-2"></i>
                          Aggiungi Utente
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedIds.includes(user.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg"
                          >
                            <span className="text-white font-bold">{user.nome.charAt(0)}</span>
                          </motion.div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.nome}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              @{user.userName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {user.mail || 'Non specificata'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(user.adminType)}`}>
                          {user.adminType.charAt(0).toUpperCase() + user.adminType.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString('it-IT')
                          : 'Mai'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link href={`/users/${user.id}/permissions`}>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400"
                              title="Gestisci Permessi"
                            >
                              <i className="fas fa-user-cog"></i>
                            </motion.button>
                          </Link>
                          <Link href={`/users/${user.id}/edit`}>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                              title="Modifica"
                            >
                              <i className="fas fa-edit"></i>
                            </motion.button>
                          </Link>
                          <motion.button
                            onClick={() => handleDelete(user.id)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                            title="Elimina"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
