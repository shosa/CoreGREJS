'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { produzioneApi } from '@/lib/api';
import { showError } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Color mapping for phases
const PHASE_COLORS: Record<string, { border: string; bg: string; text: string; icon: string; barColor: string }> = {
  blue: {
    border: 'border-blue-200 dark:border-blue-800',
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'bg-blue-500',
    barColor: 'bg-blue-500',
  },
  green: {
    border: 'border-green-200 dark:border-green-800',
    bg: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
    text: 'text-green-700 dark:text-green-300',
    icon: 'bg-green-500',
    barColor: 'bg-green-500',
  },
  purple: {
    border: 'border-purple-200 dark:border-purple-800',
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
    text: 'text-purple-700 dark:text-purple-300',
    icon: 'bg-purple-500',
    barColor: 'bg-purple-500',
  },
  orange: {
    border: 'border-orange-200 dark:border-orange-800',
    bg: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20',
    text: 'text-orange-700 dark:text-orange-300',
    icon: 'bg-orange-500',
    barColor: 'bg-orange-500',
  },
  red: {
    border: 'border-red-200 dark:border-red-800',
    bg: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
    text: 'text-red-700 dark:text-red-300',
    icon: 'bg-red-500',
    barColor: 'bg-red-500',
  },
};

export default function ProduzioneStatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [phases, setPhases] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState<any>(null);
  const [weekStats, setWeekStats] = useState<any>(null);
  const [monthStats, setMonthStats] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [machinePerformance, setMachinePerformance] = useState<any>(null);
  const [trendDays, setTrendDays] = useState(30);

  useEffect(() => {
    fetchAllStats();
  }, []);

  useEffect(() => {
    fetchTrendData();
  }, [trendDays]);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      const [phasesData, today, week, month, comp, machine] = await Promise.all([
        produzioneApi.getPhases(),
        produzioneApi.getToday(),
        produzioneApi.getWeek(),
        produzioneApi.getMonth(),
        produzioneApi.getComparison(),
        produzioneApi.getMachinePerformance(),
      ]);

      setPhases(phasesData);
      setTodayStats(today);
      setWeekStats(week);
      setMonthStats(month);
      setComparison(comp);
      setMachinePerformance(machine);
    } catch (error) {
      showError('Errore nel caricamento delle statistiche');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    try {
      const data = await produzioneApi.getTrend(trendDays);
      setTrendData(data);
    } catch (error) {
      console.error('Error fetching trend data:', error);
    }
  };

  // Calculate max value for chart scaling
  const maxTrendValue = Math.max(...trendData.map((d) => d.totale), 1);

  // Helper to format phase breakdown
  const formatPhaseBreakdown = (byPhase: Record<string, number> | undefined) => {
    if (!byPhase) return '';
    return Object.entries(byPhase)
      .map(([name, value]) => `${name.substring(0, 1)}: ${value}`)
      .join(' | ');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-yellow-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      {/* Header */}
      <PageHeader
        title="Statistiche Produzione"
        subtitle="Analisi e report della produzione"
        actions={
          <>
            <motion.button
              onClick={fetchAllStats}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:bg-gray-800 dark:text-blue-300"
            >
              <i className="fas fa-sync-alt mr-2"></i>
              Aggiorna
            </motion.button>
            <Link href="/produzione">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Calendario
              </motion.button>
            </Link>
          </>
        }
      />

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Produzione', href: '/produzione' },
          { label: 'Statistiche' },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Today */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-6 shadow-lg dark:border-orange-800 dark:from-orange-900/20 dark:to-orange-800/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Oggi</p>
              <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{todayStats?.total || 0}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white">
              <i className="fas fa-calendar-day text-lg"></i>
            </div>
          </div>
          <div className="mt-4 text-xs text-orange-600 dark:text-orange-400">
            {formatPhaseBreakdown(todayStats?.byPhase)}
          </div>
        </motion.div>

        {/* Week */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-lg dark:border-blue-800 dark:from-blue-900/20 dark:to-blue-800/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Settimana</p>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{weekStats?.total || 0}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white">
              <i className="fas fa-calendar-week text-lg"></i>
            </div>
          </div>
          <div className="mt-4 text-xs text-blue-600 dark:text-blue-400">
            {formatPhaseBreakdown(weekStats?.byPhase)}
          </div>
        </motion.div>

        {/* Month */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-6 shadow-lg dark:border-green-800 dark:from-green-900/20 dark:to-green-800/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Mese</p>
              <p className="text-3xl font-bold text-green-700 dark:text-green-300">{monthStats?.total || 0}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-white">
              <i className="fas fa-calendar-alt text-lg"></i>
            </div>
          </div>
          <div className="mt-4 text-xs text-green-600 dark:text-green-400">
            Media giornaliera: {monthStats?.average || 0}
          </div>
        </motion.div>

        {/* Comparison */}
        <motion.div
          variants={itemVariants}
          className={`rounded-2xl border p-6 shadow-lg ${
            (comparison?.percentChange || 0) >= 0
              ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:border-emerald-800 dark:from-emerald-900/20 dark:to-emerald-800/20'
              : 'border-red-200 bg-gradient-to-br from-red-50 to-red-100 dark:border-red-800 dark:from-red-900/20 dark:to-red-800/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                (comparison?.percentChange || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
                vs Mese Prec.
              </p>
              <p className={`text-3xl font-bold ${
                (comparison?.percentChange || 0) >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
              }`}>
                {(comparison?.percentChange || 0) >= 0 ? '+' : ''}{comparison?.percentChange || 0}%
              </p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${
              (comparison?.percentChange || 0) >= 0 ? 'bg-emerald-500' : 'bg-red-500'
            }`}>
              <i className={`fas ${(comparison?.percentChange || 0) >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} text-lg`}></i>
            </div>
          </div>
          <div className={`mt-4 text-xs ${
            (comparison?.percentChange || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}>
            Prec: {comparison?.previous?.total || 0} | Att: {comparison?.current?.total || 0}
          </div>
        </motion.div>
      </div>

      {/* Trend Chart */}
      <motion.div
        variants={itemVariants}
        className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <i className="fas fa-chart-line mr-3 text-purple-500"></i>
            Andamento Produzione
          </h3>
          <div className="flex space-x-2">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setTrendDays(days)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  trendDays === days
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {days}g
              </button>
            ))}
          </div>
        </div>

        {/* Simple bar chart */}
        <div className="h-64 flex items-end space-x-1">
          {trendData.map((day, index) => {
            const barHeight = maxTrendValue > 0 ? (day.totale / maxTrendValue) * 100 : 0;
            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center justify-end group h-full"
              >
                <div className="relative w-full h-full flex items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${barHeight}%` }}
                    transition={{ duration: 0.5, delay: index * 0.02 }}
                    className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-sm hover:from-purple-600 hover:to-purple-500 cursor-pointer"
                    style={{ minHeight: day.totale > 0 ? '4px' : '0px' }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {new Date(day.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      <br />
                      Totale: {day.totale}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Machine Performance - Dynamic by Phase */}
      <div className={`grid grid-cols-1 lg:grid-cols-${Math.min(Object.keys(machinePerformance || {}).length, 3)} gap-6`}>
        {machinePerformance && Object.entries(machinePerformance).map(([phaseName, departments]: [string, any]) => {
          // Find phase info from phases array
          const phase = phases.find(p => p.nome === phaseName);
          const colors = PHASE_COLORS[phase?.colore || 'blue'] || PHASE_COLORS.blue;
          const icon = phase?.icona || 'fa-cog';

          return (
            <motion.div
              key={phaseName}
              variants={itemVariants}
              className={`rounded-2xl border ${colors.border} bg-white p-6 shadow-lg dark:bg-gray-800`}
            >
              <h3 className={`text-lg font-semibold ${colors.text} flex items-center mb-4`}>
                <i className={`fas ${icon} mr-3`}></i>
                {phaseName}
              </h3>
              <div className="space-y-4">
                {Object.entries(departments).map(([deptName, value]: [string, any]) => {
                  const maxVal = Math.max(...Object.values(departments as Record<string, number>), 1);
                  return (
                    <div key={deptName}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{deptName}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{value}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(value / maxVal) * 100}%` }}
                          transition={{ duration: 0.5 }}
                          className={`h-full ${colors.barColor} rounded-full`}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(departments).length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Nessun dato disponibile
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}

        {(!machinePerformance || Object.keys(machinePerformance).length === 0) && (
          <motion.div
            variants={itemVariants}
            className="col-span-full rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-center text-gray-500 dark:text-gray-400">
              <i className="fas fa-info-circle mr-2"></i>
              Nessun dato di performance disponibile per il periodo selezionato
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
