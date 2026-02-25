'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { usersApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

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
    name: 'FUNZIONI',
    description: 'Moduli per la gestione operativa e processi aziendali',
    permissions: [
      { key: 'riparazioni', name: 'Riparazioni', description: 'Gestione riparazioni e ordini di lavoro', icon: 'fa-hammer', color: 'blue' },
      { key: 'quality', name: 'Controllo Qualità', description: 'Sistema controllo e verifica qualità prodotti', icon: 'fa-check-circle', color: 'green' },
      { key: 'produzione', name: 'Produzione', description: 'Pianificazione e gestione produzione', icon: 'fa-calendar', color: 'yellow' },
      { key: 'export', name: 'Export/DDT', description: 'Gestione esportazioni e documentazione DDT', icon: 'fa-globe-europe', color: 'purple' },
      { key: 'scm_admin', name: 'SCM', description: 'Supply Chain Management e lanci produzione', icon: 'fa-network-wired', color: 'orange' },
      { key: 'tracking', name: 'Tracking', description: 'Tracciabilità materiali e movimentazioni', icon: 'fa-map-marker-alt', color: 'red' },
      { key: 'analitiche', name: 'Analitiche', description: 'Analisi dati, import Excel e statistiche', icon: 'fa-chart-bar', color: 'purple' },
    ],
  },
  {
    name: 'FRAMEWORK',
    description: 'Strumenti di sistema e gestione tecnica',
    permissions: [
      { key: 'dbsql', name: 'Gestione Dati', description: 'Accesso database, query SQL e migrazioni', icon: 'fa-database', color: 'cyan' },
      { key: 'log', name: 'Log Attività', description: 'Visualizzazione audit log e attività sistema', icon: 'fa-history', color: 'cyan' },
      { key: 'inwork', name: 'InWork', description: 'Sistema gestione operatori e permessi mobile', icon: 'fa-mobile', color: 'cyan' },
      { key: 'file-manager', name: 'File Manager', description: 'Gestione file MinIO e storage sistema', icon: 'fa-folder-open', color: 'cyan' },
    ],
  },
  {
    name: 'STRUMENTI',
    description: 'Pannelli amministrativi e configurazione sistema',
    permissions: [
      { key: 'users', name: 'Gestione Utenti', description: 'Creazione, modifica e gestione utenti sistema', icon: 'fa-users', color: 'gray' },
      { key: 'settings', name: 'Impostazioni Moduli', description: 'Accesso alla sezione impostazioni dei singoli moduli', icon: 'fa-cog', color: 'gray' },
      { key: 'system-admin', name: 'Amministrazione Sistema', description: 'Configurazione avanzata: SMTP, import dati, moduli attivi, cron, webhook, sicurezza', icon: 'fa-server', color: 'slate' },
    ],
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

const colorClasses: Record<string, { icon: string }> = {
  blue:   { icon: 'text-blue-600 dark:text-blue-400' },
  yellow: { icon: 'text-yellow-600 dark:text-yellow-400' },
  green:  { icon: 'text-green-600 dark:text-green-400' },
  purple: { icon: 'text-purple-600 dark:text-purple-400' },
  orange: { icon: 'text-orange-600 dark:text-orange-400' },
  red:    { icon: 'text-red-600 dark:text-red-400' },
  cyan:   { icon: 'text-cyan-600 dark:text-cyan-400' },
  gray:   { icon: 'text-gray-600 dark:text-gray-400' },
  slate:  { icon: 'text-slate-600 dark:text-slate-400' },
};

const totalPermissions = permissionsCategories.reduce(
  (acc, cat) => acc + cat.permissions.length,
  0
);

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
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    const all: Record<string, boolean> = {};
    permissionsCategories.forEach((cat) => cat.permissions.forEach((p) => (all[p.key] = true)));
    setPermissions(all);
  };

  const clearAll = () => {
    const all: Record<string, boolean> = {};
    permissionsCategories.forEach((cat) => cat.permissions.forEach((p) => (all[p.key] = false)));
    setPermissions(all);
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
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

  const activeCount = Object.values(permissions).filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent"
        />
      </div>
    );
  }

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
          title="Gestione Permessi"
          subtitle={`Permessi di accesso ai moduli per ${user?.nome}`}
        />
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/', icon: 'fa-home' },
            { label: 'Gestione Utenti', href: '/users' },
            { label: user?.nome, href: `/users/${userId}/edit` },
            { label: 'Permessi' },
          ]}
        />
      </motion.div>

      {/* Body */}
      <motion.div
        variants={itemVariants}
        className="flex flex-1 gap-4 overflow-hidden min-h-0 mt-4"
      >
        {/* Sidebar */}
        <aside className="w-60 shrink-0 flex flex-col gap-3 overflow-y-auto">
          {/* User card */}
          <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow">
                <span className="text-base font-bold text-white">
                  {user?.nome?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.nome}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">@{user?.userName}</p>
              </div>
            </div>
            {user?.mail && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <i className="fas fa-envelope text-xs"></i>
                <span className="truncate">{user.mail}</span>
              </p>
            )}
          </div>

          {/* Permessi attivi */}
          <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Stato Permessi
            </p>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{activeCount}</span>
              <span className="text-sm text-gray-400 mb-0.5">/ {totalPermissions}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${(activeCount / totalPermissions) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">permessi attivi</p>
          </div>

          {/* Azioni rapide */}
          <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Azioni Rapide
            </p>
            <button
              type="button"
              onClick={selectAll}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              <i className="fas fa-check-double text-xs w-4 text-center"></i>
              Attiva Tutti
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <i className="fas fa-times text-xs w-4 text-center"></i>
              Disattiva Tutti
            </button>
            <hr className="border-gray-200 dark:border-gray-700 my-1" />
            <Link
              href={`/users/${userId}/edit`}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <i className="fas fa-user-edit text-xs w-4 text-center"></i>
              Modifica Utente
            </Link>
            <Link
              href="/users"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <i className="fas fa-arrow-left text-xs w-4 text-center"></i>
              Torna alla Lista
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow">
          {/* Toolbar */}
          <div className="shrink-0 px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fas fa-shield-alt text-blue-500 text-sm"></i>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Controllo Accessi
              </span>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:shadow-md transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <motion.i
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="fas fa-spinner text-xs"
                  />
                  Salvataggio…
                </>
              ) : (
                <>
                  <i className="fas fa-save text-xs"></i>
                  Salva Modifiche
                </>
              )}
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <form onSubmit={handleSave}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Modulo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Descrizione
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Categoria
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Stato
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Accesso
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {permissionsCategories.map((category, catIdx) => (
                    <>
                      {/* Category separator row */}
                      <tr key={`cat-${catIdx}`} className="bg-gray-50/70 dark:bg-gray-700/20">
                        <td colSpan={5} className="px-4 py-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {category.name}
                            <span className="ml-2 font-normal normal-case text-gray-400 dark:text-gray-500">
                              — {category.description}
                            </span>
                          </span>
                        </td>
                      </tr>
                      {category.permissions.map((perm) => {
                        const isActive = permissions[perm.key] || false;
                        const cc = colorClasses[perm.color] || colorClasses.blue;
                        return (
                          <motion.tr
                            key={perm.key}
                            variants={itemVariants}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700/50">
                                  <i className={`fas ${perm.icon} text-xs ${cc.icon}`}></i>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {perm.name}
                                  </div>
                                  <div className="text-xs font-mono text-gray-400 dark:text-gray-500">
                                    {perm.key}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[260px]">
                              {perm.description}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                                {category.name}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {isActive ? (
                                <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                  <i className="fas fa-check-circle mr-1"></i>Attivo
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                                  <i className="fas fa-times-circle mr-1"></i>Inattivo
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isActive}
                                  onChange={() => togglePermission(perm.key)}
                                  className="sr-only peer"
                                />
                                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-500 peer-checked:bg-blue-600"></div>
                              </label>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </form>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
