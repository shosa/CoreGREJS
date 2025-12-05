'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { usersApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';

interface PermissionItem {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const permissionsList: PermissionItem[] = [
  { key: 'riparazioni', name: 'Riparazioni', description: 'Gestione delle riparazioni e ordini di lavoro', icon: 'fa-hammer', color: 'blue' },
  { key: 'produzione', name: 'Produzione', description: 'Gestione della produzione', icon: 'fa-industry', color: 'yellow' },
  { key: 'qualita', name: 'Controllo Qualità', description: 'Sistema di controllo e verifica qualità', icon: 'fa-check-circle', color: 'green' },
  { key: 'export', name: 'Export', description: 'Gestione esportazioni e documenti', icon: 'fa-file-export', color: 'purple' },
  { key: 'scm_admin', name: 'SCM', description: 'Supply Chain Management', icon: 'fa-shipping-fast', color: 'indigo' },
  { key: 'tracking', name: 'Tracking', description: 'Tracciabilità materiali', icon: 'fa-map-marker-alt', color: 'red' },
  { key: 'mrp', name: 'MRP', description: 'Gestione Ordini e Fabbisogni', icon: 'fa-box', color: 'orange' },
  { key: 'users', name: 'Gestione Utenti', description: 'Gestione Utenti COREGRE', icon: 'fa-users', color: 'teal' },
  { key: 'log', name: 'Log Attività', description: 'Gestione del registro attività', icon: 'fa-chart-line', color: 'gray' },
  { key: 'etichette', name: 'Etichette DYMO', description: 'Stampa e Crea liste', icon: 'fa-barcode', color: 'blue' },
  { key: 'dbsql', name: 'Database e Migrazioni', description: 'Modifiche Database, SQL e sistema migrazioni', icon: 'fa-database', color: 'indigo' },
  { key: 'settings', name: 'Impostazioni', description: 'Accesso alle impostazioni e import Dati', icon: 'fa-cog', color: 'orange' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function UserPermissionsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, permsData] = await Promise.all([
          usersApi.getOne(userId),
          usersApi.getPermissions(userId),
        ]);
        setUser(userData);

        // Normalizza le chiavi dei permessi (converte vecchie chiavi in nuove)
        const normalizedPerms: Record<string, boolean> = { ...permsData };

        // Migra chiavi vecchie se presenti
        if ('quality' in normalizedPerms) {
          normalizedPerms.qualita = normalizedPerms.quality;
          delete normalizedPerms.quality;
        }
        if ('scm' in normalizedPerms) {
          normalizedPerms.scm_admin = normalizedPerms.scm;
          delete normalizedPerms.scm;
        }
        if ('utenti' in normalizedPerms) {
          normalizedPerms.users = normalizedPerms.utenti;
          delete normalizedPerms.utenti;
        }

        setPermissions(normalizedPerms || {});
      } catch (error) {
        showError('Errore nel caricamento dei permessi');
        router.push('/users');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, router]);

  const togglePermission = (key: string) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const selectAll = () => {
    const allSelected: Record<string, boolean> = {};
    permissionsList.forEach((p) => {
      allSelected[p.key] = true;
    });
    allSelected.admin = true;
    setPermissions(allSelected);
  };

  const clearAll = () => {
    const allCleared: Record<string, boolean> = {};
    permissionsList.forEach((p) => {
      allCleared[p.key] = false;
    });
    allCleared.admin = false;
    setPermissions(allCleared);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersApi.updatePermissions(userId, permissions);
      showSuccess('Permessi aggiornati con successo');
    } catch (error) {
      showError('Errore durante il salvataggio');
    } finally {
      setSaving(false);
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

  const getColorClasses = (color: string) => {
    const colors: Record<string, { text: string; bg: string; ring: string }> = {
      blue: { text: 'text-blue-500', bg: 'bg-blue-600', ring: 'focus:ring-blue-500' },
      yellow: { text: 'text-yellow-500', bg: 'bg-yellow-600', ring: 'focus:ring-yellow-500' },
      green: { text: 'text-green-500', bg: 'bg-green-600', ring: 'focus:ring-green-500' },
      purple: { text: 'text-purple-500', bg: 'bg-purple-600', ring: 'focus:ring-purple-500' },
      indigo: { text: 'text-indigo-500', bg: 'bg-indigo-600', ring: 'focus:ring-indigo-500' },
      red: { text: 'text-red-500', bg: 'bg-red-600', ring: 'focus:ring-red-500' },
      orange: { text: 'text-orange-500', bg: 'bg-orange-600', ring: 'focus:ring-orange-500' },
      teal: { text: 'text-teal-500', bg: 'bg-teal-600', ring: 'focus:ring-teal-500' },
      gray: { text: 'text-gray-500', bg: 'bg-gray-600', ring: 'focus:ring-gray-500' },
    };
    return colors[color] || colors.blue;
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
              Gestione Permessi
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Configura i permessi per {user?.nome} (@{user?.userName})
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <Link href={`/users/${userId}/edit`}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex items-center rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:bg-gray-800 dark:text-blue-300">
                <i className="fas fa-user-edit mr-2"></i>Modifica Utente
              </motion.button>
            </Link>
            <Link href="/users">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <i className="fas fa-arrow-left mr-2"></i>Torna alla Lista
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Breadcrumb */}
      <motion.nav variants={itemVariants} className="flex mb-8">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li><Link href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400"><i className="fas fa-home mr-2"></i>Dashboard</Link></li>
          <li><div className="flex items-center"><i className="fas fa-chevron-right text-gray-400 mx-2"></i><Link href="/users" className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400">Utenti</Link></div></li>
          <li><div className="flex items-center"><i className="fas fa-chevron-right text-gray-400 mx-2"></i><span className="text-sm font-medium text-gray-500 dark:text-gray-400">Permessi - {user?.nome}</span></div></li>
        </ol>
      </motion.nav>

      {/* User Info Card */}
      <motion.div variants={itemVariants} className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center">
          <motion.div whileHover={{ scale: 1.1 }} className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg">
            <span className="text-white text-2xl font-bold">{user?.nome?.charAt(0)}</span>
          </motion.div>
          <div className="ml-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{user?.nome}</h3>
            <p className="text-gray-600 dark:text-gray-400">@{user?.userName}</p>
            <div className="flex items-center mt-2">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getBadgeColor(user?.adminType)}`}>
                {user?.adminType?.charAt(0).toUpperCase() + user?.adminType?.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Permissions Form */}
      <form onSubmit={handleSubmit}>
        <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {permissionsList.map((perm) => {
            const colors = getColorClasses(perm.color);
            return (
              <motion.div
                key={perm.key}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <i className={`fas ${perm.icon} mr-3 ${colors.text}`}></i>
                    {perm.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{perm.description}</p>
                </div>
                <div className="p-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions[perm.key] || false}
                      onChange={() => togglePermission(perm.key)}
                      className={`h-4 w-4 ${colors.bg} border-gray-300 rounded ${colors.ring}`}
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Accesso completo al modulo
                    </span>
                  </label>
                </div>
              </motion.div>
            );
          })}

          {/* Admin Permission */}
          <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} className="rounded-2xl border border-red-200 bg-white shadow-lg dark:border-red-800 dark:bg-gray-800">
            <div className="p-6 border-b border-red-200 dark:border-red-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <i className="fas fa-user-shield mr-3 text-red-500"></i>
                Amministrazione
              </h3>
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                <i className="fas fa-exclamation-triangle mr-1"></i>
                <strong>Attenzione:</strong> Fornisce accesso specifico a gestioni tecniche.
              </p>
            </div>
            <div className="p-6 bg-red-50 dark:bg-red-900/10">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.admin || false}
                  onChange={() => togglePermission('admin')}
                  className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="ml-3 text-sm font-medium text-red-700 dark:text-red-300">
                  Permessi di amministratore
                </span>
              </label>
            </div>
          </motion.div>
        </motion.div>

        {/* Actions */}
        <motion.div variants={itemVariants} className="mt-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.button
              type="button"
              onClick={selectAll}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-4 py-2 border border-green-300 rounded-lg text-sm font-medium text-green-700 bg-white hover:bg-green-50 dark:bg-gray-700 dark:text-green-300"
            >
              <i className="fas fa-check-double mr-2"></i>Seleziona Tutto
            </motion.button>
            <motion.button
              type="button"
              onClick={clearAll}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 dark:bg-gray-700 dark:text-red-300"
            >
              <i className="fas fa-times mr-2"></i>Deseleziona Tutto
            </motion.button>
          </div>

          <div className="flex items-center space-x-3">
            <Link href="/users">
              <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                <i className="fas fa-times mr-2"></i>Annulla
              </motion.button>
            </Link>
            <motion.button
              type="submit"
              disabled={saving}
              whileHover={{ scale: saving ? 1 : 1.02, y: saving ? 0 : -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md disabled:opacity-50"
            >
              {saving ? (
                <><motion.i animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="fas fa-spinner mr-2" />Salvataggio...</>
              ) : (
                <><i className="fas fa-save mr-2"></i>Salva Permessi</>
              )}
            </motion.button>
          </div>
        </motion.div>
      </form>
    </motion.div>
  );
}
