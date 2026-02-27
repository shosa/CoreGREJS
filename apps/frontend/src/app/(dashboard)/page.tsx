"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { useAuthStore } from "@/store/auth";
import { useModulesStore } from "@/store/modules";
import { useDashboardStore } from "@/store/dashboard";
import { dashboardApi, jobsApi } from "@/lib/api";
import WidgetConfigModal from "@/components/dashboard/WidgetConfigModal";
import {
  RiparazioniWidget,
  ProduzioneWidget,
  QualityWidget,
  TrackingWidget,
  SCMWidget,
  ExportStatsWidget,
  QuickActionsWidget,
  ActivitiesWidget,
  ProduzioneTrendWidget,
  ProduzioneRepartiWidget,
  SystemHealthWidget,
  SystemJobsWidget,
  SystemLogWidget,
} from "@/components/dashboard/DashboardWidgets";

import "react-grid-layout/css/styles.css";
import "react-grid-layout/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardStats {
  riparazioniAperte: number;
  riparazioniMie: number;
  qualityRecordsToday: number;
  qualityRecordsWithDefects?: number;
  qualityByDept?: Record<string, number>;
  ddtBozze: number;
  scmLanciAttivi: number;
  produzioneOggi: number;
  produzioneOggiFasi: Record<string, number>;
  exportOggi?: number;
  exportSettimana?: number;
  exportMese?: number;
}

interface Activity {
  id: number;
  action: string;
  description: string;
  icon: string;
  createdAt: string;
  user: { nome: string };
}

interface Job {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  output?: { name?: string };
}

