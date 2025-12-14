"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

  const getModuleColor = (module: string) => {
    return moduleColors[module] || "gray";
  };

  const getActionIcon = (action: string) => {
    return actionIcons[action] || "fa-bolt";
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-solid border-cyan-500 border-t-transparent"
        />
      </div>
    );
  }

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
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

      {/* Stats Cards */}
      {stats && (
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6 shadow-lg dark:border-cyan-800 dark:bg-cyan-900/20 backdrop-blur-sm"
          >
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 shadow-lg">
                <i className="fas fa-chart-line text-white"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-cyan-700 dark:text-cyan-400">
                  Totale Attività
                </p>
                <p className="text-2xl font-bold text-cyan-800 dark:text-cyan-300">
                  {stats.total?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-lg dark:border-blue-800 dark:bg-blue-900/20 backdrop-blur-sm"
          >
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
                <i className="fas fa-layer-group text-white"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Moduli Attivi
                </p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                  {stats.byModule.length || 0}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-lg dark:border-green-800 dark:bg-green-900/20 backdrop-blur-sm"
          >
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
                <i className="fas fa-bolt text-white"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  Azioni Diverse
                </p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                  {stats.byAction.length || 0}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <motion.div
        variants={itemVariants}
        className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/40"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Modulo
            </label>
            <select
              value={filterModule}
              onChange={(e) => {
                setFilterModule(e.target.value);
                setPage(0);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tutti i moduli</option>
              {availableModules.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Azione
            </label>
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(0);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tutte le azioni</option>
              {availableActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Data Inizio
            </label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => {
                setFilterStartDate(e.target.value);
                setPage(0);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Data Fine
            </label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => {
                setFilterEndDate(e.target.value);
                setPage(0);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </motion.div>

      {/* Logs Table */}
      <motion.div
        variants={itemVariants}
        className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800/40"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">
                  Data/Ora
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">
                  Utente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">
                  Modulo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">
                  Azione
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">
                  Descrizione
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">
                  Entità
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-600 dark:text-gray-400">
                  Dettagli
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    Nessuna attività trovata
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {log.user ? log.user.nome : "Sistema"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-${getModuleColor(
                          log.module
                        )}-100 text-${getModuleColor(
                          log.module
                        )}-800 dark:bg-${getModuleColor(
                          log.module
                        )}-900/30 dark:text-${getModuleColor(log.module)}-300`}
                      >
                        {log.module}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <i
                        className={`fas ${getActionIcon(log.action)} mr-2 text-gray-500`}
                      ></i>
                      <span className="text-gray-700 dark:text-gray-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {log.description || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {log.entity && log.entityId ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {log.entity}
                          </span>
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-mono">
                            #{log.entityId}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setOffcanvasOpen(true);
                        }}
                        className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                      >
                        <i className="fas fa-info-circle mr-1"></i>
                        Dettagli
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
      </motion.div>

      {/* Offcanvas for metadata details */}
      <Offcanvas
        open={offcanvasOpen}
        onClose={() => setOffcanvasOpen(false)}
        title="Dettagli Log Attività"
        icon="fa-info-circle"
        iconColor="text-blue-500"
        width="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            {/* Log Info */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
              <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
                Informazioni Generali
              </h4>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Data/Ora:</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(selectedLog.createdAt)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Utente:</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedLog.user ? selectedLog.user.nome : "Sistema"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Modulo:</dt>
                  <dd>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {selectedLog.module}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Azione:</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedLog.action}
                  </dd>
                </div>
                {selectedLog.entity && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Entità:</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedLog.entity}
                      {selectedLog.entityId && (
                        <span className="ml-2 font-mono text-orange-600 dark:text-orange-400">
                          #{selectedLog.entityId}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600 dark:text-gray-400">IP Address:</dt>
                  <dd className="text-sm font-mono text-gray-900 dark:text-white">
                    {selectedLog.ipAddress || "-"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Description */}
            {selectedLog.description && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">
                  Descrizione
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedLog.description}
                </p>
              </div>
            )}

            {/* Metadata */}
            {selectedLog.metadata && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
                  Metadata Richiesta
                </h4>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* User Agent */}
            {selectedLog.userAgent && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">
                  User Agent
                </h4>
                <p className="break-all text-xs text-gray-600 dark:text-gray-400">
                  {selectedLog.userAgent}
                </p>
              </div>
            )}
          </div>
        )}
      </Offcanvas>
    </motion.div>
  );
}
