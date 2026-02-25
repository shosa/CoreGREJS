"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import Offcanvas from "@/components/ui/Offcanvas";
import Pagination from "@/components/ui/Pagination";
import { activityLogApi } from "@/lib/api";
import { showError } from "@/store/notifications";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

type ActivityLog = {
  id: number;
  userId: number | null;
  module: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  description: string | null;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: number;
    userName: string;
    nome: string;
  } | null;
};

type Stats = {
  total: number;
  byModule: { module: string; count: number }[];
  byAction: { action: string; count: number }[];
};

const moduleColors: Record<string, string> = {
  auth: "blue",
  produzione: "yellow",
  riparazioni: "red",
  quality: "green",
  users: "teal",
  settings: "orange",
  system: "gray",
  export: "purple",
  scm: "indigo",
  mrp: "pink",
  tracking: "cyan",
};

const actionIcons: Record<string, string> = {
  create: "fa-plus-circle",
  update: "fa-edit",
  delete: "fa-trash-alt",
  login: "fa-sign-in-alt",
  logout: "fa-sign-out-alt",
  view: "fa-eye",
  send_email: "fa-envelope",
  upsert: "fa-save",
  change_password: "fa-key",
};

export default function LogAttivitaPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Filters
  const [filterModule, setFilterModule] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Available filter values
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<string[]>([]);

  // Offcanvas state
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [offcanvasOpen, setOffcanvasOpen] = useState(false);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [currentPage, itemsPerPage, filterModule, filterAction, filterStartDate, filterEndDate]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await activityLogApi.getLogs({
        module: filterModule || undefined,
        action: filterAction || undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (error) {
      showError("Errore nel caricamento dei log attività");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await activityLogApi.getStats({
        module: filterModule || undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
      });
      setStats(data);
    } catch (error) {
      console.error("Errore nel caricamento delle statistiche", error);
    }
  };

  const fetchFilters = async () => {
    try {
      const data = await activityLogApi.getFilters();
      setAvailableModules(data.modules);
      setAvailableActions(data.actions);
    } catch (error) {
      console.error("Errore nel caricamento dei filtri", error);
    }
  };

  const resetFilters = () => {
    setFilterModule("");
    setFilterAction("");
    setFilterStartDate("");
    setFilterEndDate("");
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getModuleColor = (module: string) => moduleColors[module] || "gray";
  const getActionIcon = (action: string) => actionIcons[action] || "fa-bolt";

  const hasActiveFilters =
    filterModule || filterAction || filterStartDate || filterEndDate;

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="flex flex-col h-full overflow-hidden"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="shrink-0">
          <PageHeader
            title="Log Attività"
            subtitle="Registro delle attività del sistema"
          />
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/", icon: "fa-home" },
              { label: "Log Attività" },
            ]}
          />
        </motion.div>

        {/* Body: sidebar + main */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden min-h-0 mt-4"
        >
          {/* Sidebar */}
          <aside className="hidden md:flex md:w-64 shrink-0 flex-col gap-3 overflow-y-auto">
            {/* Stats mini-cards */}
            <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Statistiche
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600">
                  <i className="fas fa-chart-line text-white text-xs"></i>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Totale attività</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    {stats?.total?.toLocaleString() ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                  <i className="fas fa-layer-group text-white text-xs"></i>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Moduli attivi</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    {stats?.byModule.length ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500">
                  <i className="fas fa-bolt text-white text-xs"></i>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Azioni diverse</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    {stats?.byAction.length ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Filtri
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                  >
                    <i className="fas fa-times mr-1"></i>Reset
                  </button>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Modulo
                </label>
                <select
                  value={filterModule}
                  onChange={(e) => {
                    setFilterModule(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tutti i moduli</option>
                  {availableModules.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Azione
                </label>
                <select
                  value={filterAction}
                  onChange={(e) => {
                    setFilterAction(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tutte le azioni</option>
                  {availableActions.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Data inizio
                </label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => {
                    setFilterStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Data fine
                </label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => {
                    setFilterEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Top modules breakdown */}
            {stats && stats.byModule.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Top moduli
                </p>
                {stats.byModule.slice(0, 6).map((item) => (
                  <div key={item.module} className="flex items-center justify-between">
                    <span className="text-xs text-gray-700 dark:text-gray-300 capitalize">{item.module}</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{item.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow">
            {/* Toolbar */}
            <div className="shrink-0 px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fas fa-list-alt text-gray-400 text-sm"></i>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {loading ? "Caricamento…" : `${total.toLocaleString()} eventi`}
                </span>
                {hasActiveFilters && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                    <i className="fas fa-filter mr-1"></i>Filtrato
                  </span>
                )}
              </div>
              <button
                onClick={() => { fetchLogs(); fetchStats(); }}
                className="flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                <i className={`fas fa-sync-alt ${loading ? "animate-spin" : ""}`}></i>
                Aggiorna
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Data/Ora
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Utente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Modulo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Azione
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Descrizione
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Entità
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Dettagli
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {loading && logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mx-auto h-8 w-8 rounded-full border-4 border-cyan-500 border-t-transparent"
                        />
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                        <i className="fas fa-inbox text-3xl mb-2 block opacity-40"></i>
                        Nessuna attività trovata
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log.id}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      >
                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                          {log.user ? log.user.nome : (
                            <span className="text-xs text-gray-400 italic">Sistema</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-${getModuleColor(log.module)}-100 text-${getModuleColor(log.module)}-800 dark:bg-${getModuleColor(log.module)}-900/30 dark:text-${getModuleColor(log.module)}-300`}
                          >
                            {log.module}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-sm">
                          <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                            <i className={`fas ${getActionIcon(log.action)} text-gray-400 text-xs`}></i>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 max-w-[220px] truncate">
                          {log.description || <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          {log.entity && log.entityId ? (
                            <div>
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                {log.entity}
                              </span>
                              <span className="ml-1 text-xs font-mono text-orange-600 dark:text-orange-400">
                                #{log.entityId}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-center">
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setOffcanvasOpen(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                            title="Dettagli"
                          >
                            <i className="fas fa-info-circle text-xs"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="shrink-0 border-t border-gray-200 dark:border-gray-700">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={total}
                onItemsPerPageChange={(newValue) => {
                  setItemsPerPage(newValue);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Offcanvas for log details */}
      <Offcanvas
        open={offcanvasOpen}
        onClose={() => setOffcanvasOpen(false)}
        title="Dettagli Log Attività"
        icon="fa-info-circle"
        iconColor="text-blue-500"
        width="lg"
      >
        {selectedLog && (
          <div className="space-y-4 px-4 pb-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                Informazioni Generali
              </h4>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Data/Ora</dt>
                  <dd className="text-xs font-medium text-gray-900 dark:text-white">
                    {formatDate(selectedLog.createdAt)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Utente</dt>
                  <dd className="text-xs font-medium text-gray-900 dark:text-white">
                    {selectedLog.user ? selectedLog.user.nome : "Sistema"}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Modulo</dt>
                  <dd>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-${getModuleColor(selectedLog.module)}-100 text-${getModuleColor(selectedLog.module)}-800 dark:bg-${getModuleColor(selectedLog.module)}-900/30 dark:text-${getModuleColor(selectedLog.module)}-300`}>
                      {selectedLog.module}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Azione</dt>
                  <dd className="text-xs font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                    <i className={`fas ${getActionIcon(selectedLog.action)} text-gray-400`}></i>
                    {selectedLog.action}
                  </dd>
                </div>
                {selectedLog.entity && (
                  <div className="flex justify-between">
                    <dt className="text-xs text-gray-500 dark:text-gray-400">Entità</dt>
                    <dd className="text-xs font-medium text-gray-900 dark:text-white">
                      {selectedLog.entity}
                      {selectedLog.entityId && (
                        <span className="ml-1.5 font-mono text-orange-600 dark:text-orange-400">
                          #{selectedLog.entityId}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-xs text-gray-500 dark:text-gray-400">IP Address</dt>
                  <dd className="text-xs font-mono text-gray-900 dark:text-white">
                    {selectedLog.ipAddress || "—"}
                  </dd>
                </div>
              </dl>
            </div>

            {selectedLog.description && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                  Descrizione
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {selectedLog.description}
                </p>
              </div>
            )}

            {selectedLog.metadata && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-4">
                <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Metadata
                </h4>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-green-400 leading-relaxed">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.userAgent && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                  User Agent
                </h4>
                <p className="break-all text-xs text-gray-500 dark:text-gray-400">
                  {selectedLog.userAgent}
                </p>
              </div>
            )}
          </div>
        )}
      </Offcanvas>
    </>
  );
}
