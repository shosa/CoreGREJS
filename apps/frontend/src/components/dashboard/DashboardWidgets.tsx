"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface DashboardStats {
  riparazioniAperte: number;
  riparazioniMie: number;
  qualityRecordsToday: number;
  ddtBozze: number;
  scmLanciAttivi: number;
  produzioneSettimana: number;
  produzioneMese: number;
}

interface Job {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  output?: { name?: string };
}

interface Activity {
  id: number;
  action: string;
  description: string;
  icon: string;
  createdAt: string;
  user: { nome: string };
}

// Removed hover animation to prevent glitching

// Helper functions
const getJobTypeName = (type: string) => {
  const typeMap: Record<string, string> = {
    'riparazioni.cedola-pdf': 'Cedola Riparazione',
    'export.ddt-pdf': 'DDT Export',
    'produzione.report-pdf': 'Report Produzione',
    'quality.report-pdf': 'Report QC',
  };
  return typeMap[type] || type;
};

const getJobIcon = (type: string) => {
  if (type.includes('riparazioni')) return 'tools';
  if (type.includes('export') || type.includes('ddt')) return 'file-export';
  if (type.includes('produzione')) return 'industry';
  if (type.includes('quality')) return 'check-circle';
  return 'file-pdf';
};

// Base Widget Component with Responsive Design
function BaseStatWidget({
  stats,
  icon,
  title,
  value,
  label,
  secondaryValue,
  secondaryLabel,
  href,
  gradientFrom,
  gradientTo,
  iconFrom,
  iconTo,
  textColor
}: {
  stats: DashboardStats | null;
  icon: string;
  title: string;
  value: number;
  label: string;
  secondaryValue?: number;
  secondaryLabel?: string;
  href: string;
  gradientFrom: string;
  gradientTo: string;
  iconFrom: string;
  iconTo: string;
  textColor: string;
}) {
  return (
    <motion.div
      className={`h-full w-full group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br ${gradientFrom} ${gradientTo} dark:border-gray-700 p-3 sm:p-4 lg:p-6 shadow-lg backdrop-blur-sm cursor-pointer flex flex-col`}
      onClick={() => (window.location.href = href)}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 ${textColor}/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500`}></div>
      <div className="relative flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2 sm:mb-4 flex-shrink-0">
          <div className={`flex h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-gradient-to-br ${iconFrom} ${iconTo} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <i className={`fas fa-${icon} text-white text-sm sm:text-lg lg:text-xl`}></i>
          </div>
          <span className={`text-[10px] sm:text-xs font-semibold ${textColor} dark:${textColor} uppercase tracking-wider`}>{title}</span>
        </div>
        <div className="flex-1 flex flex-col justify-between min-h-0">
          <div className="flex-shrink-0">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1 truncate">
              {value}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 line-clamp-2">
              {label}
            </p>
          </div>
          <div className={`flex items-center justify-between pt-2 sm:pt-3 border-t border-${textColor.split('-')[1]}-200 dark:border-${textColor.split('-')[1]}-800 flex-shrink-0 mt-auto`}>
            {secondaryValue !== undefined && (
              <span className={`text-xs sm:text-sm font-medium ${textColor} truncate`}>
                <i className="fas fa-user mr-1"></i>
                {secondaryValue} {secondaryLabel}
              </span>
            )}
            <i className={`fas fa-arrow-right ${textColor} group-hover:translate-x-1 transition-transform text-xs sm:text-sm ml-auto`}></i>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Riparazioni Widget
export function RiparazioniWidget({ stats }: { stats: DashboardStats | null }) {
  return (
    <BaseStatWidget
      stats={stats}
      icon="tools"
      title="Riparazioni"
      value={stats?.riparazioniAperte || 0}
      label="Riparazioni aperte"
      secondaryValue={stats?.riparazioniMie || 0}
      secondaryLabel="mie"
      href="/riparazioni"
      gradientFrom="from-blue-50"
      gradientTo="to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
      iconFrom="from-blue-500"
      iconTo="to-blue-600"
      textColor="text-blue-600"
    />
  );
}

// Produzione Widget
export function ProduzioneWidget({ stats }: { stats: DashboardStats | null }) {
  const fasi = stats?.produzioneOggiFasi || {};
  const total = stats?.produzioneOggi || 0;

  return (
    <motion.div
      className="h-full w-full group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 dark:border-gray-700 p-3 sm:p-4 lg:p-6 shadow-lg backdrop-blur-sm cursor-pointer flex flex-col"
      onClick={() => (window.location.href = '/produzione')}
    >
      <div className="absolute top-0 right-0 w-32 h-32 text-yellow-600/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
      <div className="relative flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 sm:mb-4 flex-shrink-0">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <i className="fas fa-industry text-white text-sm sm:text-lg lg:text-xl"></i>
          </div>
          <span className="text-[10px] sm:text-xs font-semibold text-yellow-600 dark:text-yellow-600 uppercase tracking-wider">Produzione</span>
        </div>

        {/* Total */}
        <div className="flex-shrink-0 mb-2 sm:mb-3">
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1 truncate">
            {total}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
            PAIA oggi
          </p>
        </div>

        {/* Fasi breakdown */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 sm:space-y-2">
          {Object.keys(fasi).length > 0 ? (
            Object.entries(fasi).map(([fase, valore]) => (
              <div key={fase} className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-700 dark:text-gray-300 truncate mr-2">{fase}</span>
                <span className="font-semibold text-yellow-700 dark:text-yellow-500 flex-shrink-0">
                  {valore}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">Nessun dato oggi</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 sm:pt-3 border-t border-yellow-200 dark:border-yellow-800 flex-shrink-0 mt-auto">
          <i className="fas fa-arrow-right text-yellow-600 group-hover:translate-x-1 transition-transform text-xs sm:text-sm"></i>
        </div>
      </div>
    </motion.div>
  );
}

// Quality Widget
export function QualityWidget({ stats }: { stats: DashboardStats | null }) {
  return (
    <BaseStatWidget
      stats={stats}
      icon="check-circle"
      title="Quality"
      value={stats?.qualityRecordsToday || 0}
      label="Controlli QC oggi"
      href="/quality"
      gradientFrom="from-green-50"
      gradientTo="to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
      iconFrom="from-green-500"
      iconTo="to-emerald-600"
      textColor="text-green-600"
    />
  );
}

// Export Widget
export function ExportWidget({ stats }: { stats: DashboardStats | null }) {
  return (
    <BaseStatWidget
      stats={stats}
      icon="file-export"
      title="Export"
      value={stats?.ddtBozze || 0}
      label="DDT in bozza"
      href="/export"
      gradientFrom="from-purple-50"
      gradientTo="to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
      iconFrom="from-purple-500"
      iconTo="to-pink-500"
      textColor="text-purple-600"
    />
  );
}

// Tracking Widget
export function TrackingWidget() {
  return (
    <motion.div
      className="h-full w-full group rounded-2xl border border-gray-200 bg-white dark:bg-gray-800/40 dark:border-gray-700 p-3 sm:p-4 lg:p-6 shadow-lg backdrop-blur-sm overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4 flex-shrink-0">
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
          <i className="fas fa-route text-white text-sm sm:text-lg lg:text-xl"></i>
        </div>
        <span className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 rounded-full">
          TRACKING
        </span>
      </div>
      <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
        Sistema di Tracciamento
      </h3>
      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 line-clamp-2">
        Traccia ordini, lotti e processi produttivi
      </p>
      <div className="space-y-1 sm:space-y-2">
        <Link href="/tracking">
          <motion.button
            whileHover={{ x: 3 }}
            className="w-full text-left px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors truncate"
          >
            <i className="fas fa-search mr-1 sm:mr-2 text-pink-500"></i>
            <span className="hidden sm:inline">Ricerca generale</span>
            <span className="sm:hidden">Ricerca</span>
          </motion.button>
        </Link>
        <Link href="/tracking/order-search">
          <motion.button
            whileHover={{ x: 3 }}
            className="w-full text-left px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors truncate"
          >
            <i className="fas fa-file-alt mr-1 sm:mr-2 text-pink-500"></i>
            <span className="hidden sm:inline">Cerca per ordine</span>
            <span className="sm:hidden">Ordini</span>
          </motion.button>
        </Link>
        <Link href="/tracking/tree-view">
          <motion.button
            whileHover={{ x: 3 }}
            className="w-full text-left px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors truncate"
          >
            <i className="fas fa-sitemap mr-1 sm:mr-2 text-pink-500"></i>
            <span className="hidden sm:inline">Vista ad albero</span>
            <span className="sm:hidden">Albero</span>
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}

// SCM Widget
export function SCMWidget({ stats }: { stats: DashboardStats | null }) {
  return (
    <motion.div
      className="h-full w-full group rounded-2xl border border-gray-200 bg-white dark:bg-gray-800/40 dark:border-gray-700 p-3 sm:p-4 lg:p-6 shadow-lg backdrop-blur-sm overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4 flex-shrink-0">
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
          <i className="fas fa-rocket text-white text-sm sm:text-lg lg:text-xl"></i>
        </div>
        <span className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
          SCM
        </span>
      </div>
      <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 truncate">
        Supply Chain Management
      </h3>
      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
        <span className="font-semibold text-orange-600 dark:text-orange-400">{stats?.scmLanciAttivi || 0}</span> lanci attivi
      </p>
      <div className="space-y-1 sm:space-y-2">
        <Link href="/scm-admin/launches/create">
          <motion.button
            whileHover={{ x: 3 }}
            className="w-full text-left px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors truncate"
          >
            <i className="fas fa-plus-circle mr-1 sm:mr-2 text-orange-500"></i>
            Nuovo lancio
          </motion.button>
        </Link>
        <Link href="/scm-admin">
          <motion.button
            whileHover={{ x: 3 }}
            className="w-full text-left px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors truncate"
          >
            <i className="fas fa-list mr-1 sm:mr-2 text-orange-500"></i>
            <span className="hidden sm:inline">Gestione lanci</span>
            <span className="sm:hidden">Gestione</span>
          </motion.button>
        </Link>
        <Link href="/scm-admin/monitoring">
          <motion.button
            whileHover={{ x: 3 }}
            className="w-full text-left px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors truncate"
          >
            <i className="fas fa-chart-bar mr-1 sm:mr-2 text-orange-500"></i>
            Monitoraggio
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}

// Spool Jobs Widget
export function SpoolWidget({ jobs, jobsLoading }: { jobs: Job[]; jobsLoading: boolean }) {
  return (
    <motion.div
      className="h-full w-full group rounded-2xl border border-gray-200 bg-white dark:bg-gray-800/40 dark:border-gray-700 p-3 sm:p-4 lg:p-6 shadow-lg backdrop-blur-sm flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4 flex-shrink-0">
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg">
          <i className="fas fa-print text-white text-sm sm:text-lg lg:text-xl"></i>
        </div>
        <span className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-full">
          SPOOL
        </span>
      </div>
      <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 flex-shrink-0">
        Ultimi Job Pronti
      </h3>
      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 flex-shrink-0">
        {jobsLoading ? 'Caricamento...' : `${jobs.length} job completati`}
      </p>
      <div className="space-y-1 sm:space-y-2 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        {jobsLoading ? (
          <div className="text-center py-4">
            <motion.i
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="fas fa-spinner text-xl sm:text-2xl text-cyan-500"
            />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            <i className="far fa-file text-xl sm:text-2xl mb-2"></i>
            <p className="text-xs">Nessun job completato</p>
          </div>
        ) : (
          jobs.map((job, index) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 3, backgroundColor: "rgba(6, 182, 212, 0.05)" }}
                className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg text-sm transition-all"
              >
                <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                  <i className={`fas fa-${getJobIcon(job.type)} text-cyan-500 text-[10px] sm:text-xs`}></i>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    {getJobTypeName(job.type)}
                  </span>
                </div>
                <i className="fas fa-download text-[10px] sm:text-xs text-cyan-500 flex-shrink-0"></i>
              </motion.div>
            </Link>
          ))
        )}
      </div>
      {jobs.length > 0 && (
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Link
            href="/jobs"
            className="text-[10px] sm:text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center justify-center"
          >
            Visualizza tutti i job
            <i className="fas fa-arrow-right ml-1 text-[10px] sm:text-xs"></i>
          </Link>
        </div>
      )}
    </motion.div>
  );
}

// Quick Actions Widget
export function QuickActionsWidget({ hasPermission, isModuleActive }: { hasPermission: (p: string) => boolean; isModuleActive: (m: string) => boolean }) {
  const actions = [
    { permission: 'riparazioni', module: 'riparazioni', href: '/riparazioni/create', icon: 'hammer', color: 'blue', label: 'Nuova Riparazione', shortLabel: 'Riparazione' },
    { permission: 'produzione', module: 'produzione', href: '/produzione/new', icon: 'industry', color: 'yellow', label: 'Nuova Produzione', shortLabel: 'Produzione' },
    { permission: 'export', module: 'export', href: '/export/create', icon: 'file-export', color: 'purple', label: 'Nuovo Export/DDT', shortLabel: 'Export' },
    { permission: 'tracking', module: 'tracking', href: '/tracking', icon: 'search', color: 'pink', label: 'Cerca Tracking', shortLabel: 'Tracking' },
    { permission: 'riparazioni', module: 'riparazioni', href: '/riparazioni/numerate', icon: 'ruler', color: 'indigo', label: 'Gestione Numerate', shortLabel: 'Numerate' },
    { permission: 'produzione', module: 'produzione', href: '/produzione/calendario', icon: 'calendar-alt', color: 'emerald', label: 'Calendario Produzione', shortLabel: 'Calendario' },
  ];

  const visibleActions = actions.filter(action => {
    if (action.permission && !hasPermission(action.permission)) return false;
    if (action.module && !isModuleActive(action.module)) return false;
    return true;
  });

  const colorMap: Record<string, { border: string; bg: string; icon: string }> = {
    blue: { border: 'border-blue-200 dark:border-blue-800 hover:border-blue-400', bg: 'bg-blue-50/50 dark:bg-blue-900/10', icon: 'from-blue-500 to-blue-600' },
    yellow: { border: 'border-yellow-200 dark:border-yellow-800 hover:border-yellow-400', bg: 'bg-yellow-50/50 dark:bg-yellow-900/10', icon: 'from-yellow-500 to-orange-500' },
    purple: { border: 'border-purple-200 dark:border-purple-800 hover:border-purple-400', bg: 'bg-purple-50/50 dark:bg-purple-900/10', icon: 'from-purple-500 to-pink-500' },
    pink: { border: 'border-pink-200 dark:border-pink-800 hover:border-pink-400', bg: 'bg-pink-50/50 dark:bg-pink-900/10', icon: 'from-pink-500 to-rose-500' },
    indigo: { border: 'border-indigo-200 dark:border-indigo-800 hover:border-indigo-400', bg: 'bg-indigo-50/50 dark:bg-indigo-900/10', icon: 'from-indigo-500 to-blue-600' },
    emerald: { border: 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10', icon: 'from-emerald-500 to-green-600' },
  };

  return (
    <motion.div
      className="h-full w-full rounded-2xl border border-gray-200 bg-white dark:bg-gray-800/40 dark:border-gray-700 p-3 sm:p-4 lg:p-6 shadow-lg backdrop-blur-sm flex flex-col overflow-hidden"
    >
      <div className="mb-3 sm:mb-6 flex-shrink-0">
        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white flex items-center">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 mr-2 sm:mr-3 shadow-lg">
            <i className="fas fa-bolt text-white text-sm sm:text-base"></i>
          </div>
          <span className="text-sm sm:text-base lg:text-xl">Azioni Rapide</span>
        </h3>
        <p className="text-[10px] sm:text-xs lg:text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-2 line-clamp-1">
          Accesso rapido alle funzioni più utilizzate
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1 overflow-y-auto min-h-0">
        {visibleActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <div
              className={`flex flex-col sm:flex-row items-center p-2 sm:p-3 lg:p-4 border-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${colorMap[action.color].border} ${colorMap[action.color].bg} h-full`}
            >
              <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br ${colorMap[action.color].icon} shadow-md mb-1 sm:mb-0 sm:mr-2 lg:mr-3 flex-shrink-0`}>
                <i className={`fas fa-${action.icon} text-white text-xs sm:text-sm lg:text-base`}></i>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white text-[10px] sm:text-xs lg:text-sm text-center sm:text-left line-clamp-2">
                <span className="hidden lg:inline">{action.label}</span>
                <span className="lg:hidden">{action.shortLabel}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

// Activities Widget
export function ActivitiesWidget({ activities, activitiesLoading, hasPermission }: { activities: Activity[]; activitiesLoading: boolean; hasPermission: (p: string) => boolean }) {
  const hasLogPermission = hasPermission('log');

  return (
    <motion.div
      className="h-full w-full rounded-2xl border border-gray-200 bg-white dark:bg-gray-800/40 dark:border-gray-700 p-3 sm:p-4 lg:p-6 shadow-lg backdrop-blur-sm flex flex-col overflow-hidden"
    >
      <div className="mb-3 sm:mb-6 flex-shrink-0">
        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white flex items-center">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 mr-2 sm:mr-3 shadow-lg">
            <i className="fas fa-history text-white text-sm sm:text-base"></i>
          </div>
          <span className="text-sm sm:text-base lg:text-xl">
            {hasLogPermission ? 'Attività Recenti' : 'Le Mie Attività'}
          </span>
        </h3>
        <p className="text-[10px] sm:text-xs lg:text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-2 line-clamp-1">
          {hasLogPermission ? 'Ultime operazioni effettuate nel sistema' : 'Le tue ultime operazioni'}
        </p>
      </div>
      <div className="space-y-1 sm:space-y-2 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        {activitiesLoading ? (
          <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
            <motion.i
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="fas fa-spinner text-2xl sm:text-3xl mb-2 sm:mb-3"
            />
            <p className="font-medium text-xs sm:text-sm">Caricamento attività...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
            <i className="far fa-calendar-times text-3xl sm:text-4xl mb-2 sm:mb-3"></i>
            <p className="font-medium text-xs sm:text-sm">Nessuna attività recente</p>
            <p className="text-[10px] sm:text-xs mt-1">Le attività verranno visualizzate qui</p>
          </div>
        ) : (
          activities.slice(0, 8).map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{
                x: 4,
                backgroundColor: "rgba(59, 130, 246, 0.05)",
              }}
              className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-xl transition-all duration-200 border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
            >
              <div className="flex-shrink-0">
                <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
                  <i
                    className={`fas fa-${activity.icon || "history"} text-[10px] sm:text-sm text-blue-600 dark:text-blue-400`}
                  ></i>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {activity.description}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 truncate">
                  <i className="fas fa-user mr-1"></i>
                  {activity.user?.nome} • {" "}
                  <i className="far fa-clock mr-1"></i>
                  {new Date(activity.createdAt).toLocaleString("it-IT", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
      {activities.length > 0 && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Link
            href={hasLogPermission ? "/log-attivita" : "/profile"}
            className="flex items-center justify-center text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {hasLogPermission ? 'Visualizza tutte le attività' : 'Vai al profilo'}
            <i className="fas fa-arrow-right ml-1 sm:ml-2"></i>
          </Link>
        </div>
      )}
    </motion.div>
  );
}
