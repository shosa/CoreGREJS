"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useDashboardStore } from "@/store/dashboard";
import { useAuthStore } from "@/store/auth";
import { useModulesStore } from "@/store/modules";

interface WidgetInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  permission?: string;
  module?: string;
}

const availableWidgets: WidgetInfo[] = [
  { id: 'riparazioni', name: 'Riparazioni', icon: 'tools', color: 'blue', permission: 'riparazioni', module: 'riparazioni' },
  { id: 'produzione', name: 'Produzione', icon: 'industry', color: 'yellow', permission: 'produzione', module: 'produzione' },
  { id: 'quality', name: 'Quality Control', icon: 'check-circle', color: 'green', permission: 'qualita', module: 'qualita' },
  { id: 'export-stats', name: 'Statistiche Export', icon: 'file-export', color: 'purple', permission: 'export', module: 'export' },
  { id: 'tracking', name: 'Tracking', icon: 'route', color: 'pink' },
  { id: 'scm', name: 'SCM', icon: 'rocket', color: 'orange', permission: 'scm_admin', module: 'scm' },
  { id: 'quick-actions', name: 'Azioni Rapide', icon: 'bolt', color: 'indigo' },
  { id: 'activities', name: 'Attività Recenti', icon: 'history', color: 'gray' },
];

export default function WidgetConfigModal() {
  const { showConfigModal, setShowConfigModal, widgets, toggleWidget, resetLayout, saveWidgets } = useDashboardStore();
  const { hasPermission } = useAuthStore();
  const { isModuleActive } = useModulesStore();

  const isWidgetAvailable = (widget: WidgetInfo) => {
    // Check permissions
    if (widget.permission && !hasPermission(widget.permission)) {
      return false;
    }
    // Check module enabled
    if (widget.module && !isModuleActive(widget.module)) {
      return false;
    }
    return true;
  };

  const handleReset = () => {
    if (confirm('Sei sicuro di voler ripristinare il layout predefinito?')) {
      resetLayout();
    }
  };

  const handleSave = async () => {
    await saveWidgets();
    setShowConfigModal(false);
  };

  if (!showConfigModal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <i className="fas fa-cog mr-3"></i>
                  Configurazione Widget
                </h2>
                <p className="text-blue-100 mt-1 text-sm">
                  Personalizza la tua dashboard
                </p>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Seleziona i widget che vuoi visualizzare nella tua dashboard. Puoi anche riorganizzarli tramite drag & drop attivando la modalità modifica.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableWidgets.map((widget) => {
                const available = isWidgetAvailable(widget);
                const enabled = widgets[widget.id]?.enabled ?? true;

                return (
                  <motion.div
                    key={widget.id}
                    whileHover={available ? { scale: 1.02 } : {}}
                    className={`
                      relative rounded-xl border-2 p-4 transition-all duration-200
                      ${enabled && available
                        ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40'
                      }
                      ${!available ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`
                          flex h-10 w-10 items-center justify-center rounded-lg
                          bg-gradient-to-br from-${widget.color}-500 to-${widget.color}-600 shadow-md
                        `}>
                          <i className={`fas fa-${widget.icon} text-white`}></i>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {widget.name}
                          </h3>
                          {!available && (
                            <span className="text-xs text-red-500 dark:text-red-400">
                              Non disponibile
                            </span>
                          )}
                        </div>
                      </div>

                      {available && (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => toggleWidget(widget.id)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <i className="fas fa-undo mr-2"></i>
              Ripristina Default
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
            >
              <i className="fas fa-check mr-2"></i>
              Salva
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
