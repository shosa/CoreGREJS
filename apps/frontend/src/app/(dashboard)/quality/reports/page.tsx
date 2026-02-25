"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { qualityApi } from "@/lib/api";
import { showSuccess, showError } from "@/store/notifications";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const inputClass =
  "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500";

type ReportStats = {
  summary: {
    totalRecords: number;
    recordsWithExceptions: number;
    recordsOk: number;
    totalExceptions: number;
    successRate: string;
  };
  byDepartment: Record<string, { total: number; exceptions: number; ok: number; exceptionCount: number }>;
  byOperator: Record<string, { total: number; exceptions: number; ok: number; exceptionCount: number }>;
  byType: Record<string, { total: number; exceptions: number; ok: number }>;
  exceptionTypes: Record<string, number>;
  byDate: Record<string, { total: number; exceptions: number; ok: number }>;
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({
    dataInizio: "",
    dataFine: "",
    reparto: "",
    operatore: "",
    tipoCq: "",
  });
  const [departments, setDepartments] = useState<string[]>([]);
  const [operators, setOperators] = useState<string[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [depts, ops] = await Promise.all([
        qualityApi.getDepartments(true),
        qualityApi.getUniqueOperators(),
      ]);
      setDepartments(depts.map((d: any) => d.nomeReparto));
      setOperators(ops);

      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);

      const newFilters = {
        ...filters,
        dataInizio: start.toISOString().split("T")[0],
        dataFine: end.toISOString().split("T")[0],
      };
      setFilters(newFilters);

      await loadStatistics(newFilters);
    } catch {
      showError("Errore nel caricamento dei dati iniziali");
    }
  };

  const loadStatistics = async (customFilters?: any) => {
    try {
      setLoading(true);
      const data = await qualityApi.getReportStatistics(customFilters || filters);
      setStats(data);
    } catch {
      showError("Errore nel caricamento delle statistiche");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => loadStatistics();

  const handleResetFilters = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const newFilters = {
      dataInizio: start.toISOString().split("T")[0],
      dataFine: end.toISOString().split("T")[0],
      reparto: "",
      operatore: "",
      tipoCq: "",
    };
    setFilters(newFilters);
    loadStatistics(newFilters);
  };

  const handleGeneratePdf = async () => {
    try {
      setGenerating(true);
      const result = await qualityApi.generatePdfReport(filters);
      showSuccess(result.message || "Il lavoro è stato messo in coda");
    } catch {
      showError("Errore nella generazione del report");
    } finally {
      setGenerating(false);
    }
  };

  const getDepartmentChartData = () => {
    if (!stats) return null;
    const depts = Object.entries(stats.byDepartment)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);
    return {
      labels: depts.map(([name]) => name),
      datasets: [
        { label: "OK", data: depts.map(([, d]) => d.ok), backgroundColor: "rgba(34, 197, 94, 0.7)" },
        { label: "Con Eccezioni", data: depts.map(([, d]) => d.exceptions), backgroundColor: "rgba(239, 68, 68, 0.7)" },
      ],
    };
  };

  const getDefectTypesChartData = () => {
    if (!stats) return null;
    const types = Object.entries(stats.exceptionTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    return {
      labels: types.map(([name]) => name),
      datasets: [
        {
          label: "Occorrenze",
          data: types.map(([, count]) => count),
          backgroundColor: [
            "rgba(239, 68, 68, 0.7)", "rgba(249, 115, 22, 0.7)", "rgba(234, 179, 8, 0.7)",
            "rgba(34, 197, 94, 0.7)", "rgba(59, 130, 246, 0.7)", "rgba(147, 51, 234, 0.7)",
            "rgba(236, 72, 153, 0.7)", "rgba(156, 163, 175, 0.7)", "rgba(20, 184, 166, 0.7)",
            "rgba(251, 146, 60, 0.7)",
          ],
        },
      ],
    };
  };

  const getTrendChartData = () => {
    if (!stats) return null;
    const dates = Object.entries(stats.byDate).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      labels: dates.map(([date]) =>
        new Date(date).toLocaleDateString("it-IT", { month: "short", day: "numeric" })
      ),
      datasets: [
        {
          label: "Totale Controlli",
          data: dates.map(([, d]) => d.total),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
        },
        {
          label: "Con Eccezioni",
          data: dates.map(([, d]) => d.exceptions),
          borderColor: "rgb(239, 68, 68)",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.4,
        },
      ],
    };
  };

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
          title="Reportistica Controllo Qualità"
          description="Analisi statistiche e generazione report dettagliati"
        />
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/", icon: "fa-home" },
            { label: "Controllo Qualità", href: "/quality" },
            { label: "Reportistica" },
          ]}
        />
      </motion.div>

      {/* Body */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden min-h-0 mt-4"
      >
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-60 shrink-0 flex-col gap-3 overflow-y-auto">
          {/* Summary stats */}
          {stats && (
            <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Riepilogo
              </p>
              <div className="space-y-2">
                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3 flex items-center justify-between">
                  <span className="text-xs text-blue-600 dark:text-blue-400">Controlli</span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {stats.summary.totalRecords.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3 flex items-center justify-between">
                  <span className="text-xs text-green-600 dark:text-green-400">OK</span>
                  <span className="text-sm font-bold text-green-700 dark:text-green-300">
                    {stats.summary.recordsOk.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3 flex items-center justify-between">
                  <span className="text-xs text-red-600 dark:text-red-400">Eccezioni</span>
                  <span className="text-sm font-bold text-red-700 dark:text-red-300">
                    {stats.summary.recordsWithExceptions.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 p-3 flex items-center justify-between">
                  <span className="text-xs text-purple-600 dark:text-purple-400">Tasso</span>
                  <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                    {stats.summary.successRate}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Filtri Analisi
            </p>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data Inizio</label>
              <input
                type="date"
                value={filters.dataInizio}
                onChange={(e) => setFilters({ ...filters, dataInizio: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data Fine</label>
              <input
                type="date"
                value={filters.dataFine}
                onChange={(e) => setFilters({ ...filters, dataFine: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Reparto</label>
              <select
                value={filters.reparto}
                onChange={(e) => setFilters({ ...filters, reparto: e.target.value })}
                className={inputClass}
              >
                <option value="">Tutti</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Operatore</label>
              <select
                value={filters.operatore}
                onChange={(e) => setFilters({ ...filters, operatore: e.target.value })}
                className={inputClass}
              >
                <option value="">Tutti</option>
                {operators.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tipo CQ</label>
              <select
                value={filters.tipoCq}
                onChange={(e) => setFilters({ ...filters, tipoCq: e.target.value })}
                className={inputClass}
              >
                <option value="">Tutti</option>
                <option value="INTERNO">INTERNO</option>
                <option value="GRIFFE">GRIFFE</option>
              </select>
            </div>

            <button
              onClick={handleApplyFilters}
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 py-2 text-xs font-medium text-white hover:shadow-md transition-all disabled:opacity-50"
            >
              <i className="fas fa-filter mr-1.5"></i>Applica
            </button>
            <button
              onClick={handleResetFilters}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <i className="fas fa-redo mr-1.5"></i>Reset (30gg)
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow">
          {/* Toolbar */}
          <div className="shrink-0 px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <i className="fas fa-chart-bar text-purple-500 text-sm"></i>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Statistiche
            </span>
            {loading && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400 ml-2">
                <motion.i
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="fas fa-spinner"
                />
                Caricamento…
              </span>
            )}
            <div className="ml-auto">
              <button
                onClick={handleGeneratePdf}
                disabled={generating || !stats}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-xs font-medium text-white hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-file-pdf"></i>
                {generating ? "Generazione…" : "Genera PDF"}
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-5">
            {!stats && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <i className="fas fa-chart-pie text-4xl mb-3 opacity-40"></i>
                <p className="font-medium text-sm">Nessun dato disponibile</p>
                <p className="text-xs mt-1">Applica i filtri per caricare le statistiche</p>
              </div>
            )}

            {stats && (
              <div className="space-y-5">
                {/* Summary stat cards */}
                <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                  <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <i className="fas fa-clipboard-check text-blue-600 dark:text-blue-400 text-sm"></i>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tot. Controlli</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {stats.summary.totalRecords.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                        <i className="fas fa-check-circle text-green-600 dark:text-green-400 text-sm"></i>
                      </div>
                      <div>
                        <p className="text-xs text-green-600 dark:text-green-400">Controlli OK</p>
                        <p className="text-xl font-bold text-green-800 dark:text-green-300">
                          {stats.summary.recordsOk.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                        <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-sm"></i>
                      </div>
                      <div>
                        <p className="text-xs text-red-600 dark:text-red-400">Con Eccezioni</p>
                        <p className="text-xl font-bold text-red-800 dark:text-red-300">
                          {stats.summary.recordsWithExceptions.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                        <i className="fas fa-bug text-orange-600 dark:text-orange-400 text-sm"></i>
                      </div>
                      <div>
                        <p className="text-xs text-orange-600 dark:text-orange-400">Tot. Eccezioni</p>
                        <p className="text-xl font-bold text-orange-800 dark:text-orange-300">
                          {stats.summary.totalExceptions.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <i className="fas fa-percent text-purple-600 dark:text-purple-400 text-sm"></i>
                      </div>
                      <div>
                        <p className="text-xs text-purple-600 dark:text-purple-400">Tasso Successo</p>
                        <p className="text-xl font-bold text-purple-800 dark:text-purple-300">
                          {stats.summary.successRate}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Trend */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                      <i className="fas fa-chart-line mr-2 text-blue-600"></i>
                      Andamento Temporale
                    </h3>
                    {getTrendChartData() && (
                      <Line
                        data={getTrendChartData()!}
                        options={{
                          responsive: true,
                          plugins: { legend: { position: "top" as const } },
                          scales: { y: { beginAtZero: true } },
                        }}
                      />
                    )}
                  </div>

                  {/* Department */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                      <i className="fas fa-building mr-2 text-purple-600"></i>
                      Analisi per Reparto (Top 10)
                    </h3>
                    {getDepartmentChartData() && (
                      <Bar
                        data={getDepartmentChartData()!}
                        options={{
                          responsive: true,
                          plugins: { legend: { position: "top" as const } },
                          scales: {
                            y: { beginAtZero: true, stacked: true },
                            x: { stacked: true },
                          },
                        }}
                      />
                    )}
                  </div>

                  {/* Defect types pie */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                      <i className="fas fa-chart-pie mr-2 text-red-600"></i>
                      Tipologie Difetti (Top 10)
                    </h3>
                    {getDefectTypesChartData() && (
                      <Pie
                        data={getDefectTypesChartData()!}
                        options={{
                          responsive: true,
                          plugins: { legend: { position: "right" as const } },
                        }}
                      />
                    )}
                  </div>

                  {/* Operators table */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                      <i className="fas fa-users mr-2 text-green-600"></i>
                      Top Operatori
                    </h3>
                    <div className="overflow-auto max-h-80">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Operatore</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">Totale</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">OK</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">% Succ.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {Object.entries(stats.byOperator)
                            .sort((a, b) => b[1].total - a[1].total)
                            .slice(0, 15)
                            .map(([op, data]) => {
                              const successRate = data.total > 0
                                ? ((data.ok / data.total) * 100).toFixed(1)
                                : "0";
                              return (
                                <tr key={op} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{op}</td>
                                  <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">{data.total}</td>
                                  <td className="px-3 py-2 text-center text-green-600 dark:text-green-400 font-medium">{data.ok}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      parseFloat(successRate) >= 90
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                        : parseFloat(successRate) >= 75
                                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                    }`}>
                                      {successRate}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
