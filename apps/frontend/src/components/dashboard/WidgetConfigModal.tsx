"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboardStore } from "@/store/dashboard";
import { useAuthStore } from "@/store/auth";
import { useModulesStore } from "@/store/modules";

interface WidgetInfo {
  id: string;
  name: string;
  desc: string;
  icon: string;
  gradient: string;
  permission?: string;
  module?: string;
  category: string;
  size: string; // es. "1×1", "2×2"
}

const availableWidgets: WidgetInfo[] = [
  // Operativi
  { id: 'riparazioni', name: 'Riparazioni', desc: 'Riparazioni aperte e assegnate a te', icon: 'tools', gradient: 'from-blue-500 to-blue-700', permission: 'riparazioni', module: 'riparazioni', category: 'Operativi', size: '1×1' },
  { id: 'produzione', name: 'Produzione', desc: 'Paia prodotte oggi per fase', icon: 'industry', gradient: 'from-yellow-500 to-orange-500', permission: 'produzione', module: 'produzione', category: 'Operativi', size: '1×1' },
  { id: 'quality', name: 'Quality Control', desc: 'Controlli qualità del giorno', icon: 'check-circle', gradient: 'from-emerald-500 to-green-600', permission: 'quality', module: 'qualita', category: 'Operativi', size: '1×1' },
  { id: 'export-stats', name: 'Statistiche Export', desc: 'DDT e spedizioni oggi/settimana/mese', icon: 'file-export', gradient: 'from-purple-500 to-violet-600', permission: 'export', module: 'export', category: 'Operativi', size: '1×1' },
  { id: 'tracking', name: 'Tracking', desc: 'Accesso rapido al modulo tracking', icon: 'route', gradient: 'from-pink-500 to-rose-500', category: 'Operativi', size: '1×1' },
  { id: 'scm', name: 'SCM', desc: 'Lanci attivi e ordini in corso', icon: 'rocket', gradient: 'from-orange-500 to-amber-500', permission: 'scm_admin', module: 'scm', category: 'Operativi', size: '1×1' },
  // Utilità
  { id: 'quick-actions', name: 'Azioni Rapide', desc: 'Scorciatoie ai moduli più usati', icon: 'bolt', gradient: 'from-indigo-500 to-blue-600', category: 'Utilità', size: '2×2' },
  { id: 'activities', name: 'Attività Recenti', desc: 'Log delle ultime operazioni eseguite', icon: 'history', gradient: 'from-slate-500 to-gray-600', category: 'Utilità', size: '2×2' },
  // Grafici produzione
  { id: 'produzione-trend', name: 'Trend Produzione', desc: 'Grafico lineare paia per fase negli ultimi 7/14/30 giorni', icon: 'chart-line', gradient: 'from-yellow-400 to-yellow-600', permission: 'produzione', module: 'produzione', category: 'Grafici', size: '2×2' },
  { id: 'produzione-reparti', name: 'Reparti Produzione', desc: 'Istogramma top reparti con tabella', icon: 'chart-bar', gradient: 'from-orange-400 to-red-500', permission: 'produzione', module: 'produzione', category: 'Grafici', size: '2×2' },
  // Sistema
  { id: 'system-health', name: 'Stato Sistema', desc: 'DB · Redis · MinIO — stato e latenza servizi', icon: 'heartbeat', gradient: 'from-emerald-500 to-teal-600', permission: 'settings', category: 'Sistema', size: '2×1' },
  { id: 'system-jobs', name: 'Coda Lavori', desc: 'Contatori job in coda / attivi / completati / falliti', icon: 'tasks', gradient: 'from-blue-500 to-cyan-500', permission: 'settings', category: 'Sistema', size: '2×2' },
  { id: 'system-log', name: 'Log Attività', desc: 'Statistiche azioni per modulo e tipo', icon: 'shield-alt', gradient: 'from-indigo-500 to-purple-600', permission: 'settings', category: 'Sistema', size: '2×2' },
];

const categoryOrder = ['Operativi', 'Utilità', 'Grafici', 'Sistema'];

const categoryMeta: Record<string, { icon: string; color: string }> = {
  Operativi: { icon: 'fa-layer-group', color: 'text-blue-500' },
  Utilità:   { icon: 'fa-toolbox',     color: 'text-indigo-500' },
  Grafici:   { icon: 'fa-chart-pie',   color: 'text-yellow-500' },
  Sistema:   { icon: 'fa-server',      color: 'text-emerald-500' },
};

