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
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Register ChartJS components
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

      // Load last 30 days by default
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);

      setFilters({
        ...filters,
        dataInizio: start.toISOString().split('T')[0],
        dataFine: end.toISOString().split('T')[0],
      });

      await loadStatistics({
        dataInizio: start.toISOString().split('T')[0],
        dataFine: end.toISOString().split('T')[0],
      });
    } catch (error) {
      showError("Errore nel caricamento dei dati iniziali");
    }
  };

  const loadStatistics = async (customFilters?: any) => {
    try {
      setLoading(true);
      const data = await qualityApi.getReportStatistics(customFilters || filters);
      setStats(data);
    } catch (error) {
      showError("Errore nel caricamento delle statistiche");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    loadStatistics();
  };

  const handleResetFilters = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const newFilters = {
      dataInizio: start.toISOString().split('T')[0],
      dataFine: end.toISOString().split('T')[0],
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
    } catch (error) {
      showError("Errore nella generazione del report");
    } finally {
      setGenerating(false);
    }
  };

  // Prepare chart data
  const getDepartmentChartData = () => {
    if (!stats) return null;

    const depts = Object.entries(stats.byDepartment)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    return {
      labels: depts.map(([name]) => name),
      datasets: [
        {
          label: 'OK',
          data: depts.map(([, data]) => data.ok),
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
        },
        {
          label: 'Con Eccezioni',
          data: depts.map(([, data]) => data.exceptions),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
        },
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
          label: 'Occorrenze',
          data: types.map(([, count]) => count),
          backgroundColor: [
            'rgba(239, 68, 68, 0.7)',
            'rgba(249, 115, 22, 0.7)',
            'rgba(234, 179, 8, 0.7)',
            'rgba(34, 197, 94, 0.7)',
            'rgba(59, 130, 246, 0.7)',
            'rgba(147, 51, 234, 0.7)',
            'rgba(236, 72, 153, 0.7)',
            'rgba(156, 163, 175, 0.7)',
            'rgba(20, 184, 166, 0.7)',
            'rgba(251, 146, 60, 0.7)',
          ],
        },
      ],
    };
  };

  const getTrendChartData = () => {
    if (!stats) return null;

    const dates = Object.entries(stats.byDate)
      .sort((a, b) => a[0].localeCompare(b[0]));

    return {
      labels: dates.map(([date]) => new Date(date).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Totale Controlli',
          data: dates.map(([, data]) => data.total),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Con Eccezioni',
          data: dates.map(([, data]) => data.exceptions),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
        },
      ],
    };
  };

  if (loading && !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-solid border-primary border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Filtri Analisi
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Data Inizio
            </label>
            <input
              type="date"
              value={filters.dataInizio}
              onChange={(e) => setFilters({ ...filters, dataInizio: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Data Fine
            </label>
            <input
              type="date"
              value={filters.dataFine}
              onChange={(e) => setFilters({ ...filters, dataFine: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Reparto
            </label>
            <select
              value={filters.reparto}
              onChange={(e) => setFilters({ ...filters, reparto: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tutti</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Operatore
            </label>
            <select
              value={filters.operatore}
              onChange={(e) => setFilters({ ...filters, operatore: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tutti</option>
              {operators.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tipo CQ
            </label>
            <select
              value={filters.tipoCq}
              onChange={(e) => setFilters({ ...filters, tipoCq: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tutti</option>
              <option value="INTERNO">INTERNO</option>
              <option value="GRIFFE">GRIFFE</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleApplyFilters}
            disabled={loading}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <i className="fas fa-filter mr-2"></i>
            Applica Filtri
          </button>
          <button
            onClick={handleResetFilters}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <i className="fas fa-redo mr-2"></i>
            Reset
          </button>
          <button
            onClick={handleGeneratePdf}
            disabled={generating || !stats}
            className="ml-auto rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <i className="fas fa-file-pdf mr-2"></i>
            {generating ? 'Generazione...' : 'Genera PDF'}
          </button>
        </div>
      </div>

      {stats && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <i className="fas fa-clipboard-check text-blue-600 dark:text-blue-400"></i>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Totale Controlli</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.summary.totalRecords.toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm dark:border-green-800 dark:bg-green-900/20"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <i className="fas fa-check-circle text-green-600 dark:text-green-400"></i>
                </div>
                <div>
                  <p className="text-xs text-green-700 dark:text-green-400">Controlli OK</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                    {stats.summary.recordsOk.toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-800 dark:bg-red-900/20"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400"></i>
                </div>
                <div>
                  <p className="text-xs text-red-700 dark:text-red-400">Con Eccezioni</p>
                  <p className="text-2xl font-bold text-red-800 dark:text-red-300">
                    {stats.summary.recordsWithExceptions.toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-orange-200 bg-orange-50 p-6 shadow-sm dark:border-orange-800 dark:bg-orange-900/20"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <i className="fas fa-bug text-orange-600 dark:text-orange-400"></i>
                </div>
                <div>
                  <p className="text-xs text-orange-700 dark:text-orange-400">Tot. Eccezioni</p>
                  <p className="text-2xl font-bold text-orange-800 dark:text-orange-300">
                    {stats.summary.totalExceptions.toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-xl border border-purple-200 bg-purple-50 p-6 shadow-sm dark:border-purple-800 dark:bg-purple-900/20"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <i className="fas fa-percent text-purple-600 dark:text-purple-400"></i>
                </div>
                <div>
                  <p className="text-xs text-purple-700 dark:text-purple-400">Tasso Successo</p>
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                    {stats.summary.successRate}%
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trend over time */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-chart-line mr-2 text-blue-600"></i>
                Andamento Temporale
              </h3>
              {getTrendChartData() && (
                <Line
                  data={getTrendChartData()!}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              )}
            </motion.div>

            {/* Department analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-building mr-2 text-purple-600"></i>
                Analisi per Reparto (Top 10)
              </h3>
              {getDepartmentChartData() && (
                <Bar
                  data={getDepartmentChartData()!}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        stacked: true,
                      },
                      x: {
                        stacked: true,
                      },
                    },
                  }}
                />
              )}
            </motion.div>

            {/* Defect types */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-chart-pie mr-2 text-red-600"></i>
                Tipologie Difetti (Top 10)
              </h3>
              {getDefectTypesChartData() && (
                <Pie
                  data={getDefectTypesChartData()!}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'right' as const,
                      },
                    },
                  }}
                />
              )}
            </motion.div>

            {/* Operators table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-users mr-2 text-green-600"></i>
                Top Operatori
              </h3>
              <div className="overflow-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                        Operatore
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                        Totale
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                        OK
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                        % Successo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {Object.entries(stats.byOperator)
                      .sort((a, b) => b[1].total - a[1].total)
                      .slice(0, 15)
                      .map(([op, data]) => {
                        const successRate = data.total > 0 ? ((data.ok / data.total) * 100).toFixed(1) : '0';
                        return (
                          <tr key={op} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                              {op}
                            </td>
                            <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">
                              {data.total}
                            </td>
                            <td className="px-4 py-2 text-center text-green-600 dark:text-green-400 font-medium">
                              {data.ok}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                parseFloat(successRate) >= 90
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : parseFloat(successRate) >= 75
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
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
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
