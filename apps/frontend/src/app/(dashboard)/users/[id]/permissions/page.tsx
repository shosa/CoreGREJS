'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { usersApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';
import Footer from '@/components/layout/Footer';

interface PermissionItem {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface PermissionCategory {
  name: string;
  description: string;
  permissions: PermissionItem[];
}

const permissionsCategories: PermissionCategory[] = [
  {
    name: 'Moduli Operativi',
    description: 'Moduli per la gestione operativa quotidiana',
    permissions: [
      { key: 'riparazioni', name: 'Riparazioni', description: 'Gestione riparazioni e ordini di lavoro', icon: 'fa-hammer', color: 'blue' },
      { key: 'produzione', name: 'Produzione', description: 'Pianificazione e gestione produzione', icon: 'fa-calendar', color: 'yellow' },
      { key: 'quality', name: 'Controllo Qualità', description: 'Sistema controllo e verifica qualità prodotti', icon: 'fa-check-circle', color: 'green' },
      { key: 'export', name: 'Export', description: 'Gestione esportazioni e documentazione DDT', icon: 'fa-globe-europe', color: 'purple' },
    ]
  },
  {
    name: 'Supply Chain & Logistica',
    description: 'Moduli per la gestione della catena di approvvigionamento',
    permissions: [
      { key: 'scm_admin', name: 'SCM', description: 'Supply Chain Management e lanci produzione', icon: 'fa-industry', color: 'orange' },
      { key: 'tracking', name: 'Tracking', description: 'Tracciabilità materiali e movimentazioni', icon: 'fa-map-marker-alt', color: 'red' },
    ]
  },
  {
    name: 'Sistemi Mobile',
    description: 'Accesso ai sistemi mobile e applicazioni dedicate',
    permissions: [
      { key: 'inwork', name: 'InWork', description: 'Sistema gestione operatori e permessi mobile', icon: 'fa-mobile', color: 'slate' },
    ]
  },
  {
    name: 'Amministrazione',
    description: 'Pannelli amministrativi e strumenti di gestione sistema',
    permissions: [
      { key: 'users', name: 'Gestione Utenti', description: 'Creazione, modifica e gestione utenti sistema', icon: 'fa-users', color: 'teal' },
      { key: 'settings', name: 'Impostazioni', description: 'Configurazione sistema e import dati', icon: 'fa-cog', color: 'gray' },
      { key: 'log', name: 'Log Attività', description: 'Visualizzazione audit log e attività sistema', icon: 'fa-history', color: 'cyan' },
      { key: 'dbsql', name: 'Gestione Dati', description: 'Accesso database, query SQL e migrazioni', icon: 'fa-database', color: 'indigo' },
    ]
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
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
        setPermissions(permsData || {});
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
    permissionsCategories.forEach((category) => {
      category.permissions.forEach((p) => {
        allSelected[p.key] = true;
      });
    });
    setPermissions(allSelected);
  };

  const clearAll = () => {
    const allCleared: Record<string, boolean> = {};
    permissionsCategories.forEach((category) => {
      category.permissions.forEach((p) => {
        allCleared[p.key] = false;
      });
    });
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

  const getColorClasses = (color: string) => {
    const colors: Record<string, { border: string; bg: string; hover: string; icon: string; toggle: string }> = {
      blue: { border: 'border-blue-200 dark:border-blue-800/50', bg: 'bg-blue-50 dark:bg-blue-900/10', hover: 'hover:border-blue-300 dark:hover:border-blue-700', icon: 'text-blue-600 dark:text-blue-400', toggle: 'peer-checked:bg-blue-600' },
      yellow: { border: 'border-yellow-200 dark:border-yellow-800/50', bg: 'bg-yellow-50 dark:bg-yellow-900/10', hover: 'hover:border-yellow-300 dark:hover:border-yellow-700', icon: 'text-yellow-600 dark:text-yellow-400', toggle: 'peer-checked:bg-yellow-600' },
      green: { border: 'border-green-200 dark:border-green-800/50', bg: 'bg-green-50 dark:bg-green-900/10', hover: 'hover:border-green-300 dark:hover:border-green-700', icon: 'text-green-600 dark:text-green-400', toggle: 'peer-checked:bg-green-600' },
      purple: { border: 'border-purple-200 dark:border-purple-800/50', bg: 'bg-purple-50 dark:bg-purple-900/10', hover: 'hover:border-purple-300 dark:hover:border-purple-700', icon: 'text-purple-600 dark:text-purple-400', toggle: 'peer-checked:bg-purple-600' },
      orange: { border: 'border-orange-200 dark:border-orange-800/50', bg: 'bg-orange-50 dark:bg-orange-900/10', hover: 'hover:border-orange-300 dark:hover:border-orange-700', icon: 'text-orange-600 dark:text-orange-400', toggle: 'peer-checked:bg-orange-600' },
      red: { border: 'border-red-200 dark:border-red-800/50', bg: 'bg-red-50 dark:bg-red-900/10', hover: 'hover:border-red-300 dark:hover:border-red-700', icon: 'text-red-600 dark:text-red-400', toggle: 'peer-checked:bg-red-600' },
      teal: { border: 'border-teal-200 dark:border-teal-800/50', bg: 'bg-teal-50 dark:bg-teal-900/10', hover: 'hover:border-teal-300 dark:hover:border-teal-700', icon: 'text-teal-600 dark:text-teal-400', toggle: 'peer-checked:bg-teal-600' },
      cyan: { border: 'border-cyan-200 dark:border-cyan-800/50', bg: 'bg-cyan-50 dark:bg-cyan-900/10', hover: 'hover:border-cyan-300 dark:hover:border-cyan-700', icon: 'text-cyan-600 dark:text-cyan-400', toggle: 'peer-checked:bg-cyan-600' },
      indigo: { border: 'border-indigo-200 dark:border-indigo-800/50', bg: 'bg-indigo-50 dark:bg-indigo-900/10', hover: 'hover:border-indigo-300 dark:hover:border-indigo-700', icon: 'text-indigo-600 dark:text-indigo-400', toggle: 'peer-checked:bg-indigo-600' },
      gray: { border: 'border-gray-200 dark:border-gray-700/50', bg: 'bg-gray-50 dark:bg-gray-900/10', hover: 'hover:border-gray-300 dark:hover:border-gray-600', icon: 'text-gray-600 dark:text-gray-400', toggle: 'peer-checked:bg-gray-600' },
      slate: { border: 'border-slate-200 dark:border-slate-700/50', bg: 'bg-slate-50 dark:bg-slate-900/10', hover: 'hover:border-slate-300 dark:hover:border-slate-600', icon: 'text-slate-600 dark:text-slate-400', toggle: 'peer-checked:bg-slate-600' },
    };
    return colors[color] || colors.blue;
  };

  const getCategoryGradient = (index: number) => {
    const gradients = [
      'from-blue-500/10 to-indigo-500/10',
      'from-orange-500/10 to-red-500/10',
      'from-slate-500/10 to-gray-500/10',
      'from-purple-500/10 to-pink-500/10',
    ];
    return gradients[index % gradients.length];
  };

  const getActivePermissionsCount = () => {
    return Object.values(permissions).filter(Boolean).length;
  };

  const getTotalPermissionsCount = () => {
    return permissionsCategories.reduce((acc, cat) => acc + cat.permissions.length, 0);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-blue-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="pb-24">
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="sm:flex sm:items-start sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <i className="fas fa-shield-alt text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Gestione Permessi
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Framework di controllo accessi modulare
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/users/${userId}/edit`}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
              >
                <i className="fas fa-user-edit mr-2"></i>Modifica Utente
              </motion.button>
            </Link>
            <Link href="/users">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <i className="fas fa-arrow-left mr-2"></i>Indietro
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Breadcrumb */}
      <motion.nav variants={itemVariants} className="flex mb-8">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li><Link href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"><i className="fas fa-home mr-2"></i>Dashboard</Link></li>
          <li><div className="flex items-center"><i className="fas fa-chevron-right text-gray-400 text-xs mx-2"></i><Link href="/users" className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">Utenti</Link></div></li>
          <li><div className="flex items-center"><i className="fas fa-chevron-right text-gray-400 text-xs mx-2"></i><span className="text-sm font-medium text-gray-500 dark:text-gray-500">Permessi</span></div></li>
        </ol>
      </motion.nav>

      {/* User Info Card */}
      <motion.div variants={itemVariants} className="mb-8 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 shadow-xl dark:border-gray-700 dark:from-gray-800 dark:to-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg"
            >
              <span className="text-white text-2xl font-bold">{user?.nome?.charAt(0)}</span>
            </motion.div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{user?.nome}</h3>
              <p className="text-gray-600 dark:text-gray-400">@{user?.userName}</p>
              {user?.mail && (
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-2">
                  <i className="fas fa-envelope text-xs"></i>
                  {user.mail}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {getActivePermissionsCount()}<span className="text-lg text-gray-400">/{getTotalPermissionsCount()}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Permessi Attivi</p>
          </div>
        </div>
      </motion.div>

      {/* Permissions Table */}
      <form onSubmit={handleSubmit}>
        <motion.div variants={itemVariants} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Modulo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Descrizione
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stato
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Accesso
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {permissionsCategories.map((category) => (
                  category.permissions.map((perm, index) => {
                    const isActive = permissions[perm.key] || false;
                    return (
                      <motion.tr
                        key={perm.key}
                        variants={itemVariants}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                              <i className={`fas ${perm.icon} text-gray-600 dark:text-gray-400`}></i>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {perm.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {perm.key}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {perm.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {category.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <i className="fas fa-check-circle mr-1"></i>
                              Attivo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                              <i className="fas fa-times-circle mr-1"></i>
                              Inattivo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => togglePermission(perm.key)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </td>
                      </motion.tr>
                    );
                  })
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </form>

      {/* Sticky Footer */}
      <Footer>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              onClick={selectAll}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-4 py-2.5 border-2 border-green-400 rounded-xl text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition-colors dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30 dark:border-green-700"
            >
              <i className="fas fa-check-double mr-2"></i>Attiva Tutti
            </motion.button>
            <motion.button
              type="button"
              onClick={clearAll}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-4 py-2.5 border-2 border-red-400 rounded-xl text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30 dark:border-red-700"
            >
              <i className="fas fa-times mr-2"></i>Disattiva Tutti
            </motion.button>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/users">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:border-gray-600"
              >
                <i className="fas fa-times mr-2"></i>Annulla
              </motion.button>
            </Link>
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              whileHover={{ scale: saving ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-6 py-2.5 border border-transparent rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (
                <>
                  <motion.i
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="fas fa-spinner mr-2"
                  />
                  Salvataggio...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>Salva Modifiche
                </>
              )}
            </motion.button>
          </div>
        </div>
      </Footer>
    </motion.div>
  );
}