export default function WidgetConfigModal() {
  const { showConfigModal, setShowConfigModal, widgets, toggleWidget, resetLayout, saveWidgets } = useDashboardStore();
  const { hasPermission, sidebarCollapsed } = useAuthStore();
  const { isModuleActive } = useModulesStore();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const sidebarW = sidebarCollapsed ? 72 : 260;

  const isWidgetAvailable = (w: WidgetInfo) => {
    if (w.permission && !hasPermission(w.permission)) return false;
    if (w.module && !isModuleActive(w.module)) return false;
    return true;
  };

  const handleReset = () => {
    if (confirm('Ripristinare il layout predefinito?')) resetLayout();
  };

  const handleSave = async () => {
    setSaving(true);
    await saveWidgets();
    setSaving(false);
    setShowConfigModal(false);
  };

  const enabledCount = availableWidgets.filter(w => isWidgetAvailable(w) && (widgets[w.id]?.enabled ?? true)).length;

  if (!mounted) return null;

  const grouped = categoryOrder.map(cat => ({
    cat,
    items: availableWidgets.filter(w => w.category === cat),
  }));

  const panel = (
    <AnimatePresence>
      {showConfigModal && (
        <>
          {/* Backdrop — copre solo il main (a destra della sidebar) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ left: sidebarW }}
            className="fixed inset-y-0 right-0 bg-black/40 backdrop-blur-[2px] z-[9998]"
            onClick={() => setShowConfigModal(false)}
          />

          {/* Pannello off-canvas — scende dall'alto, prende tutto il main */}
          <motion.div
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 260 }}
            style={{ left: sidebarW }}
            className="fixed inset-y-0 right-0 z-[9999] flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
                    <i className="fas fa-th-large text-white text-lg"></i>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Configura Dashboard
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {enabledCount} widget attivi — attiva o disattiva quelli che vuoi vedere
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <i className="fas fa-undo text-xs"></i>
                    Ripristina default
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                  >
                    {saving
                      ? <><i className="fas fa-circle-notch fa-spin"></i> Salvataggio…</>
                      : <><i className="fas fa-check"></i> Salva</>
                    }
                  </button>
                  <button
                    onClick={() => setShowConfigModal(false)}
                    className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <i className="fas fa-times text-lg"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
              {grouped.map(({ cat, items }) => {
                // Filtra: mostra la categoria solo se almeno un widget è accessibile
                const visible = items.filter(w => isWidgetAvailable(w));
                if (visible.length === 0) return null;

                const meta = categoryMeta[cat];
                return (
                  <section key={cat}>
                    {/* Intestazione categoria */}
                    <div className="flex items-center gap-3 mb-4">
                      <i className={`fas ${meta.icon} ${meta.color} text-sm`}></i>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        {cat}
                      </h3>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {visible.filter(w => widgets[w.id]?.enabled ?? true).length}/{visible.length} attivi
                      </span>
                    </div>

                    {/* Griglia widget */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {items.map((widget) => {
                        const available = isWidgetAvailable(widget);
                        const enabled = widgets[widget.id]?.enabled ?? true;
                        const isOn = available && enabled;

                        return (
                          <motion.button
                            key={widget.id}
                            disabled={!available}
                            onClick={() => available && toggleWidget(widget.id)}
                            whileHover={available ? { scale: 1.02 } : {}}
                            whileTap={available ? { scale: 0.97 } : {}}
                            className={`
                              relative text-left rounded-2xl border-2 p-4 transition-all duration-200 cursor-pointer
                              ${isOn
                                ? 'border-blue-400 dark:border-blue-500 bg-white dark:bg-gray-800 shadow-md shadow-blue-500/10'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60'
                              }
                              ${!available ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-md'}
                            `}
                          >
                            {/* Dot stato */}
                            <div className={`absolute top-3 right-3 h-2 w-2 rounded-full ${isOn ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />

                            {/* Icona */}
                            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${widget.gradient} shadow-md`}>
                              <i className={`fas fa-${widget.icon} text-white text-sm`}></i>
                            </div>

                            {/* Nome */}
                            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                              {widget.name}
                            </p>

                            {/* Descrizione */}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">
                              {!available ? 'Non disponibile' : widget.desc}
                            </p>

                            {/* Badge size */}
                            <div className="mt-3 flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                <i className="fas fa-expand-alt text-[9px]"></i>
                                {widget.size}
                              </span>
                              {/* Toggle visivo */}
                              {available && (
                                <div className={`relative h-5 w-9 rounded-full transition-colors ${isOn ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isOn ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </div>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            {/* ── Footer info ── */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-8 py-3">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                <i className="fas fa-info-circle mr-1"></i>
                Dopo aver salvato, usa la modalità modifica (
                <i className="fas fa-edit mx-1"></i>) per riorganizzare i widget tramite drag &amp; drop.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(panel, document.body);
}