export default function DashboardPage() {
  const { user, hasPermission } = useAuthStore();
  const { isModuleActive, fetchModules } = useModulesStore();
  const { widgets, isEditMode, isLoaded, setEditMode, setShowConfigModal, updateLayout, loadWidgets } = useDashboardStore();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // Widget produzione
  const [trendData, setTrendData] = useState<any>(null);
  const [trendPeriod, setTrendPeriod] = useState<7 | 14 | 30>(7);
  const [repartiData, setRepartiData] = useState<any>(null);
  const [repartiPeriod, setRepartiPeriod] = useState<7 | 30 | 90>(7);

  // Widget system-admin
  const [healthData, setHealthData] = useState<any>(null);
  const [jobsData, setJobsData] = useState<any>(null);
  const [logStats, setLogStats] = useState<any>(null);

  const fetchData = async () => {
    try {
      const statsData = await dashboardApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const activitiesData = await dashboardApi.getActivities();
      setActivities(activitiesData);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const fetchTrendData = async (period: number) => {
    try {
      const r = await fetch(`/api/widgets/produzione-trend?period=${period}`, {
        headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('coregre-auth') || '{}').state?.token ?? ''}` },
      });
      if (r.ok) setTrendData(await r.json());
    } catch {}
  };

  const fetchRepartiData = async (period: number) => {
    try {
      const r = await fetch(`/api/widgets/produzione-chart?period=${period}`, {
        headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('coregre-auth') || '{}').state?.token ?? ''}` },
      });
      if (r.ok) setRepartiData(await r.json());
    } catch {}
  };

  const getToken = () => JSON.parse(localStorage.getItem('coregre-auth') || '{}').state?.token ?? '';

  const fetchHealthData = async () => {
    try {
      const r = await fetch('/api/settings/health-check', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (r.ok) setHealthData(await r.json());
    } catch {}
  };

  const fetchJobsData = async () => {
    try {
      const r = await fetch('/api/settings/jobs', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (r.ok) setJobsData(await r.json());
    } catch {}
  };

  const fetchLogStats = async () => {
    try {
      const r = await fetch('/api/activity-log/stats', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (r.ok) setLogStats(await r.json());
    } catch {}
  };

  const fetchWidgets = async () => {
    try {
      const authStorage = localStorage.getItem('coregre-auth');
      const token = authStorage ? JSON.parse(authStorage).state?.token : null;

      const response = await fetch('/api/widgets/user', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (response.ok) {
        const widgetsData = await response.json();
        loadWidgets(widgetsData);
      }
    } catch (error) {
      console.error("Error fetching widgets:", error);
      loadWidgets([]); // Use defaults on error
    }
  };

  useEffect(() => { fetchTrendData(trendPeriod); }, [trendPeriod]);
  useEffect(() => { fetchRepartiData(repartiPeriod); }, [repartiPeriod]);

  useEffect(() => {
    fetchWidgets();
    fetchModules();
    fetchData();
    fetchActivities();
    fetchTrendData(trendPeriod);
    fetchRepartiData(repartiPeriod);
    fetchHealthData();
    fetchJobsData();
    fetchLogStats();

    const interval = setInterval(
      () => {
        fetchModules();
        fetchData();
        fetchActivities();
        fetchHealthData();
        fetchJobsData();
        fetchLogStats();
      },
      5 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, []);

  const currentDate = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const currentTime = new Date().toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleLayoutChange = (layout: Layout[]) => {
    if (isEditMode) {
      updateLayout(
        layout.map((l) => ({
          id: l.i,
          enabled: widgets[l.i]?.enabled ?? true,
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h,
        }))
      );
    }
  };

  const isWidgetVisible = (widgetId: string, permission?: string, module?: string) => {
    if (!widgets[widgetId]?.enabled) return false;
    if (permission && !hasPermission(permission)) return false;
    if (module && !isModuleActive(module)) return false;
    return true;
  };

  const getLayout = () => {
    return Object.values(widgets)
      .filter((w) => w.enabled)
      .map((w) => ({
        i: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: w.id.includes('quick-actions') || w.id.includes('activities') ? 2 : 1,
        minH: 1,
      }));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="mx-auto h-16 w-16 rounded-full border-4 border-solid border-blue-500 border-t-transparent mb-4"
          />
          <p className="text-gray-600 dark:text-gray-400">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <WidgetConfigModal />

      {/* Dashboard Header */}
      <div className="mb-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold dark:from-blue-400 dark:to-indigo-400">
              Dashboard
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              <i className="fas fa-user-circle mr-2"></i>
              Benvenuto, <span className="font-semibold text-gray-900 dark:text-white">{user?.nome}</span>
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="flex flex-col items-end space-y-3">
              <div className="text-right">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <i className="far fa-calendar-alt mr-2 text-blue-500"></i>
                  {currentDate}
                </span>
                <br />
                <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                  <i className="far fa-clock mr-2 text-blue-500"></i>
                  {currentTime}
                </span>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowConfigModal(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg transition-all"
                  title="Configura Widget"
                >
                  <i className="fas fa-cog"></i>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setEditMode(!isEditMode)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg shadow-md hover:shadow-lg transition-all ${
                    isEditMode
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                  title={isEditMode ? 'Salva Layout' : 'Modifica Layout'}
                >
                  <i className={`fas fa-${isEditMode ? 'save' : 'edit'}`}></i>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEditMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 p-4"
        >
          <div className="flex items-center">
            <i className="fas fa-info-circle text-blue-600 dark:text-blue-400 text-xl mr-3"></i>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-300">Modalità Modifica Attiva</h4>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Trascina i widget per riorganizzarli. Ridimensiona trascinando dagli angoli. Clicca "Salva Layout" per salvare le modifiche.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: getLayout() }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 4, md: 3, sm: 2, xs: 1, xxs: 1 }}
        rowHeight={150}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        useCSSTransforms={false}
      >
        {/* Riparazioni */}
        {isWidgetVisible('riparazioni', 'riparazioni', 'riparazioni') && (
          <div key="riparazioni" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={isEditMode ? 'pointer-events-none' : ''}
            >
              <RiparazioniWidget stats={stats} />
            </motion.div>
          </div>
        )}

        {/* Produzione */}
        {isWidgetVisible('produzione', 'produzione', 'produzione') && (
          <div key="produzione" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className={isEditMode ? 'pointer-events-none' : ''}
            >
              <ProduzioneWidget stats={stats} />
            </motion.div>
          </div>
        )}

        {/* Quality */}
        {isWidgetVisible('quality', 'quality', 'qualita') && (
          <div key="quality" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className={isEditMode ? 'pointer-events-none' : ''}
            >
              <QualityWidget stats={stats} />
            </motion.div>
          </div>
        )}

        {/* Export Stats */}
        {isWidgetVisible('export-stats', 'export', 'export') && (
          <div key="export-stats" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className={isEditMode ? 'pointer-events-none' : ''}
            >
              <ExportStatsWidget stats={stats} />
            </motion.div>
          </div>
        )}

        {/* Tracking */}
        {isWidgetVisible('tracking') && (
          <div key="tracking" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className={isEditMode ? 'pointer-events-none' : ''}
            >
              <TrackingWidget />
            </motion.div>
          </div>
        )}

        {/* SCM */}
        {isWidgetVisible('scm', 'scm_admin', 'scm') && (
          <div key="scm" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className={isEditMode ? 'pointer-events-none' : ''}
            >
              <SCMWidget stats={stats} />
            </motion.div>
          </div>
        )}

        {/* Quick Actions */}
        {isWidgetVisible('quick-actions') && (
          <div key="quick-actions" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}
              className={isEditMode ? 'pointer-events-none' : ''}
            >
              <QuickActionsWidget hasPermission={hasPermission} isModuleActive={isModuleActive} />
            </motion.div>
          </div>
        )}

        {/* Activities */}
        {isWidgetVisible('activities') && (
          <div key="activities" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.7 }}
              className={isEditMode ? 'pointer-events-none' : ''}
            >
              <ActivitiesWidget activities={activities} activitiesLoading={activitiesLoading} hasPermission={hasPermission} />
            </motion.div>
          </div>
        )}

        {/* Trend Produzione */}
        {isWidgetVisible('produzione-trend', 'produzione', 'produzione') && (
          <div key="produzione-trend" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.8 }}
              className={isEditMode ? 'pointer-events-none' : ''}
            >
              <ProduzioneTrendWidget trendData={trendData} period={trendPeriod} setPeriod={setTrendPeriod} />
            </motion.div>
          </div>
        )}

        {/* Reparti Produzione */}
        {isWidgetVisible('produzione-reparti', 'produzione', 'produzione') && (
          <div key="produzione-reparti" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.9 }}
              className={isEditMode ? 'pointer-events-none' : ''}
            >
              <ProduzioneRepartiWidget chartData={repartiData} period={repartiPeriod} setPeriod={setRepartiPeriod} />
            </motion.div>
          </div>
        )}

        {/* Stato Sistema */}
        {isWidgetVisible('system-health', 'system-admin') && (
          <div key="system-health" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 1.1 }}
              className={isEditMode ? 'pointer-events-none' : ''}
            >
              <SystemHealthWidget healthData={healthData} />
            </motion.div>
          </div>
        )}

        {/* Coda Lavori */}
        {isWidgetVisible('system-jobs', 'system-admin') && (
          <div key="system-jobs" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 1.2 }}
              className={isEditMode ? 'pointer-events-none' : ''}
            >
              <SystemJobsWidget jobsData={jobsData} />
            </motion.div>
          </div>
        )}

        {/* Log Attività */}
        {isWidgetVisible('system-log', 'system-admin') && (
          <div key="system-log" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 1.3 }}
              className={isEditMode ? 'pointer-events-none' : ''}
            >
              <SystemLogWidget logStats={logStats} />
            </motion.div>
          </div>
        )}
      </ResponsiveGridLayout>
    </div>
  );
}
