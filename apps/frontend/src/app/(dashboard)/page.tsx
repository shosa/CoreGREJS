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
  ExportWidget,
  TrackingWidget,
  SCMWidget,
  SpoolWidget,
  QuickActionsWidget,
  ActivitiesWidget,
} from "@/components/dashboard/DashboardWidgets";

import "react-grid-layout/css/styles.css";
import "react-grid-layout/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardStats {
  riparazioniAperte: number;
  riparazioniMie: number;
  qualityRecordsToday: number;
  ddtBozze: number;
  scmLanciAttivi: number;
  produzioneOggi: number;
  produzioneOggiFasi: Record<string, number>;
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
  const { widgets, isEditMode, setEditMode, setShowConfigModal, updateLayout } = useDashboardStore();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);

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

  const fetchJobs = async () => {
    try {
      const jobsData = await jobsApi.list('completed');
      setJobs(jobsData.slice(0, 5));
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
    fetchData();
    fetchActivities();
    fetchJobs();

    const interval = setInterval(
      () => {
        fetchModules();
        fetchData();
        fetchActivities();
        fetchJobs();
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
              Dashboard CoreGRE
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
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowConfigModal(true)}
                  className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all"
                >
                  <i className="fas fa-cog mr-2"></i>
                  Configura Widget
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setEditMode(!isEditMode)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium shadow-md hover:shadow-lg transition-all ${
                    isEditMode
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <i className={`fas fa-${isEditMode ? 'save' : 'edit'} mr-2`}></i>
                  {isEditMode ? 'Salva Layout' : 'Modifica Layout'}
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
        rowHeight={200}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
      >
        {/* Riparazioni */}
        {isWidgetVisible('riparazioni', 'riparazioni', 'riparazioni') && (
          <div key="riparazioni" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <RiparazioniWidget stats={stats} />
          </div>
        )}

        {/* Produzione */}
        {isWidgetVisible('produzione', 'produzione', 'produzione') && (
          <div key="produzione" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <ProduzioneWidget stats={stats} />
          </div>
        )}

        {/* Quality */}
        {isWidgetVisible('quality', 'quality', 'quality') && (
          <div key="quality" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <QualityWidget stats={stats} />
          </div>
        )}

        {/* Export */}
        {isWidgetVisible('export', 'export', 'export') && (
          <div key="export" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <ExportWidget stats={stats} />
          </div>
        )}

        {/* Tracking */}
        {isWidgetVisible('tracking') && (
          <div key="tracking" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <TrackingWidget />
          </div>
        )}

        {/* SCM */}
        {isWidgetVisible('scm', 'scm_admin', 'scm') && (
          <div key="scm" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <SCMWidget stats={stats} />
          </div>
        )}

        {/* Spool */}
        {isWidgetVisible('spool') && (
          <div key="spool" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <SpoolWidget jobs={jobs} jobsLoading={jobsLoading} />
          </div>
        )}

        {/* Quick Actions */}
        {isWidgetVisible('quick-actions') && (
          <div key="quick-actions" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <QuickActionsWidget hasPermission={hasPermission} isModuleActive={isModuleActive} />
          </div>
        )}

        {/* Activities */}
        {isWidgetVisible('activities') && (
          <div key="activities" className={isEditMode ? 'drag-handle cursor-move' : ''}>
            <ActivitiesWidget activities={activities} activitiesLoading={activitiesLoading} hasPermission={hasPermission} />
          </div>
        )}
      </ResponsiveGridLayout>
    </div>
  );
}
